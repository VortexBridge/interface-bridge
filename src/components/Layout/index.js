import { ThemeProvider, CssBaseline, Container, IconButton, useMediaQuery, useTheme, Box } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import React from "react";
import { Outlet } from "react-router-dom";

// icons
import CloseIcon from "@mui/icons-material/Close";

// components
import Footer from "../Footer";
import Header from "../Header";
import Modals from "../Modals";

// themes
import themeOptions from "../../theme/main";

const Layout = () => {
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down("md"));

  const design = responsiveFontSizes(createTheme(themeOptions));

  const notistackRef = React.createRef();
  const SnackbarActions = (key) => (
    <IconButton component="span" onClick={() => notistackRef.current.closeSnackbar(key)}>
      <CloseIcon sx={{ color: "text.main" }} />
    </IconButton>
  );

  return (
    <ThemeProvider theme={createTheme(design)}>
      <CssBaseline />
      <SnackbarProvider
        ref={notistackRef}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        autoHideDuration={15000}
        action={(key) => SnackbarActions(key)}
      >
        <Box sx={{ backgroundColor: theme.palette.background.main }}>
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
