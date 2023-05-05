/* eslint-disable */
import React, { useEffect, useState } from "react";
import { utils as koilibUtils } from "koilib";
import { useNavigate } from "react-router-dom";
import { get as _get } from "lodash";
import { ethers } from 'ethers'
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useTheme, Box, Button, InputBase, Card, CardContent, CardHeader, Typography, Avatar, useMediaQuery } from '@mui/material';
import { getAccount } from '@wagmi/core'
import { useProvider, useSigner } from "wagmi";
import { BigNumber } from "bignumber.js";
import { shortedAddress } from "./../utils/display";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_NAMES } from "./../constants/chains";

// helpers
import { KoinosTokenContract, EthereumTokenContract, EthereumBridgeContract, KoinosBridgeContract } from "./../helpers/contracts";

// Actions
import { setNetworkFrom, setNetworkTo } from "../redux/actions/bridge";
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
  const signer = useSigner()
  const provider = useProvider()
  const navigate = useNavigate();


  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);

  // variables
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  const tokenToBridge = _get(bridgeSelector, "token", null);

  // states
  const [balance, setBalance] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [inputValue, setInputValue] = useState("0");
  const [approval, setApproval] = useState("0");
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loadingBridge, setLoadingBridge] = useState(false);

  // efects
  useEffect(() => {
    dispatch(setModal("Disclaimer"))
  }, []);

  useEffect(() => {
    const loadBlance = async () => {
      let _balance = 0;
      let _approve = false;
      let _token = null;
      setLoadingBalance(true);
      if(tokenToBridge == null) {
        setLoadingBalance(false);
        return;
      };
      setInputValue("0");
      let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      if(_get(fromChain, "symbol", "") == "ETH" && _get(account, 'isConnected', false)) {
        _token = await EthereumTokenContract(_network.address, provider);
        if(_token) {
          let bal = await _token.balanceOf(account.address);
          _balance = koilibUtils.formatUnits(bal.toString(), _get(_network, "decimals", 8))
          // approval
          let approve = await _token.allowance(_network.address, _bridge.bridgeAddress)
          _approve = approve.toString();
        }
      }
      if(_get(fromChain, "symbol", "") == "KOIN" && _get(walletSelector, "wallet", null)) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        _token = await KoinosTokenContract(_network.address, providerKoin, signerKoin);
        if(_token) {
          let addressOwner = _get(walletSelector, "wallet[0].address", null);
          let bal = await _token.functions.balanceOf({ owner: addressOwner })
          _balance = koilibUtils.formatUnits(_get(bal, 'result.value', 0), _get(_network, "decimals", 8))
          // set automatic max approval
          _approve = ethers.constants.MaxUint256.toString();
        }
      }
      setBalance(_balance);
      setApproval(_approve);
      setLoadingBalance(false);
    }
    loadBlance();
  }, [ tokenToBridge, fromChain, _get(walletSelector, "wallet", null), _get(account, 'isConnected', false) ]);

  // functions
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
  const openModalSelectToken = () => {
    dispatch(setModal("SelectTokenToBridge"))
  }

  const bridgeTokens = async ()=> {
    setLoadingBridge(true);
    if(loadingBridge) return;
    try {
      let _bridge = null;
      let _txhash = null;
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      let _bridgeInfo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      // amount    
      let fullAmount = koilibUtils.parseUnits(inputValue, _get(_network, "decimals", 8));
  
      // bridge
      if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        _bridge = await EthereumBridgeContract(_bridgeInfo.bridgeAddress, signer.data);
        if(_bridge) {
          const tx = await _bridge.transferTokens(_network.address, fullAmount, recipient)
          await tx.wait()
          _txhash = tx.hash;
        }
      }
      if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN ) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        let walletAddress = _get(walletSelector, "wallet[0].address", null);
        _bridge = await KoinosBridgeContract(_bridgeInfo.bridgeAddress, providerKoin, signerKoin);
        if(_bridge) {
          let { transaction } = await _bridge.functions.transfer_tokens({
            from: walletAddress,
            token: _network.address,
            amount: fullAmount,
            recipient: recipient
          })
          console.log(transaction.id)
          await transaction.wait();
          _txhash = transaction.id;
        }
      }
      setTxHash(_txhash);
      setLoadingBridge(false)
    } catch (error) {
      console.log(error)
      setTxHash(null);
      setLoadingBridge(false)
      return;
    }
    
  }

  const approveTransfers = async () => {
    let _token = null;
    setLoadingApproval(true);
    if(loadingApproval) return;
    try {
      let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        console.log(signer)
        _token = await EthereumTokenContract(_network.address, signer.data);
        const tx = await _token.approve(
          _bridge.bridgeAddress,
          ethers.constants.MaxUint256
        )
        await tx.wait();
        setApproval(ethers.constants.MaxUint256.toString());
        setLoadingApproval(false);
      }
    } catch (error) {
      setLoadingApproval(false);
    }
  }

  const disabledButtonBridge = () => {
    if(loadingBridge) return true;
    if(inputValue == "" || inputValue == 0) return true;
    if(recipient == "" || recipient == null) return true;
    return false;
  }

  const BaseConnections = () => (
    <>
      { _get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH ? <CustomEthConnectButton /> : null }
      { _get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN ? <CustomKoinConnectButton /> : null }
    </>
  )
  const ActionLoad = () => {
    // select network from
    if(fromChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT FROM NETWORK</Button>
    )
    // select network to
    if(toChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT TO NETWORK</Button>
    )
    // conect from Ethereum
    if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH && !_get(account, 'isConnected', false)) return (
      <CustomEthConnectButton />
    )
    // conect from Koin
    if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN && !_get(walletSelector, "wallet", null)) return (
      <CustomKoinConnectButton />
    )
    // claim tokens
    if(txHash) return (
      <>
        <BaseConnections />
        <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => navigate(`/redeem?tx=${txHash}&network=${_get(toChain, "id", "")}`)}>CLAIM TOKENS</Button>
      </>
    )
    // select network token
    if(tokenToBridge == null) return (
      <>
        <BaseConnections />
        <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModalSelectToken()}>SELECT A TOKEN</Button>
      </>
    )
    // check approval of tokens
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    let fullAmount = koilibUtils.parseUnits(inputValue, _get(_network, "decimals", 8));
    if(_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH  && new BigNumber(approval).lt(fullAmount)) return (
      <>
        <BaseConnections />
        <Button disabled={loadingApproval} variant="contained" size="large" sx={{ width: "100%" }} onClick={() => approveTransfers()}>{loadingApproval ? "loading..." : "APPROVAL TOKEN"}</Button>
      </>
    )
    // return button bridge
    return (
      <>
        <BaseConnections />
        <Button disabled={disabledButtonBridge()} onClick={() => bridgeTokens()} variant="contained" size="large" sx={{ width: "100%" }}>{loadingBridge ? "loading..." : "BRIDGE"}</Button>
      </>
    )
  }

  return (
    <Card variant="outlined" sx={{ maxWidth: "600px", marginX: "auto", marginBottom: "20px", borderRadius: "10px", padding: "15px 20px" }}>
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
              tokenToBridge ?  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2", marginTop: "5px" }}>Balance: { loadingBalance ? "loading..." : balance}</Typography> : null
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
                disabled={loadingBalance}
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
                    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
                    let fullAmount = koilibUtils.parseUnits(b, _get(_network, "decimals", 8));
                    let _amount = new BigNumber(fullAmount).dividedBy(2).toFixed(0, 1);
                    let value = koilibUtils.formatUnits(_amount, _get(_network, "decimals", 8));
                    onInput(value);
                  });
                }}
                disabled={loadingBalance}
              >
                <Typography variant="h6" sx={{ color: "text.grey2" }}>
                  HALF
                </Typography>
              </Button>
            </Box>
          : null
        }

        <Box marginTop={"1em"}>
          <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>Receiving address</Typography>
          <Box paddingY={"6px"} paddingX={"10px"} borderRadius={"10px"} sx={{ backgroundColor: "background.light" }}>
            <Box sx={{ display: "flex", width: "100%" }}>
              <InputBase
                placeholder={""}
                type={"text"}
                value={recipient}
                sx={{ width: "100%", fontSize: "16px", color: "text.main" }}
                onChange={(e) => setRecipient(e.currentTarget.value)}
              />
            </Box>
          </Box>
        </Box>
        
        <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", display: "flex", alignContent: "center", flexDirection: "column" }} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>You will receive:</Typography>
            <Typography variant="h6" component={"span"}>0 {tokenToBridge != null ? _get(tokenToBridge, "symbol", "") : null}</Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Receiving address:</Typography>
            <Typography variant="h6" component={"span"}>{recipient ? shortedAddress(recipient) : "??"}</Typography>
          </Box>
        </Box>

        { ActionLoad() }

      </CardContent>
    </Card>
  )
}

export default Bridge;