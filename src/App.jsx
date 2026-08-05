import React, { useRef, useEffect } from "react";
import { Box, Container, Typography, Stack, Alert } from "@mui/material";
import { useIlginVersions } from "./hooks/useIlginVersions";
import Toolbar from "./components/Toolbar";
import VersionAccordion from "./components/VersionAccordion";
import { LoadingState, NoResultsState } from "./components/EmptyState";
import logo from "./assets/logo.png";
import bannerImage from "./assets/image3fac66.jpg";

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
    urlLoading,
  } = useIlginVersions();

  useEffect(() => {
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
        const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases`);
        if (!res.ok) throw new Error("GitHub release listesi alınamadı.");
        const releases = await res.json();

        if (!releases || releases.length === 0) return;

        // Bütün release'leri dolaşıp dosyaları paralel indir
        const fetchPromises = releases.map(async (release) => {
          const tag = release.tag_name; // Örn: v2.0.0
          const versionNum = tag.replace("v", "");
          
          const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${tag}/ilgin-chart-${versionNum}.yaml`;

          try {
            const fileRes = await fetch(rawUrl);
            if (fileRes.ok) {
              return { text: await fileRes.text(), tag };
            }
          } catch {
            return null;
          }
          return null;
        });

        const results = await Promise.all(fetchPromises);
        const validResults = results.filter(Boolean);

        // Bulunan en güncel dosyanın Raw adresi ile yükleme yap (${OWNER} düzeltildi)
        if (validResults.length > 0) {
          const latestTag = validResults[0].tag;
          const versionNum = latestTag.replace("v", "");
          fetchFromUrl(`https://raw.githubusercontent.com/${OWNER}/${REPO}/${latestTag}/ilgin-chart-${versionNum}.yaml`);
        }
      } catch (err) {
        console.warn("GitHub Release yükleme uyarısı:", err.message);
      }
    };

    loadAllReleases();

    window.addEventListener("popstate", loadAllReleases);
    return () => {
      window.removeEventListener("popstate", loadAllReleases);
    };
  }, [fetchFromUrl]);

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
                key={`${version.name}-${idx}`}
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