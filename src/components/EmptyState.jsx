import { Box, Paper, Typography, CircularProgress } from "@mui/material";

export function LoadingState() {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
      <CircularProgress />
    </Box>
  );
}

export function NoResultsState({ searchTerm }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 4,
        textAlign: "center",
        borderRadius: 3,
        border: "1px dashed",
        borderColor: "divider",
        color: "text.secondary",
      }}
    >
      <Typography variant="body1">
        {searchTerm
          ? `"${searchTerm}" kriterine uygun versiyon bulunamadı.`
          : "Gösterilecek versiyon verisi bulunamadı."}
      </Typography>
    </Paper>
  );
}

