import { Box, FormControl, InputLabel, Select, MenuItem, Stack, Chip } from "@mui/material";

export default function ServiceFilter({
  availableServices,
  selectedService,
  onServiceChange,
  selectedServiceVersion,
  onVersionChange,
}) {
  const serviceNames = Object.keys(availableServices || {});
  const availableVersionsForSelectedService = selectedService
    ? availableServices[selectedService] || []
    : [];

  const handleClear = () => {
    onServiceChange("");
    onVersionChange("");
  };

  if (serviceNames.length === 0) return null;

  return (
    <Box
      sx={(theme) => ({
        mb: 3,
        p: 2,
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: theme.custom.filterShadow,
      })}
    >
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
        <FormControl fullWidth size="small">
          <InputLabel>Servise Göre Filtrele</InputLabel>
          <Select
            value={selectedService}
            label="Servise Göre Filtrele"
            onChange={(e) => {
              onServiceChange(e.target.value);
              onVersionChange("");
            }}
          >
            <MenuItem value="">
              <em>Tüm Servisler</em>
            </MenuItem>
            {serviceNames.map((serviceName) => (
              <MenuItem key={serviceName} value={serviceName}>
                {serviceName}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl fullWidth size="small" disabled={!selectedService}>
          <InputLabel>Servis Sürümü</InputLabel>
          <Select
            value={selectedServiceVersion}
            label="Servis Sürümü"
            onChange={(e) => onVersionChange(e.target.value)}
          >
            <MenuItem value="">
              <em>Tüm Sürümler</em>
            </MenuItem>
            {availableVersionsForSelectedService.map((ver) => (
              <MenuItem key={ver} value={ver}>
                {ver}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {(selectedService || selectedServiceVersion) && (
          <Chip
            label="Temizle"
            onDelete={handleClear}
            color="primary"
            variant="outlined"
            sx={{ height: 40 }}
          />
        )}
      </Stack>
    </Box>
  );
}