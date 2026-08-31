import { Box, Autocomplete, TextField, Stack, IconButton, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const GENERAL_LABEL = "Genel Sürüm (Hakim)";
const ALL_VERSIONS_LABEL = "Tüm Sürümler";

export default function ServiceFilter({
  availableServices,
  availableGeneralVersions,
  selectedService,
  onServiceChange,
  selectedServiceVersion,
  onVersionChange,
  totalCount,
  onRefresh,
  loading,
}) {
  const serviceNames = Object.keys(availableServices || {});

  const serviceOptions = serviceNames.map((name) => ({ value: name, label: name }));
  const currentServiceOption =
    serviceOptions.find((o) => o.value === selectedService) || null;

  const versionList = selectedService
    ? availableServices[selectedService] || []
    : availableGeneralVersions || [];
  const versionOptions = versionList.map((v) => ({ value: v, label: v }));
  const currentVersionOption =
    versionOptions.find((o) => o.value === selectedServiceVersion) || null;

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
        <Autocomplete
          fullWidth
          size="small"
          options={serviceOptions}
          value={currentServiceOption}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          onChange={(_, newValue) => {
            onServiceChange(newValue ? newValue.value : "");
            onVersionChange("");
          }}
          renderInput={(params) => (
            <TextField {...params} label="Servis Ara" placeholder={GENERAL_LABEL} />
          )}
        />

        <Autocomplete
          fullWidth
          size="small"
          options={versionOptions}
          value={currentVersionOption}
          inputValue={selectedServiceVersion}
          onInputChange={(_, newInputValue, reason) => {
            if (reason === "input") onVersionChange(newInputValue);
          }}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          onChange={(_, newValue) => onVersionChange(newValue ? newValue.value : "")}
          renderInput={(params) => (
            <TextField {...params} label="Sürüm Ara" placeholder={ALL_VERSIONS_LABEL} />
          )}
        />

        <Tooltip title="Yenile">
          <span>
            <IconButton onClick={onRefresh} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        Toplam Versiyon: {totalCount}
      </Typography>
    </Box>
  );
}
