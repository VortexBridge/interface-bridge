import React from "react";
import { useNavigate } from "react-router-dom";

// components
import { Box, Typography, Divider, Button, SvgIcon } from "@mui/material";

// icons
import HomeIcon from "@mui/icons-material/Home";

const RobotComponent = (props) => (
  <SvgIcon {...props} version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512.000000 512.000000" preserveAspectRatio="xMidYMid meet">
    <g xmlns="http://www.w3.org/2000/svg" transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)" stroke="none">
      <path d="M277 5109 c-98 -23 -193 -103 -243 -204 l-29 -60 -3 -1529 c-3 -1700 -7 -1588 64 -1693 55 -80 132 -130 232 -152 75 -16 4449 -16 4524 0 101 22 177 72 231 152 71 105 67 -5 67 1668 0 1438 -1 1510 -18 1567 -34 107 -105 187 -209 235 l-48 22 -2265 2 c-1300 0 -2281 -3 -2303 -8z m4535 -248 c15 -8 36 -26 45 -40 17 -25 18 -111 21 -1506 2 -1025 0 -1491 -8 -1517 -6 -20 -24 -48 -41 -62 l-31 -26 -2238 0 -2238 0 -31 26 c-17 14 -35 42 -41 62 -14 50 -14 2933 0 2983 12 41 46 76 86 89 16 5 1015 8 2239 7 1875 -2 2214 -4 2237 -16z"/>
      <path d="M1060 4383 c-28 -10 -70 -56 -81 -90 -17 -53 2 -89 101 -188 l90 -90 -97 -97 -98 -98 0 -51 c0 -46 4 -54 37 -85 32 -28 45 -34 84 -34 46 0 49 2 145 97 l99 96 93 -90 c58 -56 103 -92 121 -95 63 -12 127 27 145 89 15 51 -10 99 -100 189 l-83 84 91 93 c71 72 93 101 98 130 13 66 -27 124 -97 141 -44 10 -78 -10 -173 -105 l-90 -89 -80 81 c-96 98 -155 130 -205 112z"/>
      <path d="M3473 4370 c-54 -33 -78 -102 -52 -153 6 -12 50 -61 97 -109 l86 -87 -96 -99 c-73 -75 -98 -108 -103 -135 -15 -79 74 -162 152 -142 15 3 71 50 125 103 l98 96 93 -91 c124 -122 149 -133 214 -93 44 26 66 63 66 111 0 38 -6 47 -102 143 l-101 101 81 80 c125 123 145 192 72 255 -26 23 -43 30 -77 30 -51 0 -89 -25 -186 -124 l-65 -66 -90 89 c-115 114 -150 129 -212 91z"/>
      <path d="M825 2673 c-34 -9 -63 -33 -79 -68 -23 -48 -24 -541 -1 -589 32 -66 29 -66 475 -66 361 0 405 2 431 17 52 31 59 61 59 272 l0 191 1309 2 1310 3 30 29 c53 51 54 120 2 179 l-29 32 -1744 1 c-959 1 -1752 0 -1763 -3z m635 -363 l0 -120 -240 0 -240 0 0 120 0 120 240 0 240 0 0 -120z"/>
      <path d="M2010 970 c-226 -29 -414 -181 -506 -408 -31 -78 -44 -169 -44 -325 0 -147 11 -186 62 -217 33 -20 48 -20 1039 -20 l1006 0 34 23 c53 36 62 75 56 262 -4 137 -8 171 -31 241 -44 138 -136 260 -255 338 -84 55 -180 93 -267 106 -78 11 -1008 11 -1094 0z m1182 -278 c78 -38 144 -106 185 -190 24 -48 28 -72 31 -159 l4 -103 -850 0 -850 0 -7 30 c-4 17 -4 54 0 83 19 153 95 270 215 332 84 44 91 44 660 42 l545 -2 67 -33z"/>
    </g>
  </SvgIcon>
)

const NotFound = () => {
  // hooks
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: "400px", marginX: "auto", backgroundColor: "background", paddingY: 8 }}>
      <RobotComponent color="text" sx={{ fontSize: 80, display: "flex", marginX: "auto", marginY: 4 }} />
      <Typography variant="h3" textAlign="center" gutterBottom component="div">404 ERROR</Typography>
      <Divider />
      <Typography variant="subtitle2" mt={2} textAlign="center" gutterBottom component="div">Sorry, page not found.</Typography>
      <Button
        variant="outlined"
        onClick={() => navigate("/")}
        sx={{ display: "flex", marginX: "auto", marginTop: 4 }}
        startIcon={<HomeIcon />}
      >
        Home
      </Button>
    </Box>
  )
}

export default NotFound;