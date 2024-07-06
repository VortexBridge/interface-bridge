/* eslint-disable */
import moment from 'moment';
import { Box, Button, Card, CardContent, CardHeader, Chip, CircularProgress, InputBase, Link, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useAccount } from 'wagmi';
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import React, { Fragment, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shortedAddress } from "../utils/display";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_NAMES, BRIDGE_CHAINS_TYPES } from "../constants/chains";

// helpers
import { EvmBridgeContract, EvmTokenContract, KoinosBridgeContract, KoinosTokenContract } from "../helpers/contracts";

// Actions
import { setNetworkFrom, setNetworkTo } from "../redux/actions/bridge";
import { setModal, setModalData } from "../redux/actions/modals";

// hooks
import { useEthersSigner } from '../hooks/useSigner';
import { useEthersProvider } from '../hooks/useProvider';

// api
import BrigeService from "../services/bridge";

// components
import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import CustomKoinConnectButton from "../components/Bridge/CustomKoinConnectButton";
import SelectChain from "../components/SelectChain";

const Redeem = (props) => {
  // Dispatch to call actions
  const dispatch = useDispatch();
  const Snackbar = useSnackbar();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const account = useAccount()
  const signer = useEthersSigner();
  const provider = useEthersProvider();
  const navigate = useNavigate();

  // get tx and network route params
  // http://localhost:3000/redeem?tx=tx_id&from=koinos&to=koinos
  const [searchParams] = useSearchParams();

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);

  // variables
  const toChain = _get(bridgeSelector, "to", null);
  const fromChain = _get(bridgeSelector, "from", null);

  // states
  const [checker, setChecker] = useState(null);
  const [recover, setRecover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourceTX, setSourceTX] = useState("");
  const [blockchainTX, setblockchainTX] = useState(false);

  const actionClose = (snackbarId) => (
    <Fragment>
      <Button style={{ color: "white" }} onClick={() => { Snackbar.closeSnackbar(snackbarId) }}>
        Close
      </Button>
    </Fragment>
  );

  // efects
  useEffect(() => {
    if (searchParams.get("tx")) {
      setSourceTX(searchParams.get("tx"))
    }
    if (searchParams.get("from")) {
      let _chainRedeem = BRIDGE_CHAINS.find(chain => chain.id == searchParams.get("from"))
      if (_chainRedeem)
        dispatch(setNetworkFrom(_chainRedeem))
    }
    if (searchParams.get("to")) {
      let _chainRedeem = BRIDGE_CHAINS.find(chain => chain.id == searchParams.get("to"))
      if (_chainRedeem)
        dispatch(setNetworkTo(_chainRedeem))
    }
    dispatch(setModal("Disclaimer"))
  }, []);

  useEffect(() => {
    if(sourceTX) {
      setRecover(null)
      setblockchainTX(null)
      if(checker) {
        clearTimeout(checker);
      }
      checkApi(sourceTX)
    }
  }, [ sourceTX ]);


  const openModal = (side) => {
    dispatch(setModalData({ side: side }))
    dispatch(setModal("SelectBridgeNetwork"))
  }

  const redeem = async () => {
    setLoading(true);
    if (loading) return;
    try {
      // checks
      const now = new Date()
      const expiration = new Date(parseInt(_get(recover, "expiration", 0)))
      if (now >= expiration) {
        const delta = now.getTime() - expiration.getTime()
        if (delta < 3700000) {
          // toast({
          //   title: 'Expired signatures',
          //   description: `The validators signatures have expired, please request new ones in approximately ${approximateRequestTime} minutes.`,
          //   status: 'error',
          //   isClosable: true,
          // })
          // console.log("expire 1")
          setLoading(false)
          return;
        } else {
          // toast({
          //   title: 'Expired signatures',
          //   description: 'The validators signatures have expired, please request new ones. If you already submitted a request, please try to complete the transfer again in a few minutes.',
          //   status: 'error',
          //   isClosable: true,
          // })
          // console.log("expire 2")
          setLoading(false)
          return;
        }
      }

      let _bridge = null;
      let _bridgeInfo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(toChain, "id", null));

      // redeem
      if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.SEP) {
        _bridge = await EvmBridgeContract(_bridgeInfo.bridgeAddress, signer);
        if (_bridge) {
          const tx = await _bridge.completeTransfer(
            _get(recover, "id", ""),
            _get(recover, "opId", ""),
            _get(recover, "ethToken", ""),
            _get(recover, "relayer", ""),
            _get(recover, "recipient", ""),
            _get(recover, "amount", ""),
            _get(recover, "payment", ""),
            _get(recover, "signatures", ""),
            _get(recover, "metadata", ""),
            _get(recover, "expiration", ""),
          )
          Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
            variant: 'info',
            persist: false,
            action: actionClose,
          })
          await tx.wait()
          Snackbar.enqueueSnackbar(<Link underline="none" style={{ cursor: "pointer" }} target="_blank" href={`${toChain.explorer}/${tx.id}`}><Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View Block</Typography></Link>, {
            variant: 'success',
            persist: false,
            action: actionClose,
          })
        }
      }
      if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        _bridge = await KoinosBridgeContract(_bridgeInfo.bridgeAddress, providerKoin, signerKoin);
        if (_bridge) {
          let { transaction } = await _bridge.functions.complete_transfer({
            transactionId: _get(recover, "id", ""),
            token: _get(recover, "koinosToken", ""),
            relayer:  _get(recover, "relayer", ""),
            recipient: _get(recover, "recipient", ""),
            value: _get(recover, "amount", ""),
            payment: _get(recover, "payment", ""),
            metadata: _get(recover, "metadata", ""),
            signatures: _get(recover, "signatures", ""),
            expiration: _get(recover, "expiration", ""),
          })
          Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
            variant: 'info',
            persist: false,
            action: actionClose,
          })
          await transaction.wait();
          Snackbar.enqueueSnackbar(<Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography>, {
            variant: 'success',
            persist: false,
            action: actionClose,
          })
        }
      }
      setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction error</Typography></span>, {
        variant: 'error',
        persist: false,
        action: actionClose,
      })
      return;
    }
  }
  const checkChain = (_chain) => {
    let evm_conector = _get(account, 'isConnected', false);
    let koin_conector = _get(walletSelector, "connected", false);    
    if(_get(_chain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && !evm_conector) {
      return true
    }
    if(_get(_chain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN && !koin_conector) {
      return true
    }
    return false
  }

  const checkApi = async (txIdParam = null) => {
    if (loading) return;
    setLoading(true)
    let result = null;
    let existInBlockchain = false;
    try {
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        let r = await provider.getTransactionReceipt(txIdParam);
        if(!r) throw new Error("no transaction")
        existInBlockchain = true;        
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        console.log(providerKoin)
        existInBlockchain = true;
      }
      setblockchainTX(existInBlockchain);
    } catch (e) {
      console.log(3)
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction not found</Typography>
        <Typography variant="body1" color="white">the transaction has not been found on the blockchain</Typography></span>, {
          variant: 'error',
          persist: false,
          action: actionClose,
        })
      setLoading(false)
      setblockchainTX(existInBlockchain);
      return;
    }
    
    if(checker) {
      clearTimeout(checker);
    }
    try {
      let bridge = new BrigeService();
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        result = await bridge.getEthTx(txIdParam ? txIdParam : sourceTX)
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        result = await bridge.getKoinTx(txIdParam ? txIdParam : sourceTX)
      }
    } catch (error) {
      result = null;
      console.log(error)
      let _timer = setTimeout(() => checkApi(txIdParam), 3000)
      setChecker(_timer);
      return;
    }
    setLoading(false)
    setRecover(result);
  }

  const BaseConnections = (props) => (
    <>
      {_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM ? <CustomEthConnectButton {...props} /> : null}
      {_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN ? <CustomKoinConnectButton {...props} /> : null}
    </>
  )
  const Connectors = ({ chain }) => {
    // conect from Ethereum
    if (_get(chain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) return (
      <CustomEthConnectButton />
    )
    // conect from Koin
    if (_get(chain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) return (
      <CustomKoinConnectButton />
    )
  }
  const disabledButtonBridge = () => {
    if (loading) return true;
    if(!recover) return true
    if (sourceTX == "" || sourceTX == null) return true;
    // if (_get(recover, "status", "") != "signed") return true;
    return false;
  }
  const ActionsBase = () => {
    if (fromChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT SOURCE NETWORK</Button>
    )
    if (toChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT REDEEM NETWORK</Button>
    )

    // conect wallet to chain
    if (checkChain(fromChain)) return (
      <Connectors chain={fromChain} />
    )

    // conect wallet to chain
    if (checkChain(toChain)) return (
      <Connectors chain={toChain} />
    )

    if (!recover /*|| (recover && _get(recover, "signatures", []).length < 5)*/) return (
      <BaseConnections
        actions={
            <Button disabled={loading} variant="contained" size="large" onClick={() => checkApi(sourceTX)} sx={{ width: "100%" }}>RECOVER</Button>
          }
        />
    )
    return (
      <BaseConnections
        actions={
          <Button disabled={disabledButtonBridge()} onClick={() => redeem()} variant="contained" size="large" sx={{ width: "100%" }}>REDEEM</Button>
        }
      />
    )
  }

  return (
    <Box>
      <Box sx={{ marginY: "1em", maxWidth: "600px", marginX: "auto", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <Button sx={{ height: "35px", padding: "3px" }} size={"small"} variant="outlined" onClick={() => navigate("/bridge")}>Bridge</Button>
        <Button sx={{ height: "35px", padding: "3px" }} size={"small"} variant="contained" onClick={() => navigate("/redeem")}>Redeem</Button>
      </Box>
      <Card variant="outlined" sx={{ maxWidth: "600px", marginX: "auto", marginBottom: "20px", borderRadius: "10px", padding: "15px 20px" }}>
        <CardHeader title="REDEEM" sx={{ paddingBottom: "4px" }} />
        <CardContent>
          <Box marginY={".8em"} display={"flex"} justifyContent={"space-between"} alignItems={"center"} sx={{ flexDirection: { xs: "column", md: "row" } }}>
            <Chip variant={"outlined"} sx={{
              padding: "3px",
              height: 'auto',
              '& .MuiChip-label': {
                display: 'block',
                whiteSpace: 'normal',
              },
            }} label={"If you have sent your tokens but have not redeemed them, you may paste in the Source Transaction ID to resume your transfer."} color={"info"} />

          </Box>
          <Box marginTop={"1em"}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>Source Network</Typography>
            <SelectChain
              onSelect={() => openModal("from")}
              chain={fromChain}
            />
          </Box>
          <Box marginTop={"1em"}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>Redeem Network</Typography>
            <SelectChain
              onSelect={() => openModal("to")}
              chain={toChain}
            />
          </Box>
          <Box marginTop={"1em"}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>Source Transaction ID</Typography>
            <Box paddingY={"6px"} paddingX={"10px"} borderRadius={"10px"} sx={{ backgroundColor: "background.light" }}>
              <Box sx={{ display: "flex", width: "100%" }}>
                <InputBase
                  placeholder={"Source TX ID Paste here"}
                  type={"text"}
                  value={sourceTX}
                  sx={{ width: "100%", fontSize: "16px", height: "40px", color: "text.main" }}
                  onChange={(e) => setSourceTX(e.currentTarget.value)}
                />
              </Box>
            </Box>
          </Box>

          {
            !recover && blockchainTX ?
            <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column" }} marginY={"1.4em"}>
              <Box sx={{ marginX: "auto" }} >
                <CircularProgress/>
              </Box>
              <Typography sx={{ marginTop: 2, marginX: "auto" }} variant="h5" component={"span"}>validators are verifying your transaction</Typography>
              <Typography sx={{ marginTop: 1, marginX: "auto" }} variant="p" component={"span"}>this can take up to 3 minutes</Typography>
            </Box>
            : null
          }

          {
            recover && blockchainTX ?
              <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", display: "flex", alignContent: "center", flexDirection: "column" }} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Tx Status:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "status", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Receiving address:</Typography>
                  <Typography variant="h6" component={"span"}>{shortedAddress(_get(recover, "recipient", ""))}</Typography>
                </Box>
                {/* <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Amount:</Typography>
                  <Typography variant="h6" component={"span"}>{ koilibUtils.formatUnits(_get(recover, "amount", ""), 8) }</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Payment to relayer:</Typography>
                  <Typography variant="h6" component={"span"}>{ koilibUtils.formatUnits(_get(recover, "payment", ""), 8) }</Typography>
                </Box> */}
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Block Number:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "blockNumber", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Block Time:</Typography>
                  <Typography variant="h6" component={"span"}>{ moment.unix(Number(_get(recover, "blockTime", ""))/1000).format("DD-MM-YYYY, hh:mm:ss") }</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Expire:</Typography>
                  <Typography variant="h6" component={"span"}>{ moment.unix(Number(_get(recover, "expiration", ""))/1000).format("DD-MM-YYYY, hh:mm:ss") }</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Signatures:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "signatures", []).length}</Typography>
                </Box>
              </Box>
              : null
          }
          <Box marginTop={"1em"}>
            <ActionsBase />
          </Box>
        </CardContent>
      </Card>
      <Box sx={{maxWidth: "600px", marginX: "auto", marginTop: "2em", textAlign: "justify"}}>        
        <Typography component={"p"} variant={"body2"} sx={{lineHeight: "1.5"}}>This Interface is a web user interface software to BridgeKoin, a cross chain messaging protocol. THIS INTERFACE AND THE BRIDGEKOIN PROTOCOL ARE PROVIDED &quot;AS IS&quot;, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND. By using or accessing this Interface or BridgeKoin, you agree that no developer or entity involved in creating, deploying, maintaining, operating this Interface or BridgeKoin, or causing or supporting any of the foregoing, will be liable in any manner for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of, this Interface or Bridgekoin, or this Interface or BridgeKoin themselves, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value. </Typography>
        <Typography component={"p"} variant={"body2"} sx={{lineHeight: "1.5"}}>By using or accessing this Interface, you represent that you are not subject to sanctions or otherwise designated on any list of prohibited or restricted parties or excluded or denied persons, including but not limited to the lists maintained by the United States&apos; Department of Treasury&apos;s Office of Foreign Assets Control, the United Nations Security Council, the European Union or its Member States, or any other government authority. Use at your own risk, the protocols and interfaces are not audited and might not work correctly, what could end in a loss of your token.</Typography>
      </Box>
    </Box >
  )
}

export default Redeem;