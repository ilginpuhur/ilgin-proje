import { createTheme } from "@mui/material/styles";

// Bileşenlerde kullanılan ama MUI'nin standart palette anahtarlarına
// (background, text, divider, action.hover) karşılık gelmeyen ek renkler.
// theme.custom.xxx üzerinden erişilir.
const buildCustomTokens = (isLight) => ({
  detailsBg: isLight ? "#fbfcfd" : "#15181d",
  neutralAvatarBg: isLight ? "#dbe2ea" : "#2a2e35",
  neutralAvatarText: isLight ? "#5b6b7c" : "#aab4c0",
  iconAvatarBg: isLight ? "#eef2f7" : "#232830",
  filterShadow: isLight ? "0 1px 3px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.5)",
});

export function createAppTheme(mode) {
  const isLight = mode === "light";

  const theme = createTheme({
    palette: {
      mode,
      primary: {
        main: "#2f6feb",
        dark: "#255bc4",
      },
      background: {
        default: isLight ? "#f4f6f8" : "#0f1216",
        paper: isLight ? "#ffffff" : "#1a1d23",
      },
      text: {
        primary: isLight ? "#1a2027" : "#e8eaed",
      },
      divider: isLight ? "#e3e7eb" : "#2a2e35",
      action: {
        hover: isLight ? "#f8f9fb" : "#20242b",
      },
    },
  });

  theme.custom = buildCustomTokens(isLight);

  return theme;
}
