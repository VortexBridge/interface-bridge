import darkScrollbar from "@mui/material/darkScrollbar";

//const white = "#ffffff";
//const black = "#000000";

//const secondary_grey_4 = "rgba(40 40 40 / 70%)";
const secondary_grey_4 = "#2c2c2c";

const background = "#121212"
const paper = "#1e1e1e"
const secondary_grey_1 = "#d1d1d1";
const secondary_grey_2 = "#a0a0a0";
const secondary_grey_3 = "#757575"
const primary = "#a33e8a"
const text_color = "#e0e0e0"

export const themeOptions = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  palette: {
    primary: {
      light: "#bb86fc",
      main: primary,
      dark: "#3700b3",
      contrastText: "#fff",
    },
    secondary: {
      dark: "#000000",
      main: secondary_grey_1,
      light: secondary_grey_2,
      contrastText: "red",
    },
    background: {
      default: background,
      primary: primary,
      light: secondary_grey_4,
      paper: paper,
    },
    text: {
      main: text_color,
      disabled: text_color,
      grey1: secondary_grey_1,
      grey2: secondary_grey_2,
      grey3: secondary_grey_3,
    },
    action: {
      focus: "#b2a6ff",
      disabled: secondary_grey_2,
      disabledBackground: secondary_grey_1,
    }
  },
  typography: {
    fontFamily: ["Roboto", "Helvetica", "Arial"].join(","),
    h1: {
      fontWeight: 900,
      color: text_color,
    },
    h2: {
      fontWeight: 900,
      color: text_color,
    },
    h3: {
      fontWeight: 700,
      lineHeight: 1.2,
      color: text_color,
    },
    h4: {
      fontWeight: 700,
      color: text_color,
    },
    h5: {
      fontWeight: 700,
      color: text_color,
    },
    h6: {
      fontWeight: 700,
      color: text_color,
    },
    subtitle1: {
      fontWeight: 700,
      lineHeight: 1.2,
      color: text_color,
    },
    subtitle2: {
      fontWeight: 500,
      color: text_color,
    },
    button: {
      fontWeight: 500,
      lineHeight: 1.2,
      color: text_color,
    },
    overline: {
      fontWeight: 500,
      color: text_color,
    },
    caption: {
      fontWeight: 300,
      color: text_color,
    },
    body1: {
      fontWeight: 500,
      lineHeight: 1.2,
      color: text_color,
    },
    body2: {
      fontWeight: 400,
      lineHeight: 1.2,
      color: text_color,
    },
    bodyInput: {
      fontWeight: 500,
      lineHeight: 1.2,
      color: text_color,
    },
    fontSize: 13,
    fontWeightLight: 300,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    htmlFontSize: 16,
  },
  shape: {
    borderRadius: 12,
  },
  props: {
    MuiAppBar: {
      color: "transparent",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          ...darkScrollbar(),
          scrollbarWidth: "thin",
        },
      },
    },
    MuiButton: {
      variants: [
        {
          props: { variant: "dark", color: "simple" },
          style: {
            textTransform: "none",
            border: "1px solid background.paper",
            borderRadius: "10px",
            width: "70px",
            height: "54px",
            "&:hover": { border: "1px solid white" },
            "&:focus": { border: `1px solid ${primary}` },
          },
        },
        {
          props: { variant: "contained", color: "primary" },
          style: {
            height: "42px",
            backgroundColor: primary,
            color: background,
            "&:hover": {
              backgroundColor: primary,
            },
          },
        },
        {
          props: { variant: "contained", size: "small" },
          style: {
            height: "30px",
            backgroundColor: primary,
            color: background,
            "&:hover": {
              backgroundColor: primary,
            },
          },
        },
        {
          props: { variant: "grey-contained", size: "small" },
          style: {
            height: "30px",
            width: "30px",
            padding: "0px",
            backgroundColor: secondary_grey_4,
            color: background,
            "&:hover": {
              backgroundColor: secondary_grey_3,
            },
          },
        },
      ],
    },
    MuiFilledInput: {
      variants: [
        {
          props: { variant: "kndx-fill" },
          style: {
            height: "32px",
            backgroundColor: secondary_grey_1,
            borderRadius: "10px",
            color: background,
            border: "0px",
            paddingTop: "0",
          },
        },
      ],
    },
    MuiCard: {
      variants: [
        {
          props: { variant: "outlined" },
          style: {
            borderRadius: "10px",
          },
        },
      ],
    },
    MuiCardContent: {
      Style: {
        padding: "16px",
      },
    },
  },
};

export default themeOptions;