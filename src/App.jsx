import { useRef } from "react";
import { Box, Container, Typography, Stack, Alert, IconButton, Tooltip } from "@mui/material";
import { DarkMode as DarkModeIcon, LightMode as LightModeIcon } from "@mui/icons-material";
import { useIlginVersions } from "./hooks/useIlginVersions";
import { useThemeMode } from "./context/ThemeModeContext";
import Toolbar from "./components/Toolbar";
import ServiceFilter from "./components/ServiceFilter";
import VersionAccordion from "./components/VersionAccordion";
import { LoadingState, NoResultsState } from "./components/EmptyState";
import logo from "./assets/logo.png";
import bannerImage from "./assets/aselsan-logo.png";

export default function App() {
  const fileInputRef = useRef(null);
  const { mode, toggleMode } = useThemeMode();
  const {
    loading,
    error,
    notice,
    fileName,
    searchTerm,
    setSearchTerm,
    sortedVersions,
    filteredVersions,
    handleFileUpload,
    refresh,
    clearStorage,
    availableServices,
    selectedService,
    setSelectedService,
    selectedServiceVersion,
    setSelectedServiceVersion,
  } = useIlginVersions();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="md">
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
          }}
        >
          <img src={logo} alt="Logo" style={{ height: 120, objectFit: "contain" }} />
          <img src={bannerImage} alt="Banner" style={{ height: 100, objectFit: "contain" }} />
        </Box>

        <Stack direction="row" spacing={0.5} sx={{ mb: 4 }} alignItems="flex-start" justifyContent="space-between">
          <Stack spacing={0.5}>
            <Typography variant="h4" fontWeight={700} sx={{ color: "text.primary" }}>
              Ilgin Versions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Ilgin BE, FE, Infra ve dinamik servis sürüm detayları.
            </Typography>
          </Stack>

          <Tooltip title={mode === "light" ? "Karanlık moda geç" : "Aydınlık moda geç"}>
            <IconButton onClick={toggleMode} color="inherit" aria-label="Tema değiştir">
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Stack>

        <Toolbar
          fileInputRef={fileInputRef}
          onFileUpload={handleFileUpload}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          fileName={fileName}
          error={error}
          totalCount={sortedVersions.length}
          onRefresh={refresh}
          onClear={clearStorage}
          loading={loading}
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

        {!error && notice && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            {notice}
          </Alert>
        )}

        {loading ? (
          <LoadingState />
        ) : filteredVersions.length === 0 ? (
          <NoResultsState searchTerm={searchTerm} />
        ) : (
          <Stack spacing={1.5}>
            {filteredVersions.map((version, idx) => (
              <VersionAccordion
                key={`${version.name}-${version.chartVersion}-${idx}`}
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
