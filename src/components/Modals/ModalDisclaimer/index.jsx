import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// components mui
import { Modal, Box, Typography, Button, Link } from "@mui/material";
// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";

// components
import ModalHeader from "../ModalHeader";
import { setBridgeDisclaimer } from "../../../redux/actions/settings";
import { TERMS_VERSION, TERMS_ACCEPTED_KEY } from "../../../constants/terms";

// accepted in this browser for the current version of the terms (a new version asks again)
const acceptedBefore = () => {
  try {
    return window.localStorage.getItem(TERMS_ACCEPTED_KEY) === TERMS_VERSION;
  } catch (e) {
    return false;
  }
};

const RISKS = [
  "Vortex Bridge is non-custodial software. Nobody behind this interface holds your funds or keys, and nobody can cancel, reverse or recover a transaction for you. You alone choose the network, token, amount and receiving address; tokens sent to a wrong or incompatible address can be lost for good.",
  "Bridged (wrapped) tokens such as vKOIN, vUSDT, vUSDC or vETH are only as safe as the bridge behind them. A software bug, a failure or attack of the validators, a key or governance failure, or a problem on one of the connected blockchains can make them lose part or all of their value or make them impossible to redeem.",
  "Transfers are not instant and not guaranteed. A bridge can be paused, a daily limit can be reached, a token can be disabled, some changes wait for a time delay, and networks can be congested or halted. You may have to finish a transfer yourself on the receiving network and pay the network fees on both sides.",
  "Some routes use third-party bridges (such as Wormhole) or two steps through Ethereum. Their own risks and fees apply, and they are not controlled by Vortex.",
  "The smart contracts and this interface may contain errors. No audit, review or test guarantees that they are safe.",
  "Nothing here is investment, financial, legal or tax advice. You are responsible for the laws and taxes that apply to you.",
];

const ModalDisclaimer = () => {
  // hooks
  const dispatch = useDispatch();
  const textRef = useRef(null);
  const [readToEnd, setReadToEnd] = useState(false);
  // selectors
  const currentModal = useSelector((state) => state.modals.modal);
  const disclaimer = useSelector((state) => state.settings.disclaimer)
  const open = currentModal === "Disclaimer" && disclaimer == false;

  const closeModal = () => {
    dispatch(setModalData(null));
    dispatch(setModal(null));
  };

  const acceptModal = () => {
    if (!readToEnd) return;
    try {
      window.localStorage.setItem(TERMS_ACCEPTED_KEY, TERMS_VERSION);
    } catch (e) {
      // private window or blocked storage: the notice comes again on the next visit
    }
    dispatch(setBridgeDisclaimer(true))
    closeModal()
  }

  // accepted before in this browser (this version of the terms): no notice
  useEffect(() => {
    if (open && acceptedBefore()) {
      dispatch(setBridgeDisclaimer(true));
      closeModal();
    }
  }, [ open ]);

  // Accept only after the text was scrolled to its end (or when it fits without scrolling)
  const checkEnd = () => {
    const el = textRef.current;
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadToEnd(true);
  };
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(checkEnd, 50);   // after the modal has laid out its text
    return () => clearTimeout(t);
  }, [ open ]);

  return (
    <Modal open={open && !acceptedBefore()} sx={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
      <Box role="dialog" aria-modal="true" aria-labelledby="modal-modal-title"
        sx={{ minWidth: "sm", maxHeight: "900px", width: "100%", maxWidth: "460px", marginY: "20px", bgcolor: "background.paper", borderRadius: "10px", overflowY: "auto" }}>
        <ModalHeader title={"Risks and Terms"} hideCloseButton={true} />
        <Box ref={textRef} onScroll={checkEnd} tabIndex={0} aria-label="Risks and terms, scroll to the end to accept"
          sx={{ marginX: "15px", marginTop: "15px", paddingRight: "8px", maxHeight: "min(45vh, 320px)", overflowY: "auto" }}>
          <Typography component={"p"} variant={"body2"} sx={{ marginBottom: "10px" }}>
            Please read this before you use the bridge. It is a short summary of the <Link href="/tos" target="_blank" rel="noopener noreferrer">Terms of Service</Link>, which apply in full.
          </Typography>
          {RISKS.map((text, i) => (
            <Typography key={i} component={"p"} variant={"body2"} sx={{ marginBottom: "10px" }}>{`${i + 1}. ${text}`}</Typography>
          ))}
          <Typography component={"p"} variant={"body2"} sx={{ marginBottom: "10px" }}>
            THIS INTERFACE, THE VORTEX BRIDGE PROTOCOL AND ALL BRIDGED ASSETS ARE PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot;, AT YOUR OWN RISK, WITHOUT WARRANTIES OF ANY KIND. To the maximum extent permitted by law, no developer, contributor, validator or other person or entity involved in creating, deploying, maintaining or operating this interface or the Vortex Bridge protocol is liable for any indirect or consequential damage, or for any loss of tokens, cryptocurrencies or anything else of value, arising from your use of them or from any bridged asset; any other liability is limited as set out in the Terms of Service.
          </Typography>
          <Typography component={"p"} variant={"body2"} sx={{ marginBottom: "10px" }}>
            By accepting you confirm that you have read and agree to the <Link href="/tos" target="_blank" rel="noopener noreferrer">Terms of Service</Link>, that you understand these risks, that you are of legal age, and that you are not subject to sanctions or otherwise designated on any list of prohibited or restricted parties (including the lists of the U.S. Treasury&apos;s Office of Foreign Assets Control, the United Nations Security Council and the European Union) and do not act for anyone who is.
          </Typography>
        </Box>
        <Box padding={"15px"} display={"flex"} justifyContent={"space-around"} alignContent={"center"}>
          <Button href="https://vortexbridge.io" variant="outlined" size={"large"} sx={{ minWidth: "40%" }}>Leave</Button>
          <Button onClick={acceptModal} disabled={!readToEnd} variant="contained" size={"large"} sx={{ minWidth: "40%" }}>Accept</Button>
        </Box>
        {!readToEnd ?
          <Typography component={"p"} variant={"caption"} sx={{ textAlign: "center", paddingBottom: "12px", color: "text.grey2" }}>Scroll to the end of the text to accept.</Typography>
          : null}
      </Box>
    </Modal>
  );
};

export default ModalDisclaimer;
