import StorageIcon from "@mui/icons-material/Storage";
import WebIcon from "@mui/icons-material/Web";
import CloudIcon from "@mui/icons-material/Cloud";
import MemoryIcon from "@mui/icons-material/Memory";

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

