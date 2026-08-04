import React, { useState } from "react";
import {
  Grid,
  Paper,
  Button,
  TextField,
  InputAdornment,
  Chip,
  Box,
  CircularProgress,
} from "@mui/material";
import {
  UploadFile as UploadFileIcon,
  Search as SearchIcon,
  Link as LinkIcon,
} from "@mui/icons-material";

export default function Toolbar({
  fileInputRef,
  onFileUpload,
  searchTerm,
  onSearchChange,
  fileName,
  error,
  totalCount,
  onFetchUrl,
  urlLoading,
}) {
  const [urlInput, setUrlInput] = useState("");

  const handleFetchClick = () => {
    onFetchUrl(urlInput);
  };
  return (
    <Paper
      elevation={0}
      sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, border: "1px solid #e3e7eb" }}
    >
      <input
        type="file"
        accept=".yaml, .yml"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={onFileUpload}
      />

      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} sm={5}>
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
              bgcolor: "#2f6feb",
              "&:hover": { bgcolor: "#255bc4" },
            }}
          >
            Farklı YAML Yükle
          </Button>
        </Grid>

        <Grid item xs={12} sm={7}>
          <TextField
            fullWidth
            placeholder="Versiyon veya servis ara..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
        <Grid item xs={12} sm={9}>
          <TextField
            fullWidth
            size="small"
            placeholder="YAML dosyasının URL'i (örn: https://raw.githubusercontent.com/.../Chart.yaml)"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LinkIcon color="action" fontSize="small" />
                </InputAdornment>
              ),
              sx: { borderRadius: 2 },
            }}
          />
        </Grid>
        <Grid item xs={12} sm={3}>
          <Button
            variant="outlined"
            fullWidth
            disabled={urlLoading || !urlInput.trim()}
            onClick={handleFetchClick}
            sx={{ textTransform: "none", borderRadius: 2, py: 0.9, fontWeight: 600 }}
          >
            {urlLoading ? <CircularProgress size={20} /> : "URL'den Çek"}
          </Button>
        </Grid>
      </Grid>

      <Box sx={{ mt: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <Chip
          label={`Aktif Dosya: ${fileName}`}
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
      </Box>
    </Paper>
  );
}

