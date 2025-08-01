"use client";

import { createTheme, ThemeProvider } from "@mui/material";
import React from "react";

const MuiThemeProvider = ({ children }: any) => {
  const theme = createTheme({
    palette: {
      primary: {
        main: "#00F5E0",
        contrastText: "#000",
        dark: "#050512",
        light: "#494950",
      },
      secondary: {
        main: "#00FFE9",
        dark: "#1E1E1E",
        light: "rgba(0, 245, 224, 0.1)",
      },
      text: {
        primary: "#fff",
        secondary: "#888891",
      },
    },
    components: {
      MuiContainer: {
        styleOverrides: {
          root: {
            "&.MuiContainer-maxWidthXl": {
              maxWidth: "1800px",
            },
          },
        },
      },
    },
  });

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};

export default MuiThemeProvider;
