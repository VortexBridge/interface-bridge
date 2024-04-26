import * as kondor from "kondor-js";
import React, { Fragment, useState } from "react";
import { Provider } from "koilib";
import { get as _get } from "lodash";
import { isMobile } from "react-device-detect";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";
import MyKoinosWallet from "@roamin/my-koinos-wallet-sdk";

// components mui
import { Box, Button, CircularProgress, Divider, List, Link, ListItem, ListItemButton, ListItemIcon, ListItemText, Modal, Typography } from "@mui/material";

// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";
import { setNetwork } from "../../../redux/actions/settings";
import { setConnected, setProvider, setSigner, setWallet } from "../../../redux/actions/wallet";

// constants
import { CHAIN_IDS_TO_NAMES, CHAINS_IDS } from "./../../../constants/chains";

// components
import ModalHeader from "./../ModalHeader";

// Assets
import MKWLogo from "./../../../assets/images/wallets/mkw.png";
import KondorLogo from "./../../../assets/images/wallets/kondor.svg";

const ModalConnect = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();

  // selector
  const currentModal = useSelector(state => state.modals.modal);

  const Snackbar = useSnackbar();

  // states
  const [loading, setLoading] = useState(false);

  const closeModal = () => {
    dispatch(setModal(null))
    dispatch(setModalData(null))
  }

  // wallets configs
  const resetWalletState = () => {
    dispatch(setSigner(null));
    dispatch(setProvider(null));
    dispatch(setWallet(null));
    dispatch(setConnected(false));
  };

  const actionClose = (snackbarId) => (
    <Fragment>
      <Button style={{ color: "white" }} onClick={() => { Snackbar.closeSnackbar(snackbarId) }}>
        Close
      </Button>
    </Fragment>
  );

  const KondorWallet =  () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let timeOut = setTimeout(() => reject("Error Connect"), 1000 * 60)
      if (kondor) {
        try {
          let provider = new Provider(import.meta.env.VITE_KOINOS_RPC);
          let wallet = await kondor.getAccounts();
          let signer = await kondor.getSigner(_get(wallet, "[0].address", ""), { providerPrepareTransaction: provider });
          let chain_id = await kondor.provider.getChainId();

          // set connection
          dispatch(setSigner(signer));
          dispatch(setProvider(provider));
          dispatch(setWallet(wallet));
          dispatch(setConnected(true));
          dispatch(setModal(null));
          dispatch(setModalData(null));
          // check chain
          if (CHAIN_IDS_TO_NAMES[chain_id] == undefined) {
            chain_id = CHAINS_IDS.UNSUPPORTED
          }
          dispatch(setNetwork(chain_id));
        } catch (e) {
          console.log(e)
          resetWalletState()
        }
        if (timeOut) { clearTimeout(timeOut); }
        resolve()
      }
    })
  }

  const checkPopUps = () => {
    var newWin = window.open("https://koindx.com");
    if (!newWin || newWin.closed || typeof newWin.closed == "undefined") {
      return false
    }
    return true
  }

  const MyKW =  () => {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      let timeOut = setTimeout(() => reject("Error, cannot Connect"), 1000 * 60);
      const walletConnectorUrl = "https://mykw.vercel.app/embed/wallet-connector"
      try {
        const mkw = new MyKoinosWallet(walletConnectorUrl)
        const connected = await mkw.connect()
        if (connected) {
          // request permissions to access some of the My Koinos Wallet APIs
          mkw.requestPermissions({
            "accounts": ["getAccounts"],
            "provider": ["getChainId", "readContract", "wait", "getAccountRc"],
            "signer": ["prepareTransaction", "signMessage", "signAndSendTransaction"]
          }).then(async () => {
            // get data from connected wallet
            let provider = new Provider(import.meta.env.KOINOS_RPC);
            let wallet = await mkw.getAccounts()
            let signer = await mkw.getSigner(_get(wallet, "[0].address", ""));
            let chain_id = await provider.getChainId();

            // set connection
            dispatch(setSigner(signer));
            dispatch(setProvider(provider));
            dispatch(setWallet(wallet));
            dispatch(setConnected(connected));
            dispatch(setModal(null));
            dispatch(setModalData(null));

            // check chain
            if (CHAIN_IDS_TO_NAMES[chain_id] == undefined) {
              chain_id = CHAINS_IDS.UNSUPPORTED;
            }
            dispatch(setNetwork(chain_id));
          })

        } else {
          Snackbar.enqueueSnackbar(<span><Typography variant="h6">MKW Could not connect - Check that cross-site cookies are activated</Typography></span>, {
            variant: "error",
            persist: false,
            action: actionClose,
          })
          // throw new Error("MKW could not connect")
        }
      }
      catch (e) {
        // if user declines mkw access "request was cancelled" will be returned
        if (e !== "request was cancelled") {
          Snackbar.enqueueSnackbar(<span><Typography variant="h6">MKW Could not connect</Typography></span>, {
            variant: "error",
            persist: false,
            action: actionClose,
          })
        }
        resetWalletState()
      }

      if (timeOut) {
        clearTimeout(timeOut);
      }
      resolve();
    })
  }

  // methods
  const selectWallet = async (typed) => {
    setLoading(true);
    try {
      switch (typed) {
      case "kondor-wallet":
        await KondorWallet()
        break;
      case "mkw-wallet":
        await MyKW()
        break;
      default:
        break;
      }
    } catch (e) {
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Could not connect to wallet</Typography></span>, {
        variant: "error",
        persist: false,
        action: actionClose,
      })
    }
    setLoading(false);
  }

  const SelectWallet = () => (
    <div style={{ width: "80%", height: "100%", justifyContent: "center", alignItems: "center", display: "flex", margin: "auto" }}>
      <Box sx={{ bgcolor: "background.paper", width: "100%", padding: "40px 20px" }}>
        <Typography variant="h5" component="div" sx={{ textAlign: "center", marginBottom: "10px" }}>Select wallet</Typography>
        <Typography variant="body1" component="p" sx={{ textAlign: "center", marginBottom: "10px" }}>Choose one of the accepted wallets</Typography>
        <Divider />
        <List>
          <ListItem sx={{ "&:hover": { backgroundColor: "background.default", borderRadius: "10px" } }} >
            <ListItemButton disabled={false} variant="outlined" onClick={() => selectWallet("kondor-wallet")}>
              <ListItemIcon>
                <img src={KondorLogo} style={{ width: "40px", height: "40px" }} alt="kondor wallet" />
              </ListItemIcon>
              <ListItemText primary="Kondor Wallet" />
            </ListItemButton>
          </ListItem>
          <ListItem sx={{ "&:hover": { backgroundColor: "background.default", borderRadius: "10px" } }} >
            <ListItemButton disabled={false} variant="outlined" onClick={() => selectWallet("mkw-wallet")}>
              <ListItemIcon>
                <img src={MKWLogo} style={{ width: "40px", height: "40px" }} alt="My Koinos Wallet wallet logo" />
              </ListItemIcon>
              <ListItemText primary="My Koinos Wallet" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </div>
  )
  const LoadingWallet = () => (
    <div style={{ width: "90%", height: "100%", justifyContent: "center", alignItems: "center", display: "flex", margin: "auto" }}>
      <Box sx={{ bgcolor: "background.paper", width: "100%", padding: "20px 10px" }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress sx={{ marginBottom: "20px" }} color="secondary" />
        </Box>
        <Typography variant="subtitle1" component={"p"}>Popups {checkPopUps ? "allowed" : "forbidden"}</Typography>
        <Typography variant="body1" component="p" sx={{ marginBottom: "20px" }}>If you do not have Kondor or My Koinos Wallet installed you can do so by clicking one of the following buttons.</Typography>
        <Button variant="contained" sx={{ width: "100%" }} href="https://chrome.google.com/webstore/detail/kondor/ghipkefkpgkladckmlmdnadmcchefhjl" target="_blank">
          Install Kondor Wallet
        </Button>
        <Button variant="contained" sx={{ marginTop: "10px", width: "100%" }} component={Link} href="https://mykw.vercel.app" target="_blank">
          Use My Koinos Wallet
        </Button>

        <Button size="large" color="error" variant="outlined" sx={{ marginTop: "10px", width: "100%" }} onClick={() => {
          setLoading(false)
          resetWalletState()
        }}>

          cancel
        </Button>
      </Box>
    </div>
  )


  return (
    <Modal
      open={currentModal === "Connect"}
      onClose={closeModal}
      sx={{ justifyContent: "center", display: "flex", maxHeight: "350px", marginY: "auto" }}
    >
      <Box sx={{
        minWidth: "sm",
        height: "100%",
        width: "100%",
        maxWidth: "500px",
        bgcolor: "background.paper",
        borderRadius: "10px",
        overflowY: "hidden"
      }}>
        <ModalHeader title={"Connect"} closeFunction={closeModal} backArrow={null} />
        <Box sx={{ paddingX: "15px", marginY: "auto" }}>
          <div style={{ minWidth: "sm", width: "100%", maxWidth: "520px", justifyContent: "center", alignItems: "center" }}>
            <Typography variant="body1" component="span">
              {isMobile ? <p>Sorry, there is currently no mobile wallet available.</p> : (loading ? <LoadingWallet /> : <SelectWallet />)}
            </Typography>
          </div>
        </Box>
      </Box>
    </Modal>
  );
}

export default ModalConnect;
