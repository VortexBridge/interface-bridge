/* eslint-disable */
import React, { Fragment, useEffect, useState } from "react";
import { Avatar, Box, Button, ButtonGroup, Card, CardContent, CardHeader, Link, Stack, Divider, InputBase, Typography, useMediaQuery, styled, useTheme } from '@mui/material';
import { fetchBalance } from '@wagmi/core';
import { BigNumber } from "bignumber.js";
import { ethers } from 'ethers';
import { utils as koilibUtils, Transaction } from "koilib";
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useAccount, useConnect } from "wagmi";
import { shortedAddress } from "../utils/display";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_TYPES } from "../constants/chains";

// helpers
import { EvmBridgeContract, EvmTokenContract, KoinosBridgeContract, KoinosTokenContract } from "../helpers/contracts";

// Actions
import { setModal, setModalData } from "../redux/actions/modals";
import { setNetworkFrom, setNetworkTo } from "../redux/actions/bridge";

// utils
import { numberPattern } from "../utils/regex";
import { waitTransation } from "./../utils/transactions"

// hooks
import { useEthersSigner } from "../hooks/useSigner"
import { useEthersProvider } from "../hooks/useProvider"

// icons
import SwapVert from "@mui/icons-material/SwapVert";
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// components
import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import CustomKoinConnectButton from "../components/Bridge/CustomKoinConnectButton";
import SelectChain from "../components/SelectChain";
import { Rotate90DegreesCcw, TextRotateUp } from "@mui/icons-material";

const Bridge = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();
  const Snackbar = useSnackbar();
  const theme = useTheme();
  const matches = useMediaQuery(theme.breakpoints.up('md'));
  const account = useAccount()
  const navigate = useNavigate();
  const signer = useEthersSigner();
  const provider = useEthersProvider();

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);

  // variables
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  const tokenToBridge = _get(bridgeSelector, "token", null);

  // states
  const [balance, setBalance] = useState(0);
  const [relayer, setRelayer] = useState(null);
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

  const loadBlance = async () => {
    let _balance = 0;
    let _approve = false;
    let _token = null;
    setLoadingBalance(true);
    if (tokenToBridge == null) {
      setLoadingBalance(false);
      return;
    };
    setInputValue("0");
    let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && _get(account, 'isConnected', false)) {
      if(_network.native == true) {
        console.log("loading balance from native token in evm")
        let bal = await provider.getBalance(account.address)
        _balance = ethers.utils.formatEther(bal)
        _approve = bal.toString()
      } else {
        _token = await EvmTokenContract(_network.address, signer);        
        if (_token) {
          let bal = await _token.balanceOf(account.address);
          _balance = koilibUtils.formatUnits(bal.toString(), _get(_network, "decimals", 8))
          // approval
          let approve = await _token.allowance(account.address, _bridge.bridgeAddress)
          _approve = approve.toString();
        }
      }
    }
    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN && _get(walletSelector, "wallet", null)) {
      let providerKoin = _get(walletSelector, "provider", null);
      let signerKoin = _get(walletSelector, "signer", null);
      _token = await KoinosTokenContract(_network.address, providerKoin, signerKoin);
      if (_token) {
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

  useEffect(() => {
    loadBlance();
  }, [tokenToBridge, fromChain, _get(walletSelector, "wallet", null), _get(account, 'isConnected', false)]);


  useEffect(() => {
    let final = ""
    if(_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && _get(account, 'isConnected', false)) {
      final = _get(account, 'address', '')
    }
    if(_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN && _get(walletSelector, "connected", false)) {
      final = _get(walletSelector, "wallet[0].address", "");
    }
    setRecipient(final)
  }, [ toChain, _get(account, 'isConnected', false), _get(walletSelector, "connected", false) ])

  // reset if switch chains
  useEffect(() => {
    setRelayer(null)
  }, [ fromChain, toChain ])


  // SNACKBAR

  const actionClose = (snackbarId) => (
    <Fragment>
      <Button style={{ color: "white" }} onClick={() => { Snackbar.closeSnackbar(snackbarId) }}>
        Close
      </Button>
    </Fragment>
  );

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

  const calculateReceiveAmount = (value) => {
    // make sure value is a number
    if (isNaN(value)) {
      return 0;
    }
    if(value < 0) {
      return 0;
    }
    // calculate receive amount
    // we will want to subtract the fee here depending on the type of token, market price, etc
    return value;
  }

  const bridgeTokens = async () => {
    setLoadingBridge(true);
    if (loadingBridge) return;
    try {
      let _bridge = null;
      let _txhash = null;
      let _token = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      let _bridgeTo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(toChain, "id", null));
      let _bridgeFrom = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      let fullAmount = koilibUtils.parseUnits(inputValue, _get(_token, "decimals", 8));
      let fullPayment = koilibUtils.parseUnits(relayer ? _get(relayer, "payment") : "0", _get(_token, "decimals", 8));

      // bridge
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        let tx
        _bridge = await EvmBridgeContract(_bridgeFrom.bridgeAddress, signer);
        if (_token.native == true) {
          if (_bridge) {
            tx = await _bridge.wrapAndTransferETH(
              ethers.utils.parseEther(relayer ? _get(relayer, "payment") : "0"),
              (relayer ? _get(relayer, "address") : ""),
              recipient,
              "",
              _bridgeTo.chainId,
              { value: ethers.utils.parseEther(inputValue) }
            )
          }
        } else {
          if (_bridge) {
            tx = await _bridge.transferTokens(
              _token.address,
              fullAmount,
              fullPayment,
              (relayer ? _get(relayer, "address") : ""),
              recipient,
              "",
              _bridgeTo.chainId,
            )
          }
        }

        Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
          variant: 'info',
          persist: false,
          action: actionClose,
        })
        await tx.wait()
        _txhash = tx.hash;
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        let walletAddress = _get(walletSelector, "wallet[0].address", null);
        _bridge = await KoinosBridgeContract(_bridgeFrom.bridgeAddress, providerKoin, signerKoin);
        _bridge.options.onlyOperation = true;        
        if (_bridge) {
          let tx = new Transaction({ provider: providerKoin, signer: signerKoin })
          // create bridge
          let { operation } = await _bridge.functions.transfer_tokens({
            from: walletAddress,
            token: _token.address,
            amount: fullAmount,
            payment: relayer ? _get(relayer, "payment") : "0",
            relayer: relayer ? _get(relayer, "address") : "",
            recipient: recipient,
            metadata: "",
            toChain: _bridgeTo.chainId,
          })
          tx.pushOperation(operation)

          // sent transaction
          let transaction = null;
          try {
            const _transaction = await tx.send();
            transaction = _transaction
          } catch (error) {
            Snackbar.enqueueSnackbar("Error sending transaction", { variant: "error" });
            console.log(error)
            setLoadingBridge(false);
            return;
          }

          // console.log(transaction.id)
          Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
            variant: 'info',
            persist: false,
            action: actionClose,
          })
          _txhash = transaction.id;
          await waitTransation(providerKoin, transaction)
        }
      }
      setTxHash(_txhash);
      Snackbar.enqueueSnackbar(<Link underline="none" style={{ cursor: "pointer" }} target="_blank" href={`${fromChain.explorer}/${_txhash}`}><Typography sx={{ color: "white" }} variant="h6">Transaction success</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View Block</Typography></Link>, {
        variant: 'success',
        persist: false,
        action: actionClose,
      })

      setLoadingBridge(false)
      loadBlance()
    } catch (error) {
      console.log(error)
      setTxHash(null);
      setLoadingBridge(false)
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction error</Typography></span>, {
        variant: 'error',
        persist: false,
        action: actionClose,
      })
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
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        _token = await EvmTokenContract(_network.address, signer);
        const tx = await _token.approve(
          _bridge.bridgeAddress,
          ethers.constants.MaxUint256
        )
        Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
          variant: 'info',
          persist: false,
          action: actionClose,
        })
        await tx.wait();
        Snackbar.enqueueSnackbar(<Link underline="none" style={{ cursor: "pointer" }} target="_blank" href={`${fromChain.explorer}/${tx.id}`}><Typography sx={{ color: "white" }} variant="h6">Transaction success</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View Block</Typography></Link>, {
          variant: 'success',
          persist: false,
          action: actionClose,
        })
        setApproval(ethers.constants.MaxUint256);
        setLoadingApproval(false);
      }
    } catch (error) {
      setLoadingApproval(false);
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction error</Typography></span>, {
        variant: 'error',
        persist: false,
        action: actionClose,
      })
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

  const disabledButtonBridge = () => {
    if (loadingBridge) return true;
    if (inputValue == "" || inputValue == 0) return true;
    if (recipient == "" || recipient == null) return true;
    return false;
  }

  const BaseConnections = (props) => (
    <>
      {_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM ? <CustomEthConnectButton {...props} /> : null}
      {_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN ? <CustomKoinConnectButton {...props} /> : null}
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
  const ActionLoad = () => {
    // select network from
    if (fromChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT FROM NETWORK</Button>
    )
    // select network to
    if (toChain === null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT TO NETWORK</Button>
    )
    // conect wallet from chain
    if (checkChain(fromChain)) return (
      <Connectors chain={fromChain} />
    )
    // conect wallet to chain
    if (checkChain(toChain)) return (
      <Connectors chain={toChain} />
    )
    // select network token
    if (tokenToBridge == null) return (
      <BaseConnections
        actions={
          <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModalSelectToken()}>SELECT A TOKEN</Button>
        }
      />
    )

    // claim tokens
    if(txHash) return (
      <>
        <BaseConnections />
        <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => navigate(`/redeem?tx=${txHash}&network=${_get(toChain, "id", "")}`)}>CLAIM TOKENS</Button>
      </>
    )

    // check approval of tokens
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    let fullAmount = koilibUtils.parseUnits(inputValue, _get(_network, "decimals", 8));
    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && new BigNumber(approval).lt(fullAmount) || new BigNumber(fullAmount).isZero()) return (
      <BaseConnections
        actions={
          <Button disabled={loadingApproval || new BigNumber(fullAmount).isZero()} variant="contained" size="large" sx={{ width: "100%" }} onClick={() => approveTransfers()}>{loadingApproval ? "loading..." : "APPROVE TOKEN"}</Button>
        }
      />
    )

    // return button bridge
    return (
      <BaseConnections
        actions={
          <Button disabled={disabledButtonBridge()} onClick={() => bridgeTokens()} variant="contained" size="large" sx={{ width: "100%" }}>{loadingBridge ? "loading..." : "BRIDGE"}</Button>
        }
      />
    )
  }

  const RelayerLoad = () => {
    let _relayers = []
    _relayers.push(
      <Card
        key={"fee"}
        onClick={() => setRelayer(null)}
        variant="outlined"
        sx={{ backgroundColor: !relayer ? "background.primary" : "background.paper", maxWidth: "600px", marginX: "auto", marginBottom: "20px", borderRadius: "10px", padding: "15px 20px" }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography color={!relayer ? "white" : "text.main"} gutterBottom variant="h5" component="div">Manual</Typography>
          <Typography color={!relayer ? "white" : "text.main"} gutterBottom variant="h6" component="div">$0</Typography>
        </Stack>
        <Typography color={!relayer ? "white" : "text.main"} variant="body2">The user is responsible for claiming (redeeming) their tokens on the destination blockchain.</Typography>
      </Card>
    )

    let _token = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(toChain, "id", null));
    let listRelayers = _get(_token, "relayers", [])
    if(listRelayers.length) {
      listRelayers.map(rele => {
        let isRele = _get(rele, "id", null) == _get(relayer, "id", "")
        let _payment =  koilibUtils.formatUnits(_get(rele, "payment", "0"), _get(_token, "decimals", 8))
        _relayers.push(
          <Card
            key={_get(rele, "id", null)}
            onClick={() => setRelayer(rele)}
            variant="outlined"
            sx={{ backgroundColor: isRele ? "background.primary" : "background.paper", maxWidth: "600px", marginX: "auto", marginBottom: "20px", borderRadius: "10px", padding: "15px 20px" }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography color={isRele ? "white" : "text.main"} gutterBottom variant="h5" component="div">{ _get(rele, "name", "") }</Typography>
              <Typography color={isRele ? "white" : "text.main"} gutterBottom variant="h6" component="div">${ _payment }</Typography>
            </Stack>
            <Typography color={isRele ? "white" : "text.main"} variant="body2">{ _get(rele, "description", "") }</Typography>
          </Card>
        )
      })
    }
    return _relayers;
  }

  const findTokenSymbolForChain = (token, chain) => {
    if (!token || !chain) return '..';
    const network = token.networks.find(net => net.chain === chain);
    return network ? _get(network, 'symbol', 'Unrecognized') : 'Unrecognized';
  };



  const isBridgePage = location.pathname === '/bridge';
  const isRedeemPage = location.pathname === '/redeem';

  const TabButton = styled(Button)(({ theme, active }) => ({
    width: '50%',
    backgroundColor: active ? theme.palette.primary.main : theme.palette.grey[700],
    color: active ? theme.palette.common.white : theme.palette.grey[300],
    position: 'relative',
    zIndex: active ? 1 : 0,
    borderRadius: active ? '10px 0 0 10px' : '0 10px 10px 0',
    '&:before': {
      content: '""',
      position: 'absolute',
      right: active ? '0' : 'auto',
      left: active ? 'auto' : '-1px',
      top: '1px',
      transform: 'rotate(90deg)',
      width: '40px',
      height: '40px',
      borderStyle: 'solid',
      borderWidth: active ? '0 15px 15px 0' : '36px 40px 0 0',
      borderColor: active
        ? `${theme.palette.primary.main} transparent transparent transparent`
        : `transparent ${theme.palette.primary.main} transparent transparent`,
      zIndex: active ? -1 : 1,
    },
    '&:hover': {
      backgroundColor: active ? theme.palette.primary.main : theme.palette.secondary.light,
    },
  }));


  return (
    <Box>
    <Box sx={{ marginY: '5em', maxWidth: '427px', marginX: 'auto', display: 'flex', justifyContent: 'center' }}>
      <ButtonGroup variant="contained" aria-label="outlined primary button group" sx={{ width: '100%' }}>
        <TabButton
          active={isBridgePage ? 1 : 0}
          onClick={() => navigate('/bridge')}
        >
          Bridge
        </TabButton>
        <TabButton
          active={isRedeemPage ? 1 : 0}
          onClick={() => navigate('/redeem')}
        >
          Redeem
        </TabButton>
      </ButtonGroup>
    </Box>
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
            <Box sx={{ marginTop: "20px" }}>
              <Box onClick={() => swapNetworks()} sx={{ height: "40px", width: "40px", borderRadius: "10px", backgroundColor: "background.light", display: "flex", justifyContent: "space-around", alignItems: "center", "&:hover": { backgroundColor: "text.grey3", cursor: "pointer" } }}>
                {
                  matches ?
                    <SwapHorizIcon fontSize="large" sx={{ color: "text.grey2" }} />
                    :
                    <SwapVert fontSize="large" sx={{ color: "text.grey2" }} />
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
                sx={{ width: { xs: "100%", sm: "40%", md: "25%" } }}
                variant="grey-contained"
                size="small"
                onClick={() => openModalSelectToken()}
              >
                {
                  tokenToBridge != null ?
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                      <Avatar sx={{ width: 24, height: 24, marginRight: "10px" }} alt={_get(tokenToBridge, "symbol", "token")} src={_get(tokenToBridge, "icon", "/x")} />
                      <Typography variant="h6" sx={{ color: "text.main", display: "block" }}>
                        {findTokenSymbolForChain(tokenToBridge, fromChain?.id)}
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
                tokenToBridge ? <Typography variant="body1" component={"span"} sx={{ color: "text.grey2", marginTop: "5px" }}>Balance: {loadingBalance ? "loading..." : balance}</Typography> : null
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
              <Typography variant="h6" component={"span"}>{calculateReceiveAmount(inputValue)} {findTokenSymbolForChain(tokenToBridge, toChain?.id)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Receiving address:</Typography>
              <Typography variant="h6" component={"span"}>{recipient ? shortedAddress(recipient) : ".."}</Typography>
            </Box>
          </Box>

          {ActionLoad()}

        </CardContent>
      </Card>

      <Box sx={{ maxWidth: "600px", marginX: "auto", marginY: "2em" }}>
        {RelayerLoad()}
      </Box>
    </Box >
  )
}

export default Bridge;