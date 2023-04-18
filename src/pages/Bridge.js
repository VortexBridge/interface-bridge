/* eslint-disable */
import React, { useEffect, useState } from "react";
import { Provider, utils as koilibUtils, Contract } from "koilib";
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useTheme, Box, Button, InputBase, Card, CardContent, CardHeader, Typography, Avatar } from '@mui/material';
import { getAccount } from '@wagmi/core'
import { BigNumber } from "bignumber.js";
import useMediaQuery from '@mui/material/useMediaQuery';

// Actions
import { setNetworkFrom, setNetworkTo, setBalanceFrom } from "../redux/actions/bridge";
import { setModal, setModalData } from "../redux/actions/modals";

// utils
import { numberPattern } from "../utils/regex";

// icons
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVert from "@mui/icons-material/SwapVert";

// components
import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import CustomKoinConnectButton from "../components/Bridge/CustomKoinConnectButton";
import SelectChain from "./../components/SelectChain";

const Bridge = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();
  const Snackbar = useSnackbar();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const account = getAccount()

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);
  const settingsSelector = useSelector((state) => state.settings);

  // variables
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  const tokenToBridge = _get(bridgeSelector, "token", null);

  // states
  const [balance, setBalance] = useState(0)
  const [inputValue, setInputValue] = useState("0")

  useEffect(() => {
    dispatch(setModal("Disclaimer"))
  }, []);

  const swapNetworks = () => {
    let oldNetwork = fromChain
    dispatch(setNetworkFrom(toChain))
    dispatch(setNetworkTo(oldNetwork))
  }

  const openModal = (side) => {
    dispatch(setModalData({ side: side }))
    dispatch(setModal("SelectBridgeNetwork"))
  }

  const onInput = (value) => {
    setInputValue(value)
  }

  const openModalSelectToken = (side) => {
    dispatch(setModal("SelectTokenToBridge"))
  }

  const disabledButtonBridge = () => {
    return false;
  }

  const ActionLoad = () => {
    if(fromChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT FROM NETWORK</Button>
    )
    if(toChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT TO NETWORK</Button>
    )
    if(_get(fromChain, "symbol", "") == "ETH" && !_get(account, 'isConnected', false)) return (
      <CustomEthConnectButton />
    )
    if(_get(fromChain, "symbol", "") == "KOIN" && !_get(walletSelector, "wallet", null)) return (
      <CustomKoinConnectButton />
    )
    console.log(tokenToBridge)
    if(tokenToBridge == null) return (
      <>
        { _get(fromChain, "symbol", "") == "ETH" ? <CustomEthConnectButton /> : null }
        { _get(fromChain, "symbol", "") == "KOIN" ? <CustomKoinConnectButton /> : null }
        <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModalSelectToken()}>SELECT A TOKEN</Button>
      </>
    )
    return <Button disabled={disabledButtonBridge()} variant="contained" size="large" sx={{ width: "100%" }}>BRIDGE</Button>
  }

  return (
    <Card variant="outlined" sx={{ maxWidth: "600px", marginX: "auto", borderRadius: "10px", padding: "15px 20px" }}>
      <CardHeader title="BRIDGE" sx={{ paddingBottom: "4px" }} />
      <CardContent>
        <Box marginY={".8em"} display={"flex"} justifyContent={"space-between"} alignItems={"center"} sx={{ flexDirection: { xs: "column", md: "row" } }}>
          <Box sx={{ maxWidth: { xs: "100%", md: "40%" }, width: "100%" }}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>From</Typography>
            <SelectChain
              onSelect={() => openModal("from")}
              chain={fromChain}
            />
          </Box>
          <Box>
            <Box onClick={() => swapNetworks()} sx={{ marginTop: "20px", height: "40px", width: "40px", padding: "10px", borderRadius: "10px", backgroundColor: "background.light", display: "flex", justifyContent: "space-around", alignItems: "center", "&:hover": { backgroundColor: "text.grey1", cursor: "pointer" } }}>
              {
                matches ?
                  <SwapHorizIcon fontSize="large" sx={{ color: "background.paper" }} />
                  :
                  <SwapVert fontSize="large" sx={{ color: "background.paper" }} />
              }
            </Box>
          </Box>
          <Box sx={{ maxWidth: { xs: "100%", md: "40%" }, width: "100%" }}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>To</Typography>
            <SelectChain
              onSelect={() => openModal("to")}
              chain={toChain}
            />
          </Box>
        </Box>

        <Box paddingY={"10px"} paddingX={"15px"} marginTop={"1em"} borderRadius={"10px"} sx={{ backgroundColor: "background.light" }}>
          <Box display={"flex"} justifyContent={"space-between"} alignItems={"center"}>
            <InputBase placeholder={"0"} type={"text"} value={inputValue} sx={{ fontSize: "22px", color: "text.main" }} onChange={(e) => numberPattern(e.currentTarget.value, onInput)} />
            <Button
              sx={{ width: { xs: "100%", sm: "40%", md: "25%" }, paddingX: "0px" }}
              variant="grey-contained"
              size="small"
              onClick={() => openModalSelectToken()}
            >
            {
              tokenToBridge != null ?
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Avatar sx={{ width: 24, height: 24, marginRight: "10px" }} alt={_get(tokenToBridge, "symbol", "token")} src={_get(tokenToBridge, "icon", "/x")} />
                  <Typography variant="h6" sx={{ color: "text.main", display: "block" }}>
                    {_get(tokenToBridge, "symbol", "Unrecognized")}
                  </Typography>
                </Box>
              :
                <Typography variant="h6" sx={{ color: "text.grey2" }}>
                  Select Token
                </Typography>
            }
            </Button>
          </Box>
          <Box>
            {
              tokenToBridge ?  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2", marginTop: "5px" }}>Balance: {balance}</Typography> : null
            }
          </Box>
        </Box>


        {
          tokenToBridge != null ? 
            <Box marginTop={"1.4em"} display={"flex"} justifyContent={"space-between"}>
              <Button
                variant="grey-contained"
                size="small"
                sx={{ height: "36px", width: { xs: "100%", sm: "50%" }, marginRight: "5px", paddingX: "0px" }}
                onClick={() => {
                  numberPattern(balance, onInput);
                }}
              >
                <Typography variant="h6" sx={{ color: "text.grey2" }}>
                  MAX
                </Typography>
              </Button>
              <Button
                sx={{ height: "36px", width: { xs: "100%", sm: "50%" }, marginRight: "5px", paddingX: "0px" }}
                variant="grey-contained"
                size="small"
                onClick={() => {
                  // numberPattern(balance, halfButtonClick);
                  numberPattern(balance, (b) => {
                    let fullAmount = koilibUtils.parseUnits(b, token.decimals);
                    let _amount = new BigNumber(fullAmount).dividedBy(2).toFixed(0, 1);
                    let value = koilibUtils.formatUnits(_amount, token.decimals);
                    onInput(value);
                  });
                }}
              >
                <Typography variant="h6" sx={{ color: "text.grey2" }}>
                  HALF
                </Typography>
              </Button>
            </Box>
          : null
        }


        
        <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px" }} alignItems={"center"} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>You will receive:</Typography>
            <Typography variant="h6" component={"span"}>0 {tokenToBridge != null ? _get(tokenToBridge, "symbol", "") : null}</Typography>
          </Box>
        </Box>


        { ActionLoad() }

      </CardContent>
    </Card>
  )
}

export default Bridge;