import React from "react";

// components mui
import { Box, IconButton, Typography } from "@mui/material";

// icons
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

const ModalHeader = ({ title, closeFunction, backArrow, hideCloseButton }) => {
  return (
    <Box container sx={{ display: "flex", textTransform: "capitalize", justifyContent: "space-between", alingItems: "center", paddingX: "15px", paddingTop: "10px" }}>
      {backArrow && typeof (backArrow) == "function" ?
        <IconButton component="span" onClick={() => backArrow()}>
          <ArrowBackIcon color="secondary" />
        </IconButton> : null}
      <Typography variant="h5" component="h3" id="modal-modal-title" sx={{ marginY: "auto", fontWeight: "bold" }}>
        {title} Network
      </Typography>
      {!hideCloseButton ?
        <IconButton component="span" onClick={closeFunction}>
          <CloseIcon color="secondary" />
        </IconButton>
        : null
      }
    </Box>
  );
};

export default ModalHeader;
