import { memo } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Avatar,
  Box,
  Typography,
  Divider,
  Grid,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { extractSemVer } from "../utils/semver";
import ServiceCard from "./ServiceCard";

function VersionAccordion({ version }) {
  const services = version.services || [];
  const [major, minor] = extractSemVer(version.chartVersion || version.name);

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        borderRadius: "12px !important",
        border: "1px solid",
        borderColor: "divider",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{ px: 3, py: 0.5, "&:hover": { bgcolor: "action.hover" } }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
          <Avatar
            sx={(theme) => ({
              bgcolor: theme.custom.neutralAvatarBg,
              color: theme.custom.neutralAvatarText,
              width: 40,
              height: 40,
              fontSize: 13,
              fontWeight: 700,
            })}
          >
            {major}.{minor}
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography fontWeight={700} sx={{ color: "text.primary" }}>
              {version.name || "İsimsiz Versiyon"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {version.releaseDate
                ? `Yayın Tarihi: ${version.releaseDate}`
                : `${services.length} servis`}
            </Typography>
          </Box>
        </Stack>
      </AccordionSummary>

      <Divider />

      <AccordionDetails sx={(theme) => ({ px: 3, py: 2.5, bgcolor: theme.custom.detailsBg })}>
        {services.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Bu sürüm için servis bilgisi bulunamadı.
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {services.map((service) => (
              <ServiceCard
                key={service.name}
                name={service.name}
                version={service.version}
              />
            ))}
          </Grid>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default memo(VersionAccordion);
