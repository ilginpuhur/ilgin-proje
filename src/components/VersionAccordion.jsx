import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Avatar,
  Box,
  Typography,
  Chip,
  Divider,
  Grid,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { extractSemVer } from "../utils/semver";
import ServiceCard from "./ServiceCard";

export default function VersionAccordion({ version, isLatest }) {
  const services = Object.entries(version).filter(
    ([key]) => key !== "name" && key !== "releaseDate"
  );
  const semVerParts = extractSemVer(version.name);

  return (
    <Accordion
      defaultExpanded={isLatest}
      disableGutters
      elevation={0}
      sx={{
        borderRadius: "12px !important",
        border: "1px solid #e3e7eb",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: 3, py: 0.5, "&:hover": { bgcolor: "#f8f9fb" } }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
          <Avatar
            sx={{
              bgcolor: isLatest ? "#2f6feb" : "#dbe2ea",
              color: isLatest ? "#fff" : "#5b6b7c",
              width: 40,
              height: 40,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {semVerParts[0]}.{semVerParts[1]}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700} sx={{ color: "#1a2027" }}>
              {version.name || "İsimsiz Versiyon"}
            </Typography>
            {version.releaseDate && (
              <Typography variant="caption" color="text.secondary">
                Yayın Tarihi: {String(version.releaseDate)}
              </Typography>
            )}
          </Box>
          {isLatest && <Chip label="En Güncel" size="small" color="primary" sx={{ fontWeight: 600 }} />}
        </Stack>
      </AccordionSummary>

      <Divider />

      <AccordionDetails sx={{ px: 3, py: 2.5, bgcolor: "#fbfcfd" }}>
        <Grid container spacing={1.5}>
          {services.map(([key, value]) => (
            <ServiceCard key={key} serviceKey={key} value={value} />
          ))}
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
}
