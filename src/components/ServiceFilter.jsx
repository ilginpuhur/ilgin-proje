import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Autocomplete, TextField, Stack, IconButton, Tooltip, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";

const GENERAL_LABEL = "Genel Sürüm (Hakim)";
const ALL_VERSIONS_LABEL = "Tüm Sürümler";
const VERSION_INPUT_DEBOUNCE_MS = 200;

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
  const serviceOptions = useMemo(() => {
    const serviceNames = Object.keys(availableServices || {});
    return [
      { value: "", label: GENERAL_LABEL },
      ...serviceNames.map((name) => ({ value: name, label: name })),
    ];
  }, [availableServices]);

  const currentServiceOption =
    serviceOptions.find((o) => o.value === selectedService) || null;

  const versionOptions = useMemo(() => {
    const versionList = selectedService
      ? availableServices[selectedService] || []
      : availableGeneralVersions || [];
    return versionList.map((v) => ({ value: v, label: v }));
  }, [availableServices, availableGeneralVersions, selectedService]);

  const currentVersionOption =
    versionOptions.find((o) => o.value === selectedServiceVersion) || null;

  // Her tuşta üstteki (pahalı) filtreyi tetiklemek yerine, kutuda anlık yazmayı
  // yerelde tutup asıl state güncellemesini kısa bir süre erteliyoruz.
  const [localVersionInput, setLocalVersionInput] = useState(selectedServiceVersion);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalVersionInput(selectedServiceVersion);
  }, [selectedServiceVersion]);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const handleVersionInputChange = (newInputValue) => {
    setLocalVersionInput(newInputValue);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onVersionChange(newInputValue);
    }, VERSION_INPUT_DEBOUNCE_MS);
  };

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
            <TextField {...params} label="Hakim" placeholder={GENERAL_LABEL} />
          )}
        />

        <Autocomplete
          fullWidth
          size="small"
          options={versionOptions}
          value={currentVersionOption}
          inputValue={localVersionInput}
          onInputChange={(_, newInputValue, reason) => {
            if (reason === "input") handleVersionInputChange(newInputValue);
          }}
          getOptionLabel={(o) => o.label}
          isOptionEqualToValue={(o, v) => o.value === v.value}
          onChange={(_, newValue) => {
            const value = newValue ? newValue.value : "";
            clearTimeout(debounceRef.current);
            setLocalVersionInput(value);
            onVersionChange(value);
          }}
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
