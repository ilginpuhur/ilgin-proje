import React from "react";
import {
  Storage as StorageIcon,
  Web as WebIcon,
  Cloud as CloudIcon,
  Memory as MemoryIcon,
} from "@mui/icons-material";

// Servis İkonu Seçimi
export const getServiceIcon = (key = "") => {
  const k = key.toLowerCase();
  if (k.includes("be") || k.includes("backend") || k.includes("db")) {
    return <StorageIcon fontSize="small" />;
  }
  if (k.includes("fe") || k.includes("frontend") || k.includes("ui")) {
    return <WebIcon fontSize="small" />;
  }
  if (k.includes("infra") || k.includes("cloud")) {
    return <CloudIcon fontSize="small" />;
  }
  return <MemoryIcon fontSize="small" />;
};
