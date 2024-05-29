import React from "react"; // , {useState}

// components mui
import { AppBar, Container, useMediaQuery, useTheme } from "@mui/material";

import LogoWhite from "../../assets/images/vortex-logo.png";


const Header = () => {

  // MediaQuery
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <AppBar position="static" sx={{ background: "transparent", boxShadow: "none", paddingTop: "1.5em" }}>
      <Container maxWidth="xl" sx={{ px: matches ? 2 : 2, alignContent: "center", justifyContent: "center", display: "flex", paddingY: "1em" }}>
        <img src={LogoWhite} alt="Vortex logo" style={{ maxHeight: matches ? "22px" : "80px" }} />
      </Container>
    </AppBar>
  );
};

export default Header;
