/* eslint-disable */
import { Avatar, Box, Button, Card, CardContent, CardHeader, Chip, FormControl, InputBase, InputLabel, MenuItem, Select, Typography, useMediaQuery, useTheme } from '@mui/material';
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
  const [searchParams] = useSearchParams();
  const tx = searchParams.get('tx') == null ? "" : searchParams.get('tx');
  const network = searchParams.get('network');

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);

  // variables
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  const tokenToBridge = _get(bridgeSelector, "token", null);

  // states
  const [inputValue, setInputValue] = useState("0");
  const [approval, setApproval] = useState("0");
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loadingBridge, setLoadingBridge] = useState(false);
  const [sourceTX, setSourceTX] = useState(tx)


  // efects
  useEffect(() => {
    dispatch(setModal("Disclaimer"))
  }, []);

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

  const bridgeTokens = async () => {
    setLoadingBridge(true);
    if (loadingBridge) return;
    try {
      let _bridge = null;
      let _txhash = null;
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      let _bridgeInfo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      // amount    
      let fullAmount = koilibUtils.parseUnits(inputValue, _get(_network, "decimals", 8));

      // bridge
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        _bridge = await EthereumBridgeContract(_bridgeInfo.bridgeAddress, signer.data);
        if (_bridge) {
          const tx = await _bridge.transferTokens(_network.address, fullAmount, recipient)
          await tx.wait()
          _txhash = tx.hash;
        }
      }
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        let walletAddress = _get(walletSelector, "wallet[0].address", null);
        _bridge = await KoinosBridgeContract(_bridgeInfo.bridgeAddress, providerKoin, signerKoin);
        if (_bridge) {
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
    if (loadingApproval) return;
    try {
      let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
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

  const BaseConnections = () => (
    <>
      {_get(fromChain, "id", "") != BRIDGE_CHAINS_NAMES.ETH ? <CustomEthConnectButton /> : null}
      {_get(fromChain, "id", "") != BRIDGE_CHAINS_NAMES.KOIN ? <CustomKoinConnectButton /> : null}
    </>
  )

  const RecoverButton = ({ onClick }) => (
    <Button disabled={sourceTX ? false : true} variant={"contained"} sx={{ width: "100%" }} onClick={onClick}>Recover</Button>
  )

  const RecoverCall = () => {
    if(fromChain.name == "Koinos") {
      RecoverEthTX();
    } else {
      RecoverKoinTX();
    }
  }
  
  const RecoverEthTX = () => {
    
  }
  const RecoverKoinTX = () => {

  }

  return (
    <Box>
      <Box sx={{ marginY: "1em", maxWidth: "600px", marginX: "auto", display: "flex", justifyContent: "space-around", alignItems: "center" }}>
        <Button sx={{ height: "35px", padding: "3px" }} size={"small"} variant="outlined" onClick={() => navigate("/bridge")}>Bridge</Button>
        <Button sx={{ height: "35px", padding: "3px" }} size={"small"} variant="contained" onClick={() => navigate("/redeem")}>Redeem</Button>
      </Box>
      {
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
            <Box marginX={"auto"} marginTop={"1em"} display={"flex"} justifyContent={"space-around"} alignContent={"center"} >
              <BaseConnections />
            </Box>
            <Box marginTop={"1em"} display={"flex"} justifyContent={"space-around"} alignContent={"center"} >
              {
                fromChain.name.toLowerCase() == BRIDGE_CHAINS_NAMES.KOIN.toLowerCase() || fromChain.name.toLowerCase() == BRIDGE_CHAINS_NAMES.ETH.toLowerCase() && _get(account, 'isConnected', false) ?
                  <RecoverButton onClick={RecoverCall} />
                  :
                  null
              }
            </Box>
          </CardContent>
        </Card>
      }
    </Box >
  )
}

export default Redeem;