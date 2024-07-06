import { ThemeProvider, CssBaseline, Container, IconButton, useMediaQuery, useTheme, Box, Switch } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import React, { useState } from "react";
import { Outlet } from "react-router-dom";

// icons
import CloseIcon from "@mui/icons-material/Close";

// components
import Footer from "../Footer";
import Header from "../Header";
import Modals from "../Modals";

// themes
import lightThemeOptions from "../../theme/main-light";
import darkThemeOptions from "../../theme/main-dark";

const Layout = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const themeOptions = isDarkMode ? darkThemeOptions : lightThemeOptions;
  const theme = responsiveFontSizes(createTheme(themeOptions));

  const matches = useMediaQuery(theme.breakpoints.down("md"));

  const notistackRef = React.createRef();
  const SnackbarActions = (key) => (
    <IconButton component="span" onClick={() => notistackRef.current.closeSnackbar(key)}>
      <CloseIcon sx={{ color: "text.main" }} />
    </IconButton>
  );

  const handleThemeChange = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeProvider theme={createTheme(theme)}>
      <CssBaseline />
      <SnackbarProvider
        ref={notistackRef}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={15000}
        action={(key) => SnackbarActions(key)}
      >
        <Box sx={{ backgroundColor: theme.palette.background.main, position: 'relative' }}>
          <IconButton
            onClick={handleThemeChange}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 1300,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.text.main,
              '&:hover': {
                backgroundColor: theme.palette.action.hover,
              },
            }}
          >
            <Switch checked={isDarkMode} onChange={handleThemeChange} />
          </IconButton>
          <Header />
          <Container
            maxWidth="false"
            sx={{ minWidth: "calc(100vw - 18px)", minHeight: `calc(100vh - ${matches ? "56px" : "64px"})` }}
          >
            <Outlet />
            <Modals />
          </Container>
          <Footer />
        </Box>
      </SnackbarProvider>
    </ThemeProvider>
  );
};

export default Layout;