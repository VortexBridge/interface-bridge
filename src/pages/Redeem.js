/* eslint-disable */
import { Avatar, Container, Box, Button, Card, CardContent, CardHeader, Chip, FormControl, InputBase, InputLabel, MenuItem, Select, Typography, useMediaQuery, useTheme } from '@mui/material';
import { getAccount } from '@wagmi/core';
import { BigNumber } from "bignumber.js";
import { ethers } from 'ethers';
import { utils as koilibUtils } from "koilib";
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useProvider, useSigner } from "wagmi";
import { shortedAddress } from "./../utils/display";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_NAMES } from "./../constants/chains";

// helpers
import { EthereumBridgeContract, EthereumTokenContract, KoinosBridgeContract, KoinosTokenContract } from "./../helpers/contracts";

// Actions
import { setNetworkFrom, setNetworkTo } from "../redux/actions/bridge";
import { setModal, setModalData } from "../redux/actions/modals";

// api
import BrigeService from "./../services/bridge";

// components
import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import CustomKoinConnectButton from "../components/Bridge/CustomKoinConnectButton";
import SelectChain from "./../components/SelectChain";

const Redeem = (props) => {
  // Dispatch to call actions
  const dispatch = useDispatch();
  const Snackbar = useSnackbar();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const account = getAccount()
  const signer = useSigner()
  const provider = useProvider()
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
  const [blockIrreversal, setBlockIrreversal] = useState(false);
  const [recover, setRecover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourceTX, setSourceTX] = useState("");

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
          console.log("expire 1")
          setLoading(false)
          return;
        } else {
          // toast({
          //   title: 'Expired signatures',
          //   description: 'The validators signatures have expired, please request new ones. If you already submitted a request, please try to complete the transfer again in a few minutes.',
          //   status: 'error',
          //   isClosable: true,
          // })
          console.log("expire 2")
          setLoading(false)
          return;
        }
      }

      let _bridge = null;
      let _bridgeInfo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(toChain, "id", null));

      // redeem
      if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        _bridge = await EthereumBridgeContract(_bridgeInfo.bridgeAddress, signer.data);
        console.log("llego aqui")
        if (_bridge) {
          console.log(
            _get(recover, "id", ""),
            _get(recover, "opId", ""),
            _get(recover, "ethToken", ""),
            _get(recover, "recipient", ""),
            _get(recover, "amount", ""),
            _get(recover, "signatures", ""),
            _get(recover, "expiration", "")
          )
          const tx = await _bridge.completeTransfer(
            _get(recover, "id", ""),
            _get(recover, "opId", ""),
            _get(recover, "ethToken", ""),
            _get(recover, "recipient", ""),
            _get(recover, "amount", ""),
            _get(recover, "signatures", ""),
            _get(recover, "expiration", "")
          )
          await tx.wait()
          console.log(tx)
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
            recipient: _get(recover, "recipient", ""),
            value: _get(recover, "amount", ""),
            expiration: _get(recover, "expiration", ""),
            signatures: _get(recover, "signatures", "")
          })
          console.log(transaction.id)
          await transaction.wait();
          console.log(transaction)
        }
      }
      setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
      return;
    }

  }

  const checkApi = async () => {
    if (loading) return;
    setLoading(true)
    let result = null;
    try {
      let bridge = new BrigeService();
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        result = await bridge.getEthTx(sourceTX)
      }
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN) {
        result = await bridge.getKoinTx(sourceTX)
      }
    } catch (error) {
      result = null;
      console.log(error)
    }
    setLoading(false)
    setRecover(result);
  }

  const BaseConnections = () => (
    <>
      {_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH ? <CustomEthConnectButton /> : null}
      {_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN ? <CustomKoinConnectButton /> : null}
    </>
  )
  const disabledButtonBridge = () => {
    if (loading) return true;
    if (sourceTX == "" || sourceTX == null) return true;
    if (_get(recover, "status", "") != "signed") return true;
    return false;
  }
  const ActionsBase = () => {
    if (fromChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT SOURCE NETWORK</Button>
    )
    if (toChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT REDEEM NETWORK</Button>
    )
    // conect from Ethereum
    if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH && !_get(account, 'isConnected', false)) return (
      <CustomEthConnectButton />
    )
    // conect from Koin
    if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN && !_get(walletSelector, "wallet", null)) return (
      <CustomKoinConnectButton />
    )
    if (!recover) return (
      <>
        <BaseConnections />
        <Button variant="contained" size="large" onClick={() => checkApi()} sx={{ width: "100%" }}>RECOVER</Button>
      </>
    )
    return (
      <>
        <BaseConnections />
        <Button disabled={disabledButtonBridge()} onClick={() => redeem()} variant="contained" size="large" sx={{ width: "100%" }}>REDEEM</Button>
      </>
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
            recover ?
              <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", display: "flex", alignContent: "center", flexDirection: "column" }} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Tx Status:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "status", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Receiving address:</Typography>
                  <Typography variant="h6" component={"span"}>{shortedAddress(_get(recover, "recipient", ""))}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Block Number:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "blockNumber", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Block Time:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "blockTime", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Expire:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "expiration", "")}</Typography>
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
      <Box sx={{maxWidth: "600px", marginX: "auto", marginTop: "2em"}}>
        <Typography component={"p"} variant={"body2"}>This Interface is a web user interface software to BridgeKoin, a cross chain messaging protocol. THIS INTERFACE AND THE BRIDGEKOIN PROTOCOL ARE PROVIDED &quot;AS IS&quot;, AT YOUR OWN RISK, AND WITHOUT WARRANTIES OF ANY KIND. By using or accessing this Interface or BridgeKoin, you agree that no developer or entity involved in creating, deploying, maintaining, operating this Interface or BridgeKoin, or causing or supporting any of the foregoing, will be liable in any manner for any claims or damages whatsoever associated with your use, inability to use, or your interaction with other users of, this Interface or Bridgekoin, or this Interface or BridgeKoin themselves, including any direct, indirect, incidental, special, exemplary, punitive or consequential damages, or loss of profits, cryptocurrencies, tokens, or anything else of value. By using or accessing this Interface, you represent that you are not subject to sanctions or otherwise designated on any list of prohibited or restricted parties or excluded or denied persons, including but not limited to the lists maintained by the United States&apos; Department of Treasury&apos;s Office of Foreign Assets Control, the United Nations Security Council, the European Union or its Member States, or any other government authority. Use at your own risk, the protocols and interfaces are not audited and might not work correctly, what could end in a loss of your token.</Typography>
      </Box>
    </Box >
  )
}

export default Redeem;