import { ThemeProvider, CssBaseline, Container, IconButton, useMediaQuery, useTheme, Box, styled } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { SnackbarProvider, MaterialDesignContent } from "notistack";
import React, { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";

// Font Awesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons';

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
  // Load the theme setting from localStorage, default to false (light theme)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

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
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  const StyledMaterialDesignContent = styled(MaterialDesignContent)(() => ({
    '&.notistack-MuiContent-info': {
      backgroundColor: theme.palette.primary.main,
      color: "#fff !important",
      '& *': {
        color: "#fff !important",
      },
    },
  }));

  return (
    <ThemeProvider theme={createTheme(theme)}>
      <CssBaseline />
      <SnackbarProvider
        ref={notistackRef}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={15000}
        action={(key) => SnackbarActions(key)}
        Components={{
          info: StyledMaterialDesignContent,
        }}
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
            <FontAwesomeIcon icon={isDarkMode ? faSun : faMoon} />
          </IconButton>
          <Header />
          <Container
            maxWidth="false"
            sx={{ minWidth: "calc(100vw - 18px)", /*minHeight: `calc(100vh - ${matches ? "56px" : "64px"})`*/ }}
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