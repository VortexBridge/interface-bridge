import React from "react";
import { useDispatch, useSelector } from "react-redux";
// components mui
import { Modal, Box, Typography, Button } from "@mui/material";
// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";

// components
import ModalHeader from "../ModalHeader";
import { setBridgeDisclaimer } from "../../../redux/actions/settings";

const ModalDisclaimer = () => {
  // hooks
  const dispatch = useDispatch();
  // selectors
  const currentModal = useSelector((state) => state.modals.modal);
  const disclaimer = useSelector((state) => state.settings.disclaimer)

  const closeModal = () => {
    dispatch(setModalData(null));
    dispatch(setModal(null));
  };

  const acceptModal = () => {
    dispatch(setBridgeDisclaimer(true))
    closeModal()
  }

  return (
    <Modal open={currentModal === "Disclaimer" && disclaimer == false} sx={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
      <Box sx={{ minWidth: "sm", maxHeight: "900px", width: "100%", maxWidth: "420px", marginY: "20px", bgcolor: "background.paper", borderRadius: "10px", overflowY: "auto" }}>
        <ModalHeader title={"Disclaimer"} hideCloseButton={true} />
        <Box paddingX={"15px"} paddingTop="15px">

          <Typography component={"p"} variant={"body2"}>This Interface is a web user interface software to Vortex Bridge, a cross chain messaging protocol. THIS INTERFACE AND THE VORTEX BRIDGE PROTOCOL ARE PROVIDED &quot;AS IS&quot;, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND. By using or accessing this Interface or Vortex Bridge, you agree that no developer or entity involved in creating, deploying, maintaining, operating this Interface or Vortex Bridge, or causing or supporting any of the foregoing, will be liable in any manner for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of, this Interface or Vortex Bridge, or this Interface or Vortex themselves, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value. By using or accessing this Interface, you represent that you are not subject to sanctions or otherwise designated on any list of prohibited or restricted parties or excluded or denied persons, including but not limited to the lists maintained by the United States&apos; Department of Treasury&apos;s Office of Foreign Assets Control, the United Nations Security Council, the European Union or its Member States, or any other government authority. Use at your own risk, the protocols and interfaces are not audited and might not work correctly, what could end in a loss of your token.</Typography>
        </Box>
        <Box padding={"15px"} display={"flex"} justifyContent={"space-around"} alignContent={"center"}>
          <Button href="http://vortexbridge.io" variant="outlined" size={"large"} sx={{ minWidth: "40%" }}>Leave</Button>
          <Button onClick={acceptModal} variant="contained" size={"large"} sx={{ minWidth: "40%" }}>Confirm</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalDisclaimer;
