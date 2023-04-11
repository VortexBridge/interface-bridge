import { ThemeProvider, CssBaseline, Fab, Container, IconButton, useMediaQuery, useTheme, Box } from "@mui/material";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import React from "react";
import { useSelector } from "react-redux";
import { Outlet } from "react-router-dom";

// icons
import CloseIcon from "@mui/icons-material/Close";
import PlaylistAddCheckCircleIcon from "@mui/icons-material/PlaylistAddCheckCircle";
import { CHAINS_IDS } from "../../constants/chains";

// components
import Footer from "../Footer";
import Header from "../Header";
import Modals from "../Modals";

// themes
import themeOptions from "../../theme/main";

const Layout = () => {
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down("md"));

  const settingsSelector = useSelector((state) => state.settings);

  const isTestnet = settingsSelector.network === CHAINS_IDS.TESTNET

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
        autoHideDuration={2000}
        action={(key) => SnackbarActions(key)}
      >
        <Box sx={{ backgroundColor: theme.palette.background.main }}>
          <Header />
          <Container
            maxWidth="false"
            sx={{ minWidth: "calc(100vw - 18px)", minHeight: `calc(100vh - ${matches ? "56px" : "64px"})` }}
          >
            {(isTestnet) ?
              <Fab variant="extended" color="warning" aria-label="add" sx={{ position: "absolute", top: "calc(100vh - 70px)", right: "20px" }} target="_blank" href="https://koindx.notion.site/KoinDX-Feedback-a8ccda8f505a480a917d20077b1cda73">
                <PlaylistAddCheckCircleIcon sx={{ mr: 1, color: "text.main" }} />
                Feedback
              </Fab> : null
            }
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
