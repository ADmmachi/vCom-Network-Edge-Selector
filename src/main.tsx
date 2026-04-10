import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import App from "./App";
import "./index.css";

const theme = createTheme({
  primaryColor: "vcom-teal",
  colors: {
    "vcom-teal": [
      "#e6f3f7", "#cce7ef", "#99cfe0", "#66b7d0", "#339fc0",
      "#014C71", "#014465", "#013c59", "#01344d", "#012c41",
    ],
    "vcom-purple": [
      "#ebe5f2", "#d7cce6", "#af99cc", "#8866b3", "#603399",
      "#3E1A80", "#381773", "#321466", "#2c1259", "#260f4d",
    ],
    "vcom-green": [
      "#e7f4ec", "#cfe9d9", "#9fd3b3", "#6fbd8d", "#3fa767",
      "#0E8742", "#0d7a3b", "#0b6c35", "#0a5f2e", "#085127",
    ],
    "vcom-orange": [
      "#fef3e8", "#fde7d1", "#fbcfa3", "#f9b775", "#f79f47",
      "#EE7C13", "#d67011", "#be640f", "#a6580d", "#8e4c0b",
    ],
  },
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <App />
    </MantineProvider>
  </StrictMode>,
);
