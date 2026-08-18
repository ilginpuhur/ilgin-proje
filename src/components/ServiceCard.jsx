import { Grid, Paper, Avatar, Box, Typography, Chip } from "@mui/material";
import { getServiceIcon } from "../utils/serviceIcon";

// "1.2.3" -> "v1.2.3", ama "belirtilmedi" gibi metinlere dokunmayız.
const formatVersion = (value) => {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return /^\d/.test(text) ? `v${text}` : text;
};

export default function ServiceCard({ name, version }) {
  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Paper
        variant="outlined"
        sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}
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
      </Paper>
    </Grid>
  );
}
