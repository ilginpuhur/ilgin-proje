import { useEffect, useState } from "react";
import { Box, Container, Typography, Stack, Alert, IconButton, Tooltip, Button } from "@mui/material";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useIlginVersions } from "./hooks/useIlginVersions";
import { useThemeMode } from "./context/ThemeModeContext";
import ServiceFilter from "./components/ServiceFilter";
import VersionAccordion from "./components/VersionAccordion";
import { LoadingState, NoResultsState } from "./components/EmptyState";
import logo from "./assets/logo.png";
import bannerImage from "./assets/aselsan-logo.png";

// Filtre sonucu çok genişlediğinde (örn. arama kutusunu silince) yüzlerce
// kartı tek seferde DOM'a basmamak için sonuçları parça parça açıyoruz.
const PAGE_SIZE = 20;

export default function App() {
  const { mode, toggleMode } = useThemeMode();
  const {
    loading,
    error,
    notice,
    sortedVersions,
    filteredVersions,
    refresh,
    availableServices,
    availableGeneralVersions,
    selectedService,
    setSelectedService,
    selectedServiceVersion,
    setSelectedServiceVersion,
  } = useIlginVersions();

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Filtre kriteri değişince (servis ya da sürüm araması) baştan başla.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedService, selectedServiceVersion]);

  const visibleVersions = filteredVersions.slice(0, visibleCount);
  const hasMore = filteredVersions.length > visibleVersions.length;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", py: { xs: 3, md: 5 } }}>
      <Container maxWidth="lg">
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
              App Versions
            </Typography>
          </Stack>

          <Tooltip title={mode === "light" ? "Karanlık moda geç" : "Aydınlık moda geç"}>
            <IconButton onClick={toggleMode} color="inherit" aria-label="Tema değiştir">
              {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>
        </Stack>

        <ServiceFilter
          availableServices={availableServices}
          availableGeneralVersions={availableGeneralVersions}
          selectedService={selectedService}
          onServiceChange={setSelectedService}
          selectedServiceVersion={selectedServiceVersion}
          onVersionChange={setSelectedServiceVersion}
          totalCount={sortedVersions.length}
          onRefresh={refresh}
          loading={loading}
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
          <NoResultsState />
        ) : (
          <Stack spacing={1.5}>
            {visibleVersions.map((version) => (
              <VersionAccordion
                key={version.tag || version.chartVersion || version.name}
                version={version}
              />
            ))}
            {hasMore && (
              <Button
                variant="outlined"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                sx={{ alignSelf: "center", mt: 1 }}
              >
                Daha fazla göster ({filteredVersions.length - visibleVersions.length} kalan)
              </Button>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
