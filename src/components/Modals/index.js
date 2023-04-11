import React from "react";
import { useSelector } from "react-redux"
import Connect from "./Connect";
import ModalSelectBridgeNetwork from "./SelectBridgeNetwork";
const Modals = () => {
  // selector
  const currentModal = useSelector(state => state.modals.modal);

  if(currentModal == null) {
    document.body.style.overflow = "auto"
  }
  

  return (
    <>
      <Connect />
      <ModalSelectBridgeNetwork />
    </>
  );
}

export default Modals;