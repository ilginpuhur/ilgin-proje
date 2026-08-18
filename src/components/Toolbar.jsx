import { Grid, Paper, Button, TextField, InputAdornment, Chip, Box } from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";

export default function Toolbar({
  fileInputRef,
  onFileUpload,
  searchTerm,
  onSearchChange,
  fileName,
  error,
  totalCount,
  onRefresh,
  onClear,
  loading,
}) {
  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: "1px solid", borderColor: "divider" }}
    >
      <input
        type="file"
        accept=".yaml, .yml"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={onFileUpload}
      />

      <Grid container spacing={2} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, sm: 5 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              py: 1.1,
              fontWeight: 600,
              bgcolor: "primary.main",
              "&:hover": { bgcolor: "primary.dark" },
            }}
          >
            Farklı YAML Yükle
          </Button>
        </Grid>

        <Grid size={{ xs: 12, sm: 7 }}>
          <TextField
            fullWidth
            placeholder="Versiyon veya servis ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
                sx: { borderRadius: 2 },
              },
            }}
          />
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Chip
          label={`Aktif Dosya: ${fileName || "Yüklenmedi"}`}
          variant="outlined"
          size="small"
          color={error ? "error" : "success"}
        />
        <Chip
          label={`Toplam Versiyon: ${totalCount}`}
          variant="filled"
          size="small"
          color="primary"
        />

        <Box sx={{ flexGrow: 1 }} />

        <Button
          size="small"
          startIcon={<RefreshIcon />}
          onClick={onRefresh}
          disabled={loading}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Yenile
        </Button>
        <Button
          size="small"
          color="inherit"
          onClick={onClear}
          disabled={loading || totalCount === 0}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          Temizle
        </Button>
      </Box>
    </Paper>
  );
}
