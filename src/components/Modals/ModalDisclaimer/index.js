import React from "react";
import { useDispatch, useSelector } from "react-redux";
// components mui
import { Modal, Box, Typography, Button } from "@mui/material";
// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";

// components
import ModalHeader from "../ModalHeader";

const ModalDisclaimer = () => {
  // hooks
  const dispatch = useDispatch();
  // selectors
  const currentModal = useSelector((state) => state.modals.modal);

  const closeModal = () => {
    dispatch(setModalData(null));
    dispatch(setModal(null));
  };

  return (
    <Modal open={currentModal === "Disclaimer"} sx={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
      <Box sx={{ minWidth: "sm", maxHeight: "900px", width: "100%", maxWidth: "420px", marginY: "20px", bgcolor: "background.paper", borderRadius: "10px", overflowY: "auto" }}>
        <ModalHeader title={"Disclaimer"} hideCloseButton={true} />
        <Box paddingX={"15px"} paddingTop="15px">

          <Typography component={"p"} variant={"body2"}>The use of the bridge called BridgeKoin is solely at the user&apos;s own risk. While it has been created with the best conscience, the smart contract associated with it has not been audited and therefore may bear a risk. KoinDX Labs, Inc. provides only a user interface to the existing smart contracts for the bridge through its platform, and does not operate the bridge itself. Please be aware that any use of the bridge is undertaken at the user&apos;s own discretion and the user assumes all responsibility for any potential risks associated with its use.</Typography>
        </Box>
        <Box padding={"15px"} display={"flex"} justifyContent={"space-around"} alignContent={"center"}>
          <Button href="https://koindx.com" variant="outlined" size={"large"} color="warning" sx={{minWidth: "40%"}}>Leave</Button>
          <Button onClick={closeModal} variant="contained" size={"large"} color="warning" sx={{minWidth: "40%"}}>Confirm</Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ModalDisclaimer;
