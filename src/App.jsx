import React, { useRef, useEffect } from "react";
import { Box, Container, Typography, Stack, Alert } from "@mui/material";
import { useIlginVersions } from "./hooks/useIlginVersions";
import Toolbar from "./components/Toolbar";
import VersionAccordion from "./components/VersionAccordion";
import { LoadingState, NoResultsState } from "./components/EmptyState";
import logo from "./assets/logo.png";
import bannerImage from "./assets/image3fac66.jpg";
import  ServiceFilter  from "./components/ServiceFilter";
export default function App() {
  const fileInputRef = useRef(null);
  const {
    loading,
    error,
    fileName,
    searchTerm,
    setSearchTerm,
    sortedVersions,
    filteredVersions,
    handleFileUpload,
    fetchFromUrl,
    loadMultipleYamlTexts,
    urlLoading,
    availableServices,
   selectedService,
   setSelectedService,
   selectedServiceVersion,
   setSelectedServiceVersion,
  } = useIlginVersions();

  useEffect(() => {
    let isMounted = true;

    const loadAllReleases = async () => {
      // 1. URL Parametresi Kontrolü (?dataUrl=...)
      const urlParams = new URLSearchParams(window.location.search);
      const fileUrl =
        urlParams.get("dataUrl") ||
        urlParams.get("target") ||
        urlParams.get("url") ||
        urlParams.get("v");

      if (fileUrl) {
        fetchFromUrl(fileUrl);
        return;
      }

      // 2. GitHub Releases Üzerinden Tag'leri Çekme
      const OWNER = "ilginpuhur";
      const REPO = "ilgin-charts";

      try {
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases?per_page=100`);
        if (!res.ok) throw new Error("GitHub release listesi alınamadı.");
        const releases = await res.json();

        if (!releases || releases.length === 0) return;

        // Bütün release'leri dolaşıp herhangi bir YAML dosyasını bul ve indir
        const fetchPromises = releases.map(async (release) => {
          const tag = release.tag_name;
          const versionNum = tag.replace(/^v/, "");

          // 1. AŞAMA: Release Assets içinde uzantısı .yaml / .yml olan İLK dosyayı bul
          const yamlAsset = release.assets?.find(
            (a) => a.name.endsWith(".yaml") || a.name.endsWith(".yml")
          );

          // İndirilecek muhtemel URL listesi (öncelik sırasına göre)
          const possibleUrls = [];

          if (yamlAsset) {
            possibleUrls.push(yamlAsset.browser_download_url);
          }

          // Fallback Raw URL alternatifleri (İsim ne olursa olsun yakalamak için)
          possibleUrls.push(
            `https://raw.githubusercontent.com/${OWNER}/${REPO}/${tag}/ilgin-chart-${versionNum}.yaml`,
            `https://raw.githubusercontent.com/${OWNER}/${REPO}/${tag}/Chart.yaml`,
            `https://raw.githubusercontent.com/${OWNER}/${REPO}/${tag}/chart.yaml`,
            `https://raw.githubusercontent.com/${OWNER}/${REPO}/${tag}/ilgin-chart.yaml`
          );

          // Muhtemel URL'leri sırayla dene, hangisi 200 OK dönerse onu al
          for (const url of possibleUrls) {
            try {
              const fileRes = await fetch(url);
              if (fileRes.ok) {
                const text = await fileRes.text();
                // YAML içeriğinde 'apiVersion' veya 'name' veya 'version' var mı kontrol et (yanlış HTML indirmemek için)
                if (text.includes("apiVersion") || text.includes("name:") || text.includes("dependencies:")) {
                  const fetchedFileName = url.split("/").pop();
                  return { text, tag, fileName: fetchedFileName };
                }
              }
            } catch {
              // Sonraki URL seçeneğine geç
            }
          }

          console.warn(`[YAML Bulunamadı] Tag: ${tag} için geçerli bir YAML dosyası indirilemedi.`);
          return null;
        });

        const results = await Promise.all(fetchPromises);
        const validResults = results.filter(Boolean);

        if (isMounted && validResults.length > 0 && loadMultipleYamlTexts) {
          loadMultipleYamlTexts(validResults);
        }
      } catch (err) {
        if (isMounted) console.warn("GitHub Release yükleme uyarısı:", err.message);
      }
    };

    loadAllReleases();

    window.addEventListener("popstate", loadAllReleases);
    return () => {
      isMounted = false;
      window.removeEventListener("popstate", loadAllReleases);
    };
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{ height: 120, objectFit: "contain" }}
          />
          <img
            src={bannerImage}
            alt="Banner"
            style={{ height: 120, objectFit: "contain" }}
          />
        </Box>

        <Stack spacing={0.5} sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: "#1a2027" }}>
            Ilgin Versions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Ilgin BE, FE, Infra ve dinamik servis sürüm detayları.
          </Typography>
        </Stack>

        <Toolbar
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          fileName={fileName}
          error={error}
          totalCount={sortedVersions.length}
          onFetchUrl={fetchFromUrl}
          urlLoading={urlLoading}
        />
        <ServiceFilter
     availableServices={availableServices}
     selectedService={selectedService}
     onServiceChange={setSelectedService}
     selectedServiceVersion={selectedServiceVersion}
     onVersionChange={setSelectedServiceVersion}
/>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {loading || urlLoading ? (
          <LoadingState />
        ) : filteredVersions.length === 0 ? (
          <NoResultsState searchTerm={searchTerm} />
        ) : (
          <Stack spacing={1.5}>
            {filteredVersions.map((version, idx) => (
              <VersionAccordion
                key={`${version.name}-${version.version}-${idx}`}
                version={version}
                isLatest={idx === 0}
              />
            ))}
          </Stack>
        )}
      </Container>
    </Box>
  );
}