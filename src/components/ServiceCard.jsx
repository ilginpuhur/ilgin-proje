import { memo, useState } from "react";
import { Grid, Paper, Avatar, Box, Typography, Chip, Tooltip, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import { getServiceIcon } from "../utils/serviceIcon";

// "1.2.3" -> "v1.2.3", ama "belirtilmedi" gibi metinlere dokunmayız.
const formatVersion = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return /^\d/.test(text) ? `v${text}` : text;
};

function ServiceCard({ name, version }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(version ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // panoya erişim reddedilirse sessizce yok say
    }
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          "&:hover .copy-version-btn": { opacity: 1 },
        }}
      >
        <Avatar sx={(theme) => ({ width: 32, height: 32, bgcolor: theme.custom.iconAvatarBg, color: "primary.main" })}>
          {getServiceIcon(name)}
        </Avatar>
        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
          <Typography variant="body2" fontWeight={600} sx={{ textTransform: "uppercase" }} noWrap>
            {name}
          </Typography>
        </Box>
        <Chip
          label={formatVersion(version)}
          size="small"
          sx={{ fontWeight: 600, fontFamily: "monospace" }}
        />
        <Tooltip title={copied ? "Kopyalandı" : "Sürümü kopyala"}>
          <IconButton
            className="copy-version-btn"
            size="small"
            onClick={handleCopy}
            sx={{
              opacity: 0,
              transition: "opacity 0.15s",
              "&:focus-visible": { opacity: 1 },
            }}
          >
            {copied ? <CheckIcon fontSize="inherit" color="success" /> : <ContentCopyIcon fontSize="inherit" />}
          </IconButton>
        </Tooltip>
      </Paper>
    </Grid>
  );
}

export default memo(ServiceCard);
