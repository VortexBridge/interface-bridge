import React from "react";
import { createRoot } from "react-dom/client";

import OperatorApp from "./OperatorApp.jsx";

import "../App.css";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <OperatorApp />
  </React.StrictMode>,
);
