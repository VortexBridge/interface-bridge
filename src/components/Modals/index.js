import React from "react";
import { useSelector } from "react-redux"
import Connect from "./Connect";
import ModalSelectBridgeNetwork from "./SelectBridgeNetwork";
import ModalDisclaimer from "./ModalDisclaimer";
import ModalSelectTokenToBridge from "./SelectTokenToBridge";
import Disconnect from "./Disconnect"

const Modals = () => {
  // selector
  const currentModal = useSelector(state => state.modals.modal);

  if(currentModal == null) {
    document.body.style.overflow = "auto"
  }

  return (
    <>
      <Connect />
      <Disconnect />
      <ModalSelectBridgeNetwork />
      <ModalDisclaimer />
      <ModalSelectTokenToBridge />
    </>
  );
}

export default Modals;