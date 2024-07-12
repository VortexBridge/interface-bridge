import * as kondor from "kondor-js";
import React, { Fragment, useState, useEffect } from "react";
import { Provider } from "koilib";
import { get as _get } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { useSnackbar } from "notistack";

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
import KondorLogo from "./../../../assets/images/wallets/kondor.svg";
import WalletConnectLogo from "./../../../assets/images/wallets/walletconnect.svg";

const ModalConnect = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();

  // selector
  const currentModal = useSelector(state => state.modals.modal);

  const Snackbar = useSnackbar();

  // states
  const [loading, setLoading] = useState(false);
  const [walletConnectLoaded, setWalletConnectLoaded] = useState(false);

  // have to wait for the WalletConnect library to load before we can use it (it's shoved into the window object)
  useEffect(() => {
    console.log(window);
    if (window.WalletConnectKoinos !== "undefined") {
      // The Wallet object is defined, indicating the library is loaded.
      setWalletConnectLoaded(true);
    }
  }, [walletConnectLoaded]);

  if (!walletConnectLoaded) {
    // Render a simple loading indicator or message while the walletconnect library is loading.
    return <div>Loading Wallets...</div>;
  }

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
          let provider = new Provider(import.meta.env.VITE_KOINOS_RPC || 'https://harbinger-api.koinos.io');
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

  const initializeWalletConnect = () => {
    let testnet = import.meta.env.VITE_CHAIN || "TESTNET";
    if(testnet == "TESTNET") testnet = "true";
    const projectId = (testnet == "true") ? '55003640cab75f712d7a880ec2798cb9' : 'c64ca949713c7b3ef89702e71583fb97';
    const url = (testnet == "true") ? "https://test.vortexbridge.io" : "https://vortexbridge.io";
    return new window.WalletConnectKoinos(
      {
        projectId,
        // your application information
        metadata: {
          name: "Vortex Bridge",
          description: "Vortex Bridge - the native bridge for Koinos",
          url: url,
          icons: [
            "~/public/apple-touch-icon.png",
          ],
        },
        modalOptions: {
          explorerRecommendedWalletIds: ["de9e8421961e35c5e35cb63e3cd7be9af328a62c7b5a11f95ca116bf128a7424"],
        },
      }
    );
  }

  const checkPopUps = () => {
    let newWin = window.open("https://vortexbridge.io");
    if (!newWin || newWin.closed || typeof newWin.closed == "undefined") {
      return false
    }
    return true
  }

  const WC = () => {
    return new Promise((resolve, reject) => {
      const walletConnectKoinos = initializeWalletConnect();
      let testnet = import.meta.env.VITE_CHAIN || "TESTNET";
      if(testnet == "TESTNET") testnet = "true";
      try {
        // initiate connection with a wallet
        walletConnectKoinos
          .connect(
            [
              (testnet == "true")
                ? "koinos:EiBncD4pKRIQWco_WRqo5Q-xnXR7JuO3PtZv983mKdKHSQ=="
                : window.WC_ChainIds.Mainnet,
            ],
            [
              window.WC_Methods.SignAndSendTransaction,
              window.WC_Methods.PrepareTransaction,
              window.WC_Methods.WaitForTransaction,
              window.WC_Methods.GetAccountRc,
              window.WC_Methods.ReadContract,
              window.WC_Methods.GetTransactionsById,
            ]
          )
          .then((accounts) => {
            if (accounts) {
              const provider = new Provider([ // manually specify provider because the ones in walletconnect are old
                (testnet == "true")
                  ? "https://harbinger-api.koinos.io"
                  : "https://api.koinos.io",
              ]);
              const signer = walletConnectKoinos.getSigner(accounts[0]);
              const connected = accounts ? true : false;
              dispatch(setSigner(signer));
              dispatch(setProvider(provider));
              dispatch(
                setWallet([
                  {
                    name: "walletconnect",
                    address: accounts[0],
                    signers: [signer],
                    object: walletConnectKoinos,
                  },
                ])
              );
              dispatch(setConnected(connected));
              dispatch(setNetwork((testnet == "true") ? 'EiBncD4pKRIQWco_WRqo5Q-xnXR7JuO3PtZv983mKdKHSQ==' : 'EiBZK_GGVP0H_fXVAM3j6EAuz3-B-l3ejxRSewi7qIBfSA=='));
              resolve(true);
            }
          })
          .catch((e) => {
            console.log(e);
          });
      } catch (e) {
        console.log(e);
        setLoading(false);
        resetWalletState();
        walletConnectKoinos.disconnect();
        reject(e);
      }
      closeModal();
    });
  };

  // methods
  const selectWallet = async (typed) => {
    try {
      switch (typed) {
      case "kondor-wallet":
        setLoading(true);
        await KondorWallet()
        break;
      case "wallet-connect":
        await WC()
        break;
      default:
        break;
      }
    } catch (e) {
      console.log(e);
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
          <ListItem sx={{ "&:hover": { backgroundColor: "background.light", borderRadius: "10px" } }} >
            <ListItemButton sx={{ "&:hover": { backgroundColor: "background.light" } }} disabled={false} variant="outlined" onClick={() => selectWallet("kondor-wallet")}>
              <ListItemIcon>
                <img src={KondorLogo} style={{ width: "40px", height: "40px" }} alt="kondor wallet" />
              </ListItemIcon>
              <ListItemText primary="Kondor Wallet" />
            </ListItemButton>
          </ListItem>
          <ListItem sx={{ "&:hover": { backgroundColor: "background.light", borderRadius: "10px" } }} >
            <ListItemButton sx={{ "&:hover": { backgroundColor: "background.light" } }} disabled={false} variant="outlined" onClick={() => selectWallet("wallet-connect")}>
              <ListItemIcon>
                <img src={WalletConnectLogo} style={{ width: "40px", height: "40px" }} alt="WalletConnect logo" />
              </ListItemIcon>
              <ListItemText primary="WalletConnect" secondary="Mobile Wallets (Konio, etc)" />
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
        <Typography variant="subtitle1" component={"p"}>{checkPopUps ? "" : "You need to enable popups for this site."}</Typography>
        <Typography variant="body1" component="p" sx={{ marginBottom: "20px" }}>If you do not have Kondor installed you can do so by clicking the following buttons</Typography>
        <Button variant="contained" sx={{ width: "100%" }} href="https://chrome.google.com/webstore/detail/kondor/ghipkefkpgkladckmlmdnadmcchefhjl" target="_blank">
          Install Kondor Wallet
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
        <ModalHeader title={"Connect Network"} closeFunction={closeModal} backArrow={null} />
        <Box sx={{ paddingX: "15px", marginY: "auto" }}>
          <div style={{ minWidth: "sm", width: "100%", maxWidth: "520px", justifyContent: "center", alignItems: "center" }}>
            <Typography variant="body1" component="span">
              {loading ? <LoadingWallet /> : <SelectWallet />}
            </Typography>
          </div>
        </Box>
      </Box>
    </Modal>
  );
}

export default ModalConnect;
