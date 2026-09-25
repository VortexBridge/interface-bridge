import React, { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { Box, Button, Container, CssBaseline, IconButton, Stack, ThemeProvider, Typography } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

import lightThemeOptions from "../theme/main-light";
import darkThemeOptions from "../theme/main-dark";
import Operate from "./Operate.jsx";

const THEME_KEY = "vortex-operator-theme";

function MissingOperatorRoute() {
  const navigate = useNavigate();
  return <Container maxWidth="sm" sx={{ py: 8, textAlign: "center" }}>
    <Typography variant="h4" component="h1" gutterBottom>Operator page not found</Typography>
    <Typography color="text.secondary" sx={{ mb: 3 }}>This private application contains validator operations only.</Typography>
    <Button variant="contained" onClick={() => navigate("/")}>Open operator console</Button>
  </Container>;
}

function OperatorShell() {
  const [dark, setDark] = useState(() => window.localStorage.getItem(THEME_KEY) === "dark");
  const theme = useMemo(
    () => responsiveFontSizes(createTheme(dark ? darkThemeOptions : lightThemeOptions)),
    [dark],
  );
  const changeTheme = () => {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  };
  return <ThemeProvider theme={theme}>
    <CssBaseline />
    <Box sx={{ minHeight: "100vh", backgroundColor: "background.default" }}>
      <Box component="header" sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Container maxWidth="lg">
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 2 }}>
            <Stack direction="row" alignItems="center" gap={2}>
              <img src={theme.LogoWhite} alt="Vortex" width="108" />
              <Box>
                <Typography variant="h6" component="div">Vortex Operator</Typography>
                <Typography variant="caption">Private validator administration</Typography>
              </Box>
            </Stack>
            <IconButton onClick={changeTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>
              {dark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Stack>
        </Container>
      </Box>
      <Container component="main" maxWidth="lg">
        <Routes>
          <Route path="/" element={<Operate />} />
          <Route path="/operate" element={<Navigate replace to="/" />} />
          <Route path="*" element={<MissingOperatorRoute />} />
        </Routes>
      </Container>
    </Box>
  </ThemeProvider>;
}

export default function OperatorApp() {
  return <BrowserRouter><OperatorShell /></BrowserRouter>;
}
