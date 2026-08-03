import React from "react";
import { Grid, Paper, Avatar, Box, Typography, Chip } from "@mui/material";
import { getServiceIcon } from "../utils/serviceIcon";

export default function ServiceCard({ serviceKey, value }) {
  const displayValue = String(value);

  return (
    <Grid item xs={12} sm={4}>
      <Paper
        variant="outlined"
        sx={{ p: 1.5, borderRadius: 2, display: "flex", alignItems: "center", gap: 1.5 }}
      >
        <Avatar sx={{ width: 32, height: 32, bgcolor: "#eef2f7", color: "#2f6feb" }}>
          {getServiceIcon(serviceKey)}
        </Avatar>
        <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
          <Typography variant="body2" fontWeight={600} sx={{ textTransform: "uppercase" }} noWrap>
            {serviceKey}
          </Typography>
        </Box>
        <Chip
          label={displayValue.startsWith("v") ? displayValue : `v${displayValue}`}
          size="small"
          sx={{ fontWeight: 600, fontFamily: "monospace" }}
        />
      </Paper>
    </Grid>
  );
}
