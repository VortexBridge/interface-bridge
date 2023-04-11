import React from "react"; // , {useState}
import { useNavigate, useLocation } from "react-router-dom";

// components mui
import { AppBar, Box, Button, Container, Typography, Toolbar, useMediaQuery, useTheme } from "@mui/material";

import LogoWhite from "../../assets/images/logo_white.svg";


const Header = () => {
  // Dispatch to call actions
  const navigate = useNavigate();
  const location = useLocation();

  // MediaQuery
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.down("md"));

  // nav data
  const routes = [
    { index: 0, route: "/bridge", paths: ["/bridge"], label: "bridge" },
    { index: 1, route: "/redeem", paths: ["/redeem"], label: "redeem" }
  ];
  const removeTabInPaths = [];

  return (
    <AppBar position="static" sx={{ background: "transparent", boxShadow: "none" }}>
      <Container maxWidth="xl" sx={{ px: matches ? 2 : 2 }}>
        <Toolbar sx={{ maxHeight: "52px", justifyContent: matches ? "space-around" : "", px: matches ? 0 : 2 }}>
          <img src={LogoWhite} alt="KoinDX logo" style={{ maxHeight: matches ? "22px" : "36px", float: "left" }} />
          <Box sx={{ flexGrow: 1, display: { xs: "flex", justifyContent: "flex-end", alignItems: "center" } }}>
            {removeTabInPaths.indexOf(location.pathname) === -1
              ? routes.map((page) => (
                <Button
                  size={matches ? "small" : "large"}
                  sx={{ px: matches ? 0 : .5, mx: matches ? 0 : .5, color: "text.main" }}
                  key={page.route}
                  onClick={() => navigate(page.route)}
                >
                  <Typography textAlign="center" variant="h6">
                    {page.label}
                  </Typography>
                </Button>
              ))
              : null}
          </Box>

        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header;
