/* eslint-disable */
import moment from 'moment';
import { Box, Button, ButtonGroup, Card, CardContent, CardHeader, Chip, CircularProgress, InputBase, Link, styled, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import React, { Fragment, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { shortedAddress } from "../utils/display";
import { waitTransation } from "../utils/transactions";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_NAMES, BRIDGE_CHAINS_TYPES } from "../constants/chains";
import { BRIDGE_ROUTES_TYPES, getBridgeRoute, getBridgeContract } from "../constants/routes";
import { BRIDGE_TOKENS } from "../constants/tokens";

// helpers
import { EvmBridgeContract, EvmTokenContract, KoinosBridgeContract, KoinosTokenContract } from "../helpers/contracts";
import { WormholeTokenBridgeContract, getWormholeMessage, fetchSignedVaa, parseTransferVaa, fromWormholeAddress, wormholescanTx } from "../helpers/wormhole";

// Actions
import { setNetworkFrom, setNetworkTo } from "../redux/actions/bridge";
import { setModal, setModalData } from "../redux/actions/modals";

// hooks
import { useEthersSigner } from '../hooks/useSigner';
import { useEthersProvider } from '../hooks/useProvider';
import { useEvmNetwork, isSignerOnNetwork } from '../hooks/useEvmNetwork';

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
  const defaultProvider = useEthersProvider();
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
  const route = getBridgeRoute(fromChain, toChain);

  // the source transaction is read on the network of the from chain, the wallet can be on another evm network
  const fromProvider = useEthersProvider({ chainId: _get(fromChain, "evmChainId", undefined) });
  const provider = fromProvider || defaultProvider;
  // a wormhole transfer is marked as completed on the to chain
  const toProvider = useEthersProvider({ chainId: _get(toChain, "evmChainId", undefined) });
  const fromNetwork = useEvmNetwork(fromChain);
  const toNetwork = useEvmNetwork(toChain);

  // the polls of checkApi run in old closures, they read the current values from here
  const routeRef = useRef(route);
  routeRef.current = route;
  const checkerRef = useRef(null);
  const pollId = useRef(0);
  // failed tries of the wormhole check in a row, and tries to find the receipt of the source transaction
  const tries = useRef(0);
  const receiptTries = useRef(0);

  // states
  const [checker, setChecker] = useState(null);
  const [recover, setRecover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourceTX, setSourceTX] = useState("");
  const [blockchainTX, setblockchainTX] = useState(false);
  const [redeemSubmitted, setRedeemSubmitted] = useState(false);
  const [renewSubmitted, setRenewSubmitted] = useState(false);


  const actionClose = (snackbarId) => (
    <Fragment>
      <Button style={{ color: "white" }} onClick={() => { Snackbar.closeSnackbar(snackbarId) }}>
        Close
      </Button>
    </Fragment>
  );

  const hasEnoughSignatures = (recoverData) => {
    // a vaa only exists with the quorum of the guardians, the token bridge verifies it
    if (_get(recoverData, "wormhole", false)) return true;
    const requiredQuorum = import.meta.env.VITE_NUMBER_OF_VALIDATORS || 2;
    return _get(recoverData, "signatures", []).length >= requiredQuorum;
  }

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

  // nor the page: a wormhole transfer is polled for around 20 minutes
  useEffect(() => () => {
    pollId.current += 1;
    if (checkerRef.current) clearTimeout(checkerRef.current);
  }, []);

  // a poll of the validators must not survive a change of the networks
  // keep this effect before the one of sourceTX, in the same render the old polls die before a new one starts
  useEffect(() => {
    pollId.current += 1;
    if (checkerRef.current) {
      clearTimeout(checkerRef.current);
      checkerRef.current = null;
    }
    setRecover(null);
    setblockchainTX(false);
    setLoading(false);
    // another transfer can be redeemed without a reload of the page
    setRedeemSubmitted(false);
    setRenewSubmitted(false);
  }, [ fromChain, toChain ]);

  useEffect(() => {
    // the source transaction changed: the check of the old one must not fill in its result
    pollId.current += 1;
    if (checkerRef.current) {
      clearTimeout(checkerRef.current);
      checkerRef.current = null;
    }
    setRedeemSubmitted(false);
    setRenewSubmitted(false);
    setLoading(false);
    // also for an emptied field: nothing is checked anymore, the page must not look like it waits
    setRecover(null)
    setblockchainTX(null)
    if(sourceTX) {
      if(checker) {
        clearTimeout(checker);
      }
      startCheck(sourceTX)
    }
  }, [ sourceTX ]);


  const openModal = (side) => {
    dispatch(setModalData({ side: side }))
    dispatch(setModal("SelectBridgeNetwork"))
  }

  // wormhole route: the token bridge of the to chain verifies the signatures of the guardians and pays the recipient of the vaa
  const redeemWormhole = async () => {
    setLoading(true);
    if (loading || redeemSubmitted) return;
    try {
      if (!(await isSignerOnNetwork(signer, toNetwork.expected))) throw new Error("wrong network");
      let _tokenBridge = WormholeTokenBridgeContract(getBridgeContract(route, toChain), signer);
      // anyone can redeem a transfer, do not pay gas for one that is done
      if (await _tokenBridge.isTransferCompleted(_get(recover, "hash", ""))) {
        setRecover({ ...recover, status: "redeemed", completed: true });
        setLoading(false);
        return;
      }
      // the token bridge verifies the signatures of the guardians, a redeem that would revert is not sent to the wallet
      await _tokenBridge.callStatic.completeTransfer(_get(recover, "vaa", ""));
      const tx = await _tokenBridge.completeTransfer(_get(recover, "vaa", ""));
      Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
        variant: 'info',
        persist: false,
        action: actionClose,
      })
      await tx.wait()
      Snackbar.enqueueSnackbar(<Link underline="none" style={{ cursor: "pointer" }} target="_blank" href={`${toChain.explorer}/${tx.hash}`}><Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View Block</Typography></Link>, {
        variant: 'success',
        persist: false,
        action: actionClose,
      })
      setRedeemSubmitted(true);
      setRecover({ ...recover, status: "redeemed", completed: true });
      setLoading(false)
    } catch (error) {
      console.log(error)
      setLoading(false)
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction error</Typography></span>, {
        variant: 'error',
        persist: false,
        action: actionClose,
      })
    }
  }

  const redeem = async () => {
    // a vaa does not expire, the checks of the signatures of vortex below are not for it
    if (route == BRIDGE_ROUTES_TYPES.WORMHOLE) return redeemWormhole();
    // the validators of vortex only sign vortex routes
    if (route != BRIDGE_ROUTES_TYPES.VORTEX) return;
    setLoading(true);
    if (loading || redeemSubmitted) return; // Check redeemSubmitted state
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
      if (_get(toChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        // the address of the bridge is only the bridge on the network of the to chain
        if (!(await isSignerOnNetwork(signer, toNetwork.expected))) throw new Error("wrong network");
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
          setRedeemSubmitted(true);
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
          
          // For Koinos, we need to wait for the transaction to be confirmed
          // Using the same waitTransation function that works well in Bridge.jsx
          await waitTransation(providerKoin, transaction)
          
          Snackbar.enqueueSnackbar(<Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography>, {
            variant: 'success',
            persist: false,
            action: actionClose,
          })
          setRedeemSubmitted(true);
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

  const renewSignatures = async () => {
    if (route != BRIDGE_ROUTES_TYPES.VORTEX) return;
    setRenewSubmitted(true);
    if (loading || renewSubmitted) return; // Check redeemSubmitted state
    try {
      let _bridge = null;
      let _bridgeInfo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));

      // redeem
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.ETH) {
        if (!(await isSignerOnNetwork(signer, fromNetwork.expected))) throw new Error("wrong network");
        _bridge = await EvmBridgeContract(_bridgeInfo.bridgeAddress, signer);
        if (_bridge) {
          console.log("requestNewSignatures", _bridge)
          const tx = await _bridge.RequestNewSignatures(
            sourceTX,
          )
          Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
            variant: 'info',
            persist: false,
            action: actionClose,
          })
          await tx.wait()
          Snackbar.enqueueSnackbar(<Link underline="none" style={{ cursor: "pointer" }} target="_blank" href={`${fromChain.explorer}/${tx.id}`}><Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View Block</Typography></Link>, {
            variant: 'success',
            persist: false,
            action: actionClose,
          })
        }
      }
      if (_get(fromChain, "id", "") == BRIDGE_CHAINS_NAMES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        _bridge = await KoinosBridgeContract(_bridgeInfo.bridgeAddress, providerKoin, signerKoin);
        if (_bridge) {
          let { transaction } = await _bridge.functions.request_new_signatures({
            transactionId: sourceTX,
            operationId: _get(recover, "opId", ""),
          })
          
          Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
            variant: 'info',
            persist: false,
            action: actionClose,
          })
          
          // For Koinos, we need to wait for the transaction to be confirmed
          // Using the same waitTransation function that works well in Bridge.jsx
          await waitTransation(providerKoin, transaction)
          
          Snackbar.enqueueSnackbar(<Typography sx={{ color: "white" }} variant="h6">Transaction successful</Typography>, {
            variant: 'success',
            persist: false,
            action: actionClose,
          })
        }
      }
      startCheck(sourceTX, true)
    } catch (error) {
      console.log(error)
      setRenewSubmitted(false);
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

  // wormhole route: the message of the token bridge is in the receipt of the source transaction. The guardians sign it
  // after the finality of the from chain (around 20 minutes), then their api serves the vaa
  const checkWormhole = async (txIdParam, stale, retry) => {
    // an error that another try does not solve
    const fail = (message) => { let e = new Error(message); e.permanent = true; return e; }
    try {
      let _tokenBridgeFrom = getBridgeContract(BRIDGE_ROUTES_TYPES.WORMHOLE, fromChain);
      let _tokenBridgeTo = getBridgeContract(BRIDGE_ROUTES_TYPES.WORMHOLE, toChain);
      let _wormholeFrom = _get(fromChain, "wormhole.chainId", null);
      let _wormholeTo = _get(toChain, "wormhole.chainId", null);
      if (!_tokenBridgeFrom || !_tokenBridgeTo || _wormholeFrom == null || _wormholeTo == null || !provider || !toProvider) throw fail("the networks are not wormhole networks");

      // the rpc throws for anything else, that would look like a hiccup and be tried again
      if (!/^0x[0-9a-fA-F]{64}$/.test(String(txIdParam))) throw fail(`This is not a transaction hash of ${_get(fromChain, "name", "")}.`);
      let receipt = await provider.getTransactionReceipt(txIdParam);
      if (stale()) return;
      if (!receipt) {
        // a node can be some seconds behind for a transaction that was just sent, after that it is the wrong hash or network
        receiptTries.current += 1;
        if (receiptTries.current <= 4) {
          setLoading(false);
          retry(5000);
          return;
        }
        throw fail(`The transaction has not been found on ${_get(fromChain, "name", "")}. Check the source network, or wait a moment if you just sent it.`);
      }
      if (receipt.status != 1) throw fail("The source transaction failed, nothing was sent.");
      let core = await WormholeTokenBridgeContract(_tokenBridgeFrom, provider).wormhole();
      if (stale()) return;
      let message = getWormholeMessage(receipt, core, _tokenBridgeFrom);
      if (message == null) throw fail("There is no Wormhole token transfer in this transaction.");
      setblockchainTX(true);

      let vaa = await fetchSignedVaa(_wormholeFrom, _tokenBridgeFrom, message.sequence);
      if (stale()) return;
      if (!vaa) {
        // not signed yet, this is no error and takes as long as the finality of the from chain
        tries.current = 0;
        setLoading(false);
        retry(15000);
        return;
      }

      // the api is not trusted: the vaa must carry exactly the bytes the token bridge published in this transaction
      let transfer = null;
      try {
        transfer = parseTransferVaa(vaa);
      } catch (e) {
        throw fail("This is not a plain token transfer, it can not be redeemed here.");
      }
      let emitter = fromWormholeAddress(transfer.emitterAddress);
      if (transfer.emitterChain != _wormholeFrom || !emitter || emitter.toLowerCase() != _tokenBridgeFrom.toLowerCase() || transfer.sequence != message.sequence || transfer.payload.toLowerCase() != message.payload.toLowerCase()) throw fail("The signed message does not belong to this transaction.");
      if (transfer.toChain != _wormholeTo) throw fail(`This transfer does not go to ${_get(toChain, "name", "")}, select the network it was sent to.`);

      let completed = await WormholeTokenBridgeContract(_tokenBridgeTo, toProvider).isTransferCompleted(transfer.hash);
      if (stale()) return;

      // the token bridge is open to any token, the amount can only be shown for a token of BRIDGE_TOKENS:
      // the vaa names the token on its chain of origin and sends the amount with 8 decimals at most
      let _origin = BRIDGE_CHAINS.find(chain => _get(chain, "wormhole.chainId", null) == transfer.tokenChain);
      let _originAddress = fromWormholeAddress(transfer.tokenAddress);
      let _listed = null;
      if (_origin && _originAddress) {
        for (let token of BRIDGE_TOKENS) {
          let _networks = _get(token, "networks", []);
          let _net = _networks.find(n => n.chain == _origin.id && String(n.address).toLowerCase() == _originAddress.toLowerCase());
          let _netTo = _networks.find(n => n.chain == _get(toChain, "id", null));
          // listed means listed on the to chain too, the symbol comes from there
          if (_net && _netTo) _listed = { decimals: Math.min(8, _get(_net, "decimals", 8)), symbol: _get(_netTo, "symbol", "") };
        }
      }

      setRecover({
        wormhole: true,
        vaa,
        hash: transfer.hash,
        completed,
        status: completed ? "redeemed" : "signed",
        recipient: fromWormholeAddress(transfer.to) || transfer.to,
        amount: transfer.amount,
        token: _listed,
        signatures: transfer.signatures,
        blockNumber: receipt.blockNumber,
      });
      tries.current = 0;
      setLoading(false);
    } catch (error) {
      console.log(error);
      if (stale()) return;
      setLoading(false);
      // a hiccup of the rpc or the api, or a transaction that is still pending: try again, but not forever
      tries.current += 1;
      if (!_get(error, "permanent", false) && tries.current < 12) {
        retry(15000);
        return;
      }
      tries.current = 0;
      setblockchainTX(false);
      Snackbar.enqueueSnackbar(
        <span>
          <Typography variant="h6">Transfer not found</Typography>
          <Typography variant="body1" color="white">{error.message}</Typography>
        </span>,
        {
          variant: 'error',
          persist: false,
          action: actionClose,
        }
      );
    }
  }

  // a check started by the user or by a new source transaction replaces the running one and its scheduled retry
  const startCheck = (txIdParam, isRenew = false) => {
    pollId.current += 1;
    tries.current = 0;
    receiptTries.current = 0;
    if (checkerRef.current) {
      clearTimeout(checkerRef.current);
      checkerRef.current = null;
    }
    return checkApi(txIdParam, isRenew, true);
  }

  // force: a new check and the retries of a check. The value of loading in this closure is the one of an old render,
  // a retry must not stop on it. Two checks of one generation never run together, a retry is scheduled at the end of a check
  const checkApi = async (txIdParam = null, isRenew = false, force = false) => {
    if (routeRef.current == null) return;
    if (loading && !force) return;
    // this call belongs to the networks selected now, after a change of them it must stop
    const poll = pollId.current;
    const stale = () => poll != pollId.current;
    const retry = (ms = 3000) => {
      let _timer = setTimeout(() => { if (!stale()) checkApi(txIdParam, isRenew, true) }, ms);
      setChecker(_timer);
      checkerRef.current = _timer;
    }
    setLoading(true);
    // the api of the validators of vortex only knows vortex routes
    if (routeRef.current == BRIDGE_ROUTES_TYPES.WORMHOLE) return checkWormhole(txIdParam, stale, retry);
    let result = null;
    let existInBlockchain = false;
    let opIdKoinos = ""; // op id of transaction in koinos
    try {
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        let r = await provider.getTransactionReceipt(txIdParam);
        if (!r) throw new Error("no transaction");
        existInBlockchain = true;
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let r = await providerKoin.getTransactionsById([ txIdParam ]);
        if(_get(r, "transactions", []).length == 0) throw new Error("no transaction");
        
        // get op id
        const blockResult = await providerKoin.call('block_store.get_blocks_by_id', {
          block_ids: [_get(r, "transactions[0].containing_blocks[0]") ],
          return_block: false,
          return_receipt: true,
        })
        for (const receipt of _get(blockResult, 'block_items[0].receipt.transaction_receipts', [])) {
          if (receipt.id === txIdParam) {
            for (const event of receipt.events) {
              if (event.name === 'bridge.tokens_locked_event') {
                opIdKoinos = `${event.sequence}`
              }
            }
          }
        }

        //console.log(opIdKoinos)
        existInBlockchain = true;
      }
      if (stale()) return;
      setblockchainTX(existInBlockchain);
    } catch (e) {
      console.log(e);
      if (stale()) return;
      setLoading(false);
      setblockchainTX(existInBlockchain);
      Snackbar.enqueueSnackbar(
        <span>
          <Typography variant="h6">Transaction not found</Typography>
          <Typography variant="body1" color="white">The transaction has not been found on the blockchain.</Typography>
          <Typography variant="body1" color="white">Please wait up to 3 minutes and try again.</Typography>
        </span>,
        {
          variant: 'error',
          persist: false,
          action: actionClose,
        }
      );
      return;
    }
  
    if (checker) {
      clearTimeout(checker);
    }
    try {
      let bridge = new BrigeService();
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        result = await bridge.getEthTx(txIdParam ? txIdParam : sourceTX);
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        // Hacer dos consultas paralelas: una con opIdKoinos y otra con opIdKoinos + 1
        // Usar la primera que responda exitosamente
        const opIdCurrent = parseInt(opIdKoinos);
        const opIdNext = opIdCurrent + 1;
        
        try {
          // Intentar ambas consultas en paralelo y usar la primera que responda
          result = await Promise.any([
            bridge.getKoinTx(txIdParam ? txIdParam : sourceTX, opIdKoinos),
            bridge.getKoinTx(txIdParam ? txIdParam : sourceTX, opIdNext.toString())
          ]);
        } catch (raceError) {
          // Si ambas consultas paralelas fallan, no hacer un tercer intento
          // Dejar que el catch externo maneje el error y programe el reintento
          throw raceError;
        }
      }
    } catch (error) {
      result = null;
      console.log(error);
      if (stale()) return;
      retry();
      return;
    }
    if (stale()) return;

    if(isRenew) {
      const expirationRecover = parseInt(_get(result, "expiration", "0"));
      const expirationResult = parseInt(_get(recover, "expiration", "0"));
      if(expirationRecover == expirationResult) {
        setLoading(false);
        retry();
        return;
      }
    }

    if (!hasEnoughSignatures(result)) {
      setLoading(false);
      retry();
      return;
    }
    if(isRenew) {
      setRenewSubmitted(false);
    }
    setRecover(result);
    setLoading(false);
  };

  const BaseConnections = (props) => (
    <>
      {_get(props.base == "from" ? fromChain  : toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM ? <CustomEthConnectButton {...props} /> : null}
      {_get(props.base == "from" ? fromChain  : toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN ? <CustomKoinConnectButton {...props} /> : null}
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
    if (!hasEnoughSignatures(recover)) return true;
    if (redeemSubmitted) return true;
    // a wormhole transfer that is redeemed already, by the user or by anyone else
    if (_get(recover, "completed", false)) return true;
    return false;
  }
  const ActionsBase = () => {
    if (fromChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("from")}>SELECT SOURCE NETWORK</Button>
    )
    if (toChain == null) return (
      <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => openModal("to")}>SELECT REDEEM NETWORK</Button>
    )

    // no direct route between the networks
    if (route == null) return (
      <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", textAlign: "center" }}>
        <Typography variant="body1" sx={{ color: "text.grey1" }}>
          {`There is no direct route between ${_get(fromChain, "name", "")} and ${_get(toChain, "name", "")}.`}
        </Typography>
      </Box>
    )

    // conect wallet to chain
    if (checkChain(fromChain)) return (
      <Connectors chain={fromChain} />
    )

    // conect wallet to chain
    if (checkChain(toChain)) return (
      <Connectors chain={toChain} />
    )

    // wormhole route: the page polls by itself until the guardians signed, a button to recover has no use while it waits.
    // Without a running check (nothing found, or an error was shown) the button starts one
    if (route == BRIDGE_ROUTES_TYPES.WORMHOLE && !recover) return (
      <BaseConnections
        actions={
          blockchainTX ?
            <Button disabled variant="contained" size="large" sx={{ width: "100%" }}>WAITING FOR THE GUARDIANS</Button>
            :
            <Button disabled={loading || !sourceTX} variant="contained" size="large" onClick={() => startCheck(sourceTX)} sx={{ width: "100%" }}>{loading ? "CHECKING..." : "CHECK TRANSACTION"}</Button>
        }
      />
    )

    if (!recover || (recover && !hasEnoughSignatures(recover))) return (
      <BaseConnections
        actions={
          <Button disabled={loading} variant="contained" size="large" onClick={() => startCheck(sourceTX)} sx={{ width: "100%" }}>RECOVER</Button>
        }
      />
    )

    // check if the transaction has expired
    if (recover && _get(recover, "expiration")) {
      const expirationTime = parseInt(_get(recover, "expiration", "0"));
      const currentTime = Date.now();
      if (currentTime > expirationTime) {
        // new signatures are requested on the from chain
        if (fromNetwork.wrongNetwork) return (
          <BaseConnections
            actions={
              <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => fromNetwork.switchNetwork().catch((e) => console.log(e))}>SWITCH TO {_get(fromChain, "name", "")}</Button>
            }
          />
        );
        return (
          <BaseConnections
            actions={
              <Button disabled={loading || renewSubmitted} onClick={() => renewSignatures()} variant="contained" size="large" sx={{ width: "100%" }}>RENEW SIGNATURES</Button>
            }
          />
        );
      }
    }

    // the tokens are redeemed on the to chain
    if (toNetwork.wrongNetwork) return (
      <BaseConnections
        actions={
          <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => toNetwork.switchNetwork().catch((e) => console.log(e))}>SWITCH TO {_get(toChain, "name", "")}</Button>
        }
      />
    );

    return (
      <BaseConnections
        actions={
          <Button disabled={disabledButtonBridge()} onClick={() => redeem()} variant="contained" size="large" sx={{ width: "100%" }}>{_get(recover, "completed", false) ? "REDEEMED" : "REDEEM"}</Button>
        }
      />
    )
  }

  const isBridgePage = location.pathname === '/bridge';
  const isRedeemPage = location.pathname === '/redeem';

  const TabButton = styled(Button)(({ theme, active }) => ({
    width: '50%',
    backgroundColor: active ? theme.palette.primary.main : theme.palette.grey[700],
    color: active ? theme.palette.common.white : theme.palette.grey[300],
    position: 'relative',
    zIndex: active ? 1 : 0,
    borderRadius: !active ? '10px 0 0 10px' : '0 10px 10px 0',
    '&:before': {
      content: '""',
      position: 'absolute',
      right: active ? 'auto' : '-1px',
      left: active ? '0' : 'auto',
      top: '1px',
      transform: 'rotate(90deg)',
      width: '40px',
      height: '40px',
      borderStyle: 'solid',
      borderWidth: active ? '0 15px 15px 0' : '36px 41px 0 0',
      borderColor: active
        ? `${theme.palette.primary.main} transparent transparent transparent`
        : `${theme.palette.primary.main} transparent transparent transparent`,
      zIndex: active ? -1 : 1,
    },
    '&:hover': {
      backgroundColor: active ? theme.palette.primary.main : theme.palette.secondary.light,
    },
  }));

  return (
    <Box sx={{ paddingBottom: "100px" }}>
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
                  placeholder={
                    !fromChain ? 
                    "Select source network" : 
                    !toChain ? 
                    "Select redeem network" : 
                    checkChain(fromChain) ? 
                    "Please connect your wallet to continue" : 
                    checkChain(toChain) ? 
                    "Please connect your wallet to continue" : 
                    "Source TX ID Can Be Pasted here"
                  }
                  type={"text"}
                  disabled={(!fromChain || !toChain || checkChain(fromChain) || checkChain(toChain))}
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
              <Typography sx={{ marginTop: 2, marginX: "auto" }} variant="h5" component={"span"}>{route == BRIDGE_ROUTES_TYPES.WORMHOLE ? "the Wormhole guardians are signing your transfer" : "validators are verifying your transaction"}</Typography>
              <Typography sx={{ marginTop: 1, marginX: "auto", textAlign: "center" }} variant="p" component={"span"}>{route == BRIDGE_ROUTES_TYPES.WORMHOLE ? `they wait until ${_get(fromChain, "name", "")} has finalized it, around 20 minutes after the transaction. This page checks by itself, you can also leave and come back with the transaction hash` : "this can take up to 3 minutes"}</Typography>
              {route == BRIDGE_ROUTES_TYPES.WORMHOLE ?
                <Link sx={{ marginTop: 1, marginX: "auto" }} target="_blank" rel="noopener noreferrer" href={wormholescanTx(sourceTX)}>Follow the transfer on Wormholescan</Link>
                : null}
            </Box>
            : recover && !hasEnoughSignatures(recover) ?
              <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "20px", display: "flex", flexDirection: "column" }} marginY={"1.4em"}>
                <Box sx={{ marginX: "auto" }} >
                  <CircularProgress/>
                </Box>
                <Typography sx={{ marginTop: 2, marginX: "auto" }} variant="h5" component={"span"}>waiting for more signatures</Typography>
                <Typography sx={{ marginTop: 1, marginX: "auto" }} variant="p" component={"span"}>this can take up to 3 minutes</Typography>
              </Box>
            : null
          }

          {
            recover && blockchainTX && _get(recover, "wormhole", false) ?
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
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Amount:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "token", null) ? `${ethers.utils.formatUnits(_get(recover, "amount", "0"), _get(recover, "token.decimals", 8))} ${_get(recover, "token.symbol", "")}` : "token not listed here"}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Block Number:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "blockNumber", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Guardian signatures:</Typography>
                  <Typography variant="h6" component={"span"}>{_get(recover, "signatures", "")}</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                  <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Explorer:</Typography>
                  <Link target="_blank" rel="noopener noreferrer" href={wormholescanTx(sourceTX)}>Wormholescan</Link>
                </Box>
              </Box>
            : recover && blockchainTX ?
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
    </Box >
  )
}

export default Redeem;