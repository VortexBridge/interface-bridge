import { get as _get } from "lodash";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Identicon from "react-identicons";

// components mui
import { Box, Button, Modal, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import NotInterestedIcon from "@mui/icons-material/NotInterested";
import CheckIcon from "@mui/icons-material/Check";
// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";
import { setConnected, setProvider, setSigner, setWallet } from "../../../redux/actions/wallet";
import { shortedAddress } from "../../../utils/display";

// components
import ModalHeader from "./../ModalHeader";

const ModalConnect = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();

  const [copied, setCopied] = useState(false);

  // selector
  const currentModal = useSelector((state) => state.modals.modal);
  const walletSelector = useSelector((state) => state.wallet);

  const closeModal = () => {
    dispatch(setModal(null));
    dispatch(setModalData(null));
  };

  // wallets configs
  const resetWalletState = () => {
    closeModal();
    dispatch(setSigner(null));
    dispatch(setProvider(null));
    dispatch(setWallet(null));
    dispatch(setConnected(false));
  };

  const buttonStyle = {
    color: "white",
    padding: "15px",
    width: "100%",
    backgroundColor: "text.grey0",
    "&:hover": {
      backgroundColor: "text.grey1",
    },
    flexDirection: "column",
  };

  const copyTokenAddress = () => {
    try {
      navigator.clipboard.writeText(_get(walletSelector, "wallet[0].address", "")).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <Modal open={currentModal === "Disconnect"} onClose={closeModal} sx={{ justifyContent: "center", alignItems: "center", display: "flex" }}>
      <Box
        sx={{
          minWidth: "sm",
          height: "auto",
          minHeight: "250px",
          width: "100%",
          maxWidth: "500px",
          bgcolor: "background.paper",
          borderRadius: "10px",
          overflowY: "hidden",
        }}
      >
        <ModalHeader title={"Disconnect"} closeFunction={closeModal} backArrow={null} />
        <Box sx={{ paddingX: "15px" }}>
          <Box sx={{ marginY: "1.5em", display: "flex", flexDirection: "column", justifyContent: "space-around", alignItems: "center" }}>
            <Identicon string={_get(walletSelector, "wallet[0].address", null)} size={24} palette={["#9EFF00"]} />

            <Typography variant="h6" component="h6" marginTop={".5em"}>
              {shortedAddress(_get(walletSelector, "wallet[0].address", ""))}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-evenly", height: "60px", gap: 6 }}>
            <Button sx={buttonStyle} onClick={() => copyTokenAddress()}>
              {copied ? (
                <>
                  <CheckIcon fontSize={"25"} sx={{ marginBottom: "10px" }} />
                  <Typography variant="body1" component={"p"} sx={{ display: "block" }}>
                    Copied
                  </Typography>
                </>
              ) : (
                <>
                  <ContentCopyIcon fontSize={"25"} sx={{ marginBottom: "10px" }} />

                  <Typography variant="body1" component={"p"} sx={{ display: "block" }}>
                    Copy Address
                  </Typography>
                </>
              )}
            </Button>
            <Button onClick={resetWalletState} sx={buttonStyle}>
              <NotInterestedIcon fontSize={"25"} sx={{ marginBottom: "10px" }} />
              <Typography variant="body1" component={"p"} sx={{ display: "block" }}>
                Disconnect
              </Typography>
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalConnect;
