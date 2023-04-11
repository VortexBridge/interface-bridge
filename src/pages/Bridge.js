/* eslint-disable */
import { BigNumber } from "bignumber.js";
import { Provider, utils as koilibUtils, Contract } from "koilib";
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme, Box, Button, InputBase, Card, CardContent, CardHeader, IconButton, Typography } from '@mui/material';

import useMediaQuery from '@mui/material/useMediaQuery';
// Actions
import { setNetworkFrom, setNetworkTo, setBalanceFrom } from "../redux/actions/bridge";
import { setModal, setModalData } from "../redux/actions/modals";
// utils
import { numberPattern } from "../utils/regex";
// contracts
// import { BridgeContract } from "./../helpers/contracts"
// constants
// import { CHAINS_IDS } from "./../constants/chains";
// import { CONFIG_BASE } from "./../constants/configs";

// icons
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import SwapVert from "@mui/icons-material/SwapVert";

import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import shortedAddress from "../utils/display";
import { CHAINS_IDS, BRIDGE_ASSETS } from "../constants/chains";
import { getAccount, fetchBalance, watchAccount, use } from '@wagmi/core'
import { useContractRead } from "wagmi";

const Bridge = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();
  const Snackbar = useSnackbar();

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);
  const settingsSelector = useSelector((state) => state.settings);
  // state
  const [inputValue, setInputValue] = useState("0")
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  // const balance = _get(bridgeSelector, "balance", null);
  // const localBalance, setLocalBalance
  const [balance, setBalance] = useState(0)
  // vars
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));

  let KoinContract = null
  let BridgeAssets = null
  const account = getAccount()

  // from
  // to
  // koinoskoincontract
  // koinosethcontract
  // ethereumkoincontract
  // ethereumethcontract
  // balancekoin
  // balanceeth
  // ethereumAddress
  const [ethereumAddress, setEthereumAddress] = useState(null)
  const [ethereumBalance, setEthereumBalance] = useState(null)
  // koinsAddress



  useEffect(() => {
    if (_get(walletSelector, "signer", null)) {
      KoinContract = new Contract({
        id: BRIDGE_ASSETS[settingsSelector.network].koin.koinosAddress,
        abi: koilibUtils.tokenAbi,
        provider: new Provider("https://harbinger-api.koinos.io")
      })
    }
    if (_get(settingsSelector, "network", null)) {
      BridgeAssets = BRIDGE_ASSETS[settingsSelector.network]
    }
  }, [settingsSelector])

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

  useEffect(() => {
    if (account.isConnected && fromChain != null) {
      setEthereumAddress(account.address)
      fetchBalance({
        address: account.address,
      }).then((data) => {
        console.log("data", data)
        setBalance(data.formatted)
      }).catch((e) => {
        console.log(e)
      })
    }
  }, [fromChain])


  // functions
  const loadBalance = async () => {
    let wallet = _get(walletSelector, "wallet", null);
    if (wallet && _get(fromChain, "symbol", null) == "KOIN") {
      try {
        let address = _get(wallet, "[0].address", "");
        let functions = KoinContract.functions;
        let { result } = await functions.balanceOf({ owner: address });
        let _amount = koilibUtils.formatUnits(result.value, 8);
        dispatch(setBalanceFrom(_amount))
      } catch (error) {
        console.log("error:", error)
      }
    } else {
      if (_get(fromChain, "symbol", null) == "ETH" && ethereumAddress != null) {

      } else {
        // dispatch(setBalanceFrom("loading..."))
      }
    }
  };

  useEffect(() => {
    loadBalance()
    console.log(ethereumAddress)
  }, [walletSelector, ethereumAddress])

  return (
    <Card variant="outlined" sx={{ maxWidth: "600px", marginX: "auto", borderRadius: "10px", padding: "15px 20px" }}>
      <CardHeader title="BRIDGE" sx={{ paddingBottom: "4px" }} />
      <CardContent>
        <Box marginY={".8em"} display={"flex"} justifyContent={"space-between"} alignItems={"center"} sx={{ flexDirection: { xs: "column", md: "row" } }}>
          <Box sx={{ maxWidth: { xs: "100%", md: "40%" }, width: "100%" }}>
            <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>From</Typography>
            <Box onClick={() => { openModal("from") }} sx={{ maxHeight: "52px", backgroundColor: "background.light", width: "100%", "&:hover": { backgroundColor: "text.grey1", cursor: "pointer" } }} borderRadius={"10px"} padding={"12px"}>
              <Box sx={{ display: "flex", justifyContent: "space-around", alignItems: "center", maxWidth: { xs: "140px", md: "100%" } }}>
                <Typography variant="h6">{fromChain == null ? "Select" : fromChain.name}</Typography>
                {
                  fromChain != null ?
                    <img src={fromChain.icon} width="24px" height="24px" sx={{ maxWidth: "24px", width: "24px", height: "24px", objectFit: "cover" }} />
                    : null
                }
                <KeyboardArrowDownIcon color="secondary" />
              </Box>
            </Box>
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
            <Box onClick={() => { openModal("to") }} sx={{ maxHeight: "52px", backgroundColor: "background.light", width: "100%", "&:hover": { backgroundColor: "text.grey1", cursor: "pointer" } }} borderRadius={"10px"} padding={"12px"}>
              <Box sx={{ display: "flex", justifyContent: "space-around", alignItems: "center", maxWidth: { xs: "140px", md: "100%" } }}><Typography variant="h6">{toChain == null ? "Select" : toChain.name}</Typography>
                {
                  toChain != null ?
                    <img src={toChain.icon} width="24px" height="24px" sx={{ maxWidth: "24px", width: "24px", height: "24px", objectFit: "cover" }} />
                    : null
                }
                <KeyboardArrowDownIcon color="secondary" />
              </Box>
            </Box>
          </Box>
        </Box>
        <Box paddingY={"10px"} paddingX={"15px"} marginTop={"1em"} borderRadius={"10px"} sx={{ backgroundColor: "background.light" }}>
          <Box>
            <Box display={"flex"} justifyContent={"space-between"} alignItems={"center"}>

              <InputBase placeholder={"0"} type={"text"} value={inputValue} sx={{ fontSize: "22px", color: "text.main" }} onChange={(e) => numberPattern(e.currentTarget.value, onInput)} />
              <Typography variant="h6" component={"span"} sx={{ color: "text.main" }}>{_get(fromChain, "symbol", "")}</Typography>
            </Box>

            <Box paddingY={"5px"}>
              <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Balance: {balance}</Typography>
            </Box>
          </Box>

        </Box>
        <Box marginTop={"1.4em"} display={"flex"} justifyContent={"space-between"}>
          <Button
            variant="grey-contained"
            size="small"
            sx={{ height: "36px", width: { xs: "100%", sm: "40%" }, marginRight: "5px", paddingX: "0px" }}
            onClick={() => {
              numberPattern(balance, onInput);
            }}
          >
            <Typography variant="h6" sx={{ color: "text.grey2" }}>
              MAX
            </Typography>
          </Button>
          <Button
            sx={{ height: "36px", width: { xs: "100%", sm: "40%" }, marginRight: "5px", paddingX: "0px" }}

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
        <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px" }} alignItems={"center"} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
          <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>You will receive:</Typography>
          <Typography variant="h6" component={"span"}>0 {_get(toChain, "symbol", "")}</Typography>
          {/* TODO ADD FEES ON DESTINATION */}
        </Box>
        {
          _get(fromChain, "symbol", "") == "ETH" ?
            <CustomEthConnectButton />
            : null
        }
        {
          _get(fromChain, "symbol", "") == "KOIN" ?
            !_get(walletSelector, "wallet", null) ?
              <Button variant="contained" sx={{ boxShadow: "0", width: "100%", borderRadius: "10px" }} onClick={() => dispatch(setModal("Connect"))}>
                Connect
              </Button>
              :

              <div>

                <div style={{ display: "flex", gap: 12 }}>
                  <Button
                    style={{ display: "flex", alignItems: "center" }}
                    type="button"
                  >
                    {fromChain !== null ?
                      <div
                        style={{
                          background: fromChain.icon,
                          width: 12,
                          height: 12,
                          borderRadius: 999,
                          overflow: "hidden",
                          marginRight: 4,
                        }}
                      >
                        {fromChain.icon && (
                          <img
                            alt={fromChain.name ?? "Chain icon"}
                            src={fromChain.icon}
                            style={{ width: 12, height: 12 }}
                          />
                        )}
                      </div>
                      : null}
                    {fromChain.name}
                  </Button>

                  <Button type="button">
                    {shortedAddress(_get(walletSelector, "wallet[0].address", ""))}
                    {balance
                      ? ` (${balance})`
                      : ""}
                  </Button>
                </div>

              </div>
            : null
        }
        {account.isConnected || (_get(walletSelector, "wallet", null) != null) ?
          <Button variant="contained" size="large" sx={{ width: "100%" }}>
            BRIDGE
          </Button>
          :
          null
        }
        {
          fromChain === null ?
            <Typography variant="body1">Choose Network</Typography>
            : null
        }
      </CardContent>
    </Card>
  )
}

export default Bridge;