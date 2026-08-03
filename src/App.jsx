import React, { useRef, useEffect } from "react";
import { Box, Container, Typography, Stack, Alert } from "@mui/material";
import { useHakimVersions } from "./hooks/useHakimVersions";
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
  } = useHakimVersions();

useEffect(() => {
  const loadVersionFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Hem mentörün istediği 'dataUrl' hem de alternatif parametreleri yakalıyoruz
    const fileUrl = 
      urlParams.get("dataUrl") || 
      urlParams.get("target") || 
      urlParams.get("url") || 
      urlParams.get("v");

    // Değişken adının 'fileUrl' olduğundan ve if içinde doğru çağrıldığından emin oluyoruz
    if (fileUrl) {
      fetchFromUrl(fileUrl);
    }
  };

  // Sayfa yüklendiğinde çalıştır
  loadVersionFromUrl();

  // URL değişimlerini (Geri/İleri butonları veya pushState) dinle
  window.addEventListener("popstate", loadVersionFromUrl);

  return () => {
    window.removeEventListener("popstate", loadVersionFromUrl);
  };
}, []);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f4f6f8", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <img src={logo} alt="Logo" style={{ height: 120, objectFit: "contain" }} />
          <img src={bannerImage} alt="Banner" style={{ height: 120, objectFit: "contain" }} />
        </Box>

        <Stack spacing={0.5} sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} sx={{ color: "#1a2027" }}>
            Hakim Versions
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Hakim BE, FE, Infra ve dinamik servis sürüm detayları.
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