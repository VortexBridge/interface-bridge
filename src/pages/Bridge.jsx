/* eslint-disable */
import React, { Fragment, useEffect, useState } from "react";
import { Avatar, Box, Button, ButtonGroup, Card, CardContent, CardHeader, Link, Stack, Divider, InputBase, Typography, useMediaQuery, styled, useTheme } from '@mui/material';
import { fetchBalance } from '@wagmi/core';
import { BigNumber } from "bignumber.js";
import { ethers } from 'ethers';
import { utils as koilibUtils } from "koilib";
import { get as _get } from "lodash";
import { useSnackbar } from "notistack";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAccount, useConnect } from "wagmi";
import { shortedAddress } from "../utils/display";
import { recipientError as validateRecipient } from "../utils/recipient.mjs";

// constants
import { BRIDGE_CHAINS, BRIDGE_CHAINS_TYPES } from "../constants/chains";
import { BRIDGE_ROUTES_TYPES, getBridgeRoute, getBridgeContract, getHopRoute } from "../constants/routes";
import { BRIDGE_TOKENS, payoutSymbol } from "../constants/tokens";

// helpers
import { EvmTokenContract, KoinosTokenContract } from "../helpers/contracts";
import { WormholeTokenBridgeContract, WormholeCoreContract, toWormholeAddress, wormholeNonce } from "../helpers/wormhole";
import { vortex, koinosReader, VORTEX_EVM, KIND } from "../v2";
import { rememberTransfer, forgetTransfer } from "../v2/history";
import { rememberJourney, forgetJourney } from "../v2/journey";

// Actions
import { setModal, setModalData } from "../redux/actions/modals";
import { setNetworkFrom, setNetworkTo, setTokenToBridge } from "../redux/actions/bridge";

// utils
import { numberPattern } from "../utils/regex";
import { parseTokenAmount, limitDecimals } from "../utils/amount";

// hooks
import { useEthersSigner } from "../hooks/useSigner"
import { useEthersProvider } from "../hooks/useProvider"
import { useEvmNetwork, isSignerOnNetwork } from "../hooks/useEvmNetwork"

// icons
import SwapVert from "@mui/icons-material/SwapVert";
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';

// components
import CustomEthConnectButton from "../components/Bridge/CustomEthConnectButton";
import CustomKoinConnectButton from "../components/Bridge/CustomKoinConnectButton";
import CustomSolConnectButton from "../components/Bridge/CustomSolConnectButton";
import CustomConnectInfo from "../components/Bridge/CustomConnectInfo";
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
  const defaultProvider = useEthersProvider();

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const walletSelector = useSelector(state => state.wallet);

  // variables
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);
  const tokenToBridge = _get(bridgeSelector, "token", null);
  const route = getBridgeRoute(fromChain, toChain);
  // no direct route: two steps through Ethereum (Base / Solana <-> Ethereum <-> Koinos)
  const hop = getHopRoute(fromChain, toChain, BRIDGE_CHAINS);
  const [searchParams] = useSearchParams();

  // reads go to the network of the from chain, the wallet can be on another evm network
  const fromProvider = useEthersProvider({ chainId: _get(fromChain, "evmChainId", undefined) });
  const provider = fromProvider || defaultProvider;
  const fromNetwork = useEvmNetwork(fromChain);

  // states
  const [balance, setBalance] = useState(0);
  const [recipient, setRecipient] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [inputValue, setInputValue] = useState("0");
  const [approval, setApproval] = useState("0");
  // no approval step: native ETH, wrapped tokens the bridge burns, and Koinos (approve + deposit are one transaction)
  const [approvalFree, setApprovalFree] = useState(false);
  // Vortex state read from both bridges: paused or not (issue #53)
  const [vortexPaused, setVortexPaused] = useState(null);
  const vortexEvmProvider = useEthersProvider({ chainId: _get(VORTEX_EVM, "evmChainId", undefined) });
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [loadingBridge, setLoadingBridge] = useState(false);
  // step 1 of a two-step transfer: { from, via, to } (to = the final chain object) while it is being sent
  const [hopFinal, setHopFinal] = useState(null);
  const recipientError = route === BRIDGE_ROUTES_TYPES.VORTEX
    ? validateRecipient(recipient, _get(toChain, "chainType", ""), _get(toChain, "bridgeAddress", "")) : "";

  // efects
  useEffect(() => {
    dispatch(setModal("Disclaimer"))
  }, []);

  // step 2 of a two-step transfer comes from the Redeem page as a link: networks, token and amount prefilled.
  // Only a direct route is accepted; the user checks everything and signs as usual.
  useEffect(() => {
    let _from = BRIDGE_CHAINS.find(c => c.id == searchParams.get("from"));
    let _to = BRIDGE_CHAINS.find(c => c.id == searchParams.get("to"));
    let _token = BRIDGE_TOKENS.find(t => t.id == searchParams.get("token"));
    if (!_from || !_to || !_token || !getBridgeRoute(_from, _to)) return;
    dispatch(setNetworkFrom(_from));
    dispatch(setNetworkTo(_to));
    dispatch(setTokenToBridge(_token));
    let _amount = String(searchParams.get("amount") || "");
    if (/^\d{1,18}(\.\d{1,18})?$/.test(_amount)) setInputValue(_amount);
  }, []);

  // step 1 of a two-step transfer: only a token that also exists on the final network
  useEffect(() => {
    if (!hopFinal || !tokenToBridge) return;
    if (!_get(tokenToBridge, "networks", []).find(net => _get(net, "chain", "") == _get(hopFinal, "to.id", null))) {
      dispatch(setTokenToBridge(null));
      Snackbar.enqueueSnackbar(<Typography variant="h6">{`This token does not exist on ${_get(hopFinal, "to.name", "")}`}</Typography>, { variant: 'info', persist: false });
    }
  }, [ hopFinal, tokenToBridge ]);

  // a started two-step transfer ends when other networks are picked
  useEffect(() => {
    if (hopFinal && (_get(fromChain, "id", null) != hopFinal.from || _get(toChain, "id", null) != hopFinal.via)) setHopFinal(null);
  }, [fromChain, toChain]);

  const loadBlance = async () => {
    let _balance = 0;
    let _approve = false;
    let _free = false;
    let _token = null;
    setLoadingBalance(true);
    setApprovalFree(false);
    if (tokenToBridge == null) {
      setLoadingBalance(false);
      return;
    };
    let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    // the contract that takes the tokens depends on the route, vortex bridge or wormhole token bridge
    let _spender = getBridgeContract(route, _bridge);
    // without a route there is nothing to load, the token may also not exist on the from network
    if (route == null || !_network || !_spender) {
      setBalance(0);
      setApproval("0");
      setLoadingBalance(false);
      return;
    }
    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && _get(account, 'isConnected', false)) {
      if(_network.native == true) {
        console.log("loading balance from native token in evm")
        let bal = await provider.getBalance(account.address)
        _balance = ethers.utils.formatEther(bal)
        _approve = bal.toString()
        _free = true
      } else {
        _token = await EvmTokenContract(_network.address, provider);
        if (_token) {
          let bal = await _token.balanceOf(account.address);
          _balance = koilibUtils.formatUnits(bal.toString(), _get(_network, "decimals", 8))
          // approval
          let approve = await _token.allowance(account.address, _spender)
          _approve = approve.toString();
          // a wrapped token (vKOIN) is burned by the bridge, it needs no approval
          if (route == BRIDGE_ROUTES_TYPES.VORTEX && vortex) _free = (await vortex.ethTokenInfo(provider, _network.address)).kind == KIND.WRAPPED;
        }
      }
    }

    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA && _get(walletSelector, "solana", null)) {
      let sol = await import("../helpers/solana.mjs");
      let bal = await sol.solanaTokenBalance(_network.address, _get(walletSelector, "solana.address", ""));
      _balance = koilibUtils.formatUnits(bal, _get(_network, "decimals", 8))
      // the transfer transaction carries its own approval of the exact amount
      _free = true
    }

    if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN && _get(walletSelector, "wallet", null)) {
      let providerKoin = _get(walletSelector, "provider", null);
      let signerKoin = _get(walletSelector, "signer", null);
      _token = await KoinosTokenContract(_network.address, providerKoin, signerKoin);
      if (_token) {
        let addressOwner = _get(walletSelector, "wallet[0].address", null);
        let bal = await _token.functions.balanceOf({ owner: addressOwner })
        _balance = koilibUtils.formatUnits(_get(bal, 'result.value', 0), _get(_network, "decimals", 8))
        // the approval of the exact amount is part of the deposit transaction
        _free = true
      }
    }
    setBalance(_balance);
    setApproval(_approve);
    setApprovalFree(_free);
    setLoadingBalance(false);
  }

  useEffect(() => {
    loadBlance();
  }, [tokenToBridge, fromChain, toChain, _get(walletSelector, "wallet", null), _get(walletSelector, "solana.address", null), _get(account, 'isConnected', false), _get(account, 'address', null)]);

  // drop the selected token if it can not be bridged between the selected networks
  useEffect(() => {
    if (tokenToBridge == null || fromChain == null || toChain == null) return;
    let _networks = _get(tokenToBridge, "networks", []);
    let inFrom = _networks.find(net => _get(net, "chain", "") == _get(fromChain, "id", null));
    let inTo = _networks.find(net => _get(net, "chain", "") == _get(toChain, "id", null));
    if (route == null || !inFrom || !inTo) {
      dispatch(setTokenToBridge(null))
    }
  }, [ tokenToBridge, fromChain, toChain ])


  // address of the wallet of the to chain, the wallet of the from chain must not reset a typed recipient
  let toWalletAddress = ""
  if(_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM && _get(account, 'isConnected', false)) {
    toWalletAddress = _get(account, 'address', '')
  }
  if(_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN && _get(walletSelector, "connected", false)) {
    toWalletAddress = _get(walletSelector, "wallet[0].address", "");
  }
  if(_get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA && _get(walletSelector, "solana", null)) {
    toWalletAddress = _get(walletSelector, "solana.address", "");
  }

  useEffect(() => {
    setRecipient(toWalletAddress)
  }, [ toChain, toWalletAddress ])

  // the Vortex route is closed while a bridge is paused (read from the chains, issue #53)
  // the Vortex route is used directly, or as one leg of a two-step transfer
  const usesVortex = route == BRIDGE_ROUTES_TYPES.VORTEX || _get(hop, "first", null) == BRIDGE_ROUTES_TYPES.VORTEX || _get(hop, "second", null) == BRIDGE_ROUTES_TYPES.VORTEX || _get(hopFinal, "second", null) == BRIDGE_ROUTES_TYPES.VORTEX;
  useEffect(() => {
    setVortexPaused(null);
    if (!usesVortex || !vortex || !vortexEvmProvider) return;
    let live = true;
    vortex.paused({ ethProvider: vortexEvmProvider, koinosProvider: koinosReader })
      .then((p) => { if (live) setVortexPaused(p.eth === false && p.koinos === false ? false : true); })
      .catch((e) => { console.log(e); if (live) setVortexPaused("error"); });
    return () => { live = false; };
  }, [ route, usesVortex, vortexEvmProvider ])


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
    // no more decimals than the bridge can carry: it counts in 8 decimals, and the destination token may have fewer
    // (USDT/USDC on Ethereum: 6) — an amount with more decimals would be refused later anyway
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    let _to = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(toChain, "id", null));
    let _decimals = Math.min(_get(_network, "decimals", 8), _get(_to, "decimals", 8), 8);
    setInputValue(_network ? limitDecimals(value, _decimals) : value)
  }
  const openModalSelectToken = () => {
    dispatch(setModal("SelectTokenToBridge"))
  }

  const calculateReceiveAmount = (value, receiveChainSymbol) => {
    // if no receiving chain, return empty string instead of a 0
    if(receiveChainSymbol === "..") {
      return "";
    }
    // make sure value is a number
    if (isNaN(value)) {
      return 0;
    }
    if(value <= 0) {
      return 0;
    }
    // calculate receive amount
    // we will want to subtract the fee here depending on the type of token, market price, etc
    return value;
  }

  // the wallet is asked to sign: say so until it answers (issue #59, WalletConnect users look at their phone)
  // right before a wallet prompt: BOTH bridges must be live (a deposit towards a paused bridge could not be claimed)
  const checkNotPaused = async () => {
    const p = await vortex.paused({ ethProvider: vortexEvmProvider, koinosProvider: koinosReader });
    if (p.eth || p.koinos) { setVortexPaused(true); throw new Error("the bridge is paused, please try again later"); }
  }

  // step 1 of a two-step transfer whose step 2 is the Vortex route (Base/Solana -> Ethereum -> Koinos): right before
  // step 1 is signed, step 2 must be possible — both bridges live, the token enabled on both sides, the amount within
  // the maximum deposit and within the Koinos payout cap (what is free now: the cap refills, but may not in time)
  const checkSecondLeg = async (amount8) => {
    if (_get(hopFinal, "second", null) != BRIDGE_ROUTES_TYPES.VORTEX) return;
    if (!vortex || !vortexEvmProvider) throw new Error("the Vortex bridge is not live yet: step 2 would not be possible");
    await checkNotPaused();
    let _viaToken = _get(tokenToBridge, "networks", []).find(net => _get(net, "chain", "") == _get(hopFinal, "via", null));
    let info = _viaToken ? await vortex.ethTokenInfo(vortexEvmProvider, _viaToken.address) : null;
    if (!info || !info.enabled || !info.partner) throw new Error("this token is not enabled on the Vortex bridge: step 2 would not be possible");
    if (BigInt(amount8) > info.maxDeposit8) throw new Error("the amount is above the Vortex bridge's maximum deposit: step 2 would not be possible");
    let [koinosSide, limit] = await Promise.all([vortex.koinosTokenInfo(koinosReader, info.partner), vortex.koinosLimit(koinosReader, info.partner)]);
    if (!koinosSide.enabled) throw new Error("this token is not enabled on Koinos: step 2 would not be possible");
    if (BigInt(amount8) > limit.available8) throw new Error("the amount is above what the Koinos bridge can pay out today: step 2 would not be possible");
  }

  const walletPrompt = () => Snackbar.enqueueSnackbar(<Typography variant="h6">Confirm the transaction in your wallet</Typography>, {
    variant: 'info',
    persist: true,
  })

  const bridgeTokens = async () => {
    setLoadingBridge(true);
    if (loadingBridge) return;
    let prompt = null;
    // false while a sent Koinos deposit is not seen in a block yet: then no "success" is shown
    let confirmed = true;
    try {
      let _txhash = null;
      if (recipientError) throw new Error(recipientError);
      let _token = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      let _bridgeTo = BRIDGE_CHAINS.find(bridge => bridge.id == _get(toChain, "id", null));
      let _bridgeFrom = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      let fullAmount = parseTokenAmount(inputValue, _get(_token, "decimals", 8));
      if (fullAmount == null || fullAmount == "0") throw new Error("invalid amount");
      if (route != BRIDGE_ROUTES_TYPES.VORTEX && route != BRIDGE_ROUTES_TYPES.WORMHOLE) throw new Error("no route");
      if (route == BRIDGE_ROUTES_TYPES.VORTEX && !vortex) throw new Error("the Vortex bridge is under maintenance");
      // step 1 of a two-step transfer always goes to the user's own wallet on the middle network
      if (hopFinal && (!toWalletAddress || String(recipient).toLowerCase() != String(toWalletAddress).toLowerCase())) throw new Error("step 1 must go to your own wallet");
      if (hopFinal && !_get(tokenToBridge, "networks", []).find(net => _get(net, "chain", "") == _get(hopFinal, "to.id", null))) throw new Error(`the token does not exist on ${_get(hopFinal, "to.name", "")}`);
      // (8 decimals: the tokens of the two-step routes are vKOIN, 8 decimals on every network)
      if (hopFinal) await checkSecondLeg(parseTokenAmount(inputValue, 8));
      // a sent transfer is kept at once (even if the confirmation fails or the page is closed, it is under Redeem ->
      // your transfers); one that is known to have failed is removed again
      const keep = (hash) => {
        rememberTransfer({ tx: hash, from: _get(fromChain, "id", ""), to: _get(toChain, "id", "") });
        if (hopFinal) rememberJourney({ tx: hash, via: hopFinal.via, to: _get(hopFinal, "to.id", ""), token: _get(tokenToBridge, "id", ""), amount: inputValue });
      };
      const forget = (hash) => { forgetTransfer(hash); forgetJourney(hash); };

      // bridge
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM) {
        let tx
        // the address of the bridge is only the bridge on the network of the from chain
        if (!(await isSignerOnNetwork(signer, fromNetwork.expected))) throw new Error("wrong network");
        if (route == BRIDGE_ROUTES_TYPES.WORMHOLE) {
          // wormhole token bridge (portal): the guardians sign the transfer, the user redeems it on the to chain
          let _wormholeTo = _get(_bridgeTo, "wormhole.chainId", null);
          if (_wormholeTo == null) throw new Error("the to chain is not a wormhole chain");
          if (_token.native == true) throw new Error("native tokens are not wired for wormhole routes");
          let _tokenBridge = WormholeTokenBridgeContract(getBridgeContract(route, _bridgeFrom), signer);
          let _core = WormholeCoreContract(await _tokenBridge.wormhole(), provider);
          let messageFee = await _core.messageFee();
          // to Solana: the recipient's token account for the vKOIN mint there (checked before the wallet is asked)
          let _recipient32 = null;
          if (_get(_bridgeTo, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA) {
            let _mintTo = _get(tokenToBridge, "networks", []).find(net => _get(net, "chain", "") == _get(_bridgeTo, "id", null));
            if (!_mintTo) throw new Error("the token does not exist on Solana");
            let sol = await import("../helpers/solana.mjs");
            await sol.checkSolanaWallet(recipient);
            _recipient32 = sol.solanaRecipient32(_mintTo.address, recipient);
          } else {
            _recipient32 = toWormholeAddress(recipient);
          }
          prompt = walletPrompt();
          tx = await _tokenBridge.transferTokens(
            _token.address,
            fullAmount,
            _wormholeTo,
            _recipient32,
            0, // no fee for a relayer, the user redeems
            wormholeNonce(),
            { value: messageFee }
          )
        }
        if (route == BRIDGE_ROUTES_TYPES.VORTEX) {
          // checks the recipient, the amount (exact, <= max deposit), the token and the pause BEFORE the wallet is asked
          let args = { signer, token: _token.address, amount: fullAmount, recipient, native: _token.native == true, pageDecimals: _get(_token, "decimals", 8),
            // last step before the wallet is asked: both bridges must be live
            beforeSend: async () => { await checkNotPaused(); prompt = walletPrompt(); } };
          tx = await vortex.depositFromEth(args);
        }
        _txhash = tx.hash;
        keep(_txhash);
        Snackbar.closeSnackbar(prompt);
        prompt = null;
        Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
          variant: 'info',
          persist: false,
          action: actionClose,
        })
        try {
          await tx.wait()
        } catch (e) {
          let replacement = _get(e, "replacement.hash", null);
          if (replacement && !_get(e, "cancelled", false) && _get(e, "receipt.status", 0) == 1) {
            // the same transfer, re-sent by the wallet with another fee and confirmed: the new transaction is the transfer
            forget(_txhash);
            _txhash = replacement;
            keep(_txhash);
          } else if (replacement || _get(e, "code", "") == "CALL_EXCEPTION") {
            // reverted, cancelled, or replaced by a transaction that does something else: it really failed
            forget(_txhash);
            throw e;
          } else {
            // sent but not confirmed: shown like a sent transfer (never "try again" — that would send it twice)
            confirmed = false;
            Snackbar.enqueueSnackbar(<Typography variant="h6">Sent, not confirmed yet. Do not send it again: you find it under Redeem, "your transfers".</Typography>, {
              variant: 'info',
              persist: true,
              action: actionClose,
            })
          }
        }
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA) {
        if (route != BRIDGE_ROUTES_TYPES.WORMHOLE || _get(_bridgeTo, "wormhole.chainId", null) != 2) throw new Error("no route");
        let sol = await import("../helpers/solana.mjs");
        try {
          let sent = await sol.sendFromSolana({ chain: _bridgeFrom, mint: _token.address, amount: fullAmount, recipientEvm: recipient,
            onPrompt: () => { prompt = walletPrompt(); },
            // kept at once: even if the confirmation fails, the transfer is under Redeem -> your transfers
            onSubmitted: keep });
          _txhash = sent.signature;
        } catch (e) {
          if (!_get(e, "submitted", null)) throw e;
          // sent but not confirmed: shown like a sent transfer (never "try again" — that would send it twice)
          _txhash = e.submitted;
          confirmed = false;
          Snackbar.enqueueSnackbar(<Typography variant="h6">Sent, not confirmed yet. Do not send it again: you find it under Redeem, "your transfers".</Typography>, {
            variant: 'info',
            persist: true,
            action: actionClose,
          })
        }
        Snackbar.closeSnackbar(prompt);
        prompt = null;
      }
      if (_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN) {
        let providerKoin = _get(walletSelector, "provider", null);
        let signerKoin = _get(walletSelector, "signer", null);
        let walletAddress = _get(walletSelector, "wallet[0].address", null);
        if (route != BRIDGE_ROUTES_TYPES.VORTEX) throw new Error("no route");
        // Koinos tokens of the bridge have 8 decimals: the amount is the amount the bridge counts
        if (_get(_token, "decimals", 8) != 8) throw new Error("unsupported token");
        // ONE transaction: approve the exact amount + deposit. Checked before the wallet is asked
        confirmed = false;
        // Kondor only signs, the page sends: the id is kept BEFORE the transaction is sent (WalletConnect signs and sends)
        let viaWalletConnect = _get(walletSelector, "wallet[0].name", "") == "walletconnect" && !!_get(walletSelector, "wallet[0].object", null);
        let walletAsked = false;
        let args = { provider: providerKoin, signer: signerKoin, from: walletAddress, token: _token.address, amount8: BigInt(fullAmount), recipient,
          beforeSend: async () => { await checkNotPaused(); prompt = walletPrompt(); walletAsked = true; },
          onSigned: viaWalletConnect ? undefined : (id) => { _txhash = id; keep(id); } };
        try {
          _txhash = await vortex.depositFromKoinos(args);
        } catch (e) {
          // WalletConnect signs AND sends inside the wallet: without an answer (other than a refusal) the deposit may have
          // been sent while the page does not know its id — never offer a blind second try
          if (viaWalletConnect && walletAsked && !/reject|denied|cancel/i.test(String(_get(e, "message", "")))) e.unknownSend = true;
          // (Kondor) the node refused it or the wallet did not sign: nothing was sent
          if (!_get(e, "submitted", null)) { if (_txhash) forget(_txhash); throw e; }
          // no answer from the node: it may have arrived — the wait below finds out (never "try again")
          _txhash = e.submitted;
        }
        Snackbar.closeSnackbar(prompt);
        prompt = null;
        keep(_txhash);
        Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
          variant: 'info',
          persist: false,
          action: actionClose,
        })
        // success only once it is in a main-chain block and did not revert
        try {
          await vortex.waitKoinosTx(koinosReader, _txhash)
          confirmed = true;
        } catch (e) {
          if (_get(e, "permanent", false)) { forget(_txhash); throw e; }
          // sent, but not seen in a block yet: nothing is lost, the Redeem page picks it up (never "try again")
          Snackbar.enqueueSnackbar(<Typography variant="h6">Sent, not confirmed yet. Do not send it again: you find it under Redeem, "your transfers".</Typography>, {
            variant: 'info',
            persist: true,
            action: actionClose,
          })
        }
      }
      setTxHash(_txhash);
      if (confirmed) Snackbar.enqueueSnackbar(<Link underline="none" component={fromChain.explorer ? "a" : "span"} style={{ cursor: "pointer" }} target="_blank" rel="noopener noreferrer" href={fromChain.explorer ? `${fromChain.explorer}/${_txhash}` : undefined}><Typography sx={{ color: "white" }} variant="h6">Transaction success</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View on the explorer</Typography></Link>, {
        variant: 'success',
        persist: false,
        action: actionClose,
      })

      setLoadingBridge(false)
      loadBlance()
    } catch (error) {
      console.log(error)
      if (prompt) Snackbar.closeSnackbar(prompt);
      setTxHash(null);
      setLoadingBridge(false)
      if (_get(error, "unknownSend", false)) {
        Snackbar.enqueueSnackbar(<Typography variant="h6">No answer from your wallet: the transfer may have been sent. Check your wallet's activity (or your account on the explorer) before you try again.</Typography>, {
          variant: 'warning',
          persist: true,
          action: actionClose,
        })
        return;
      }
      Snackbar.enqueueSnackbar(<span><Typography variant="h6">Transaction error</Typography><Typography variant="body1" color="white">{String(_get(error, "reason", "") || _get(error, "message", "")).slice(0, 160)}</Typography></span>, {
        variant: 'error',
        persist: false,
        action: actionClose,
      })
      return;
    }

  }

  // approve EXACTLY the amount that is sent, never more (both routes). Only evm tokens that the bridge locks need it
  const approveTransfers = async () => {
    setLoadingApproval(true);
    if (loadingApproval) return;
    let prompt = null;
    try {
      let _bridge = BRIDGE_CHAINS.find(bridge => bridge.id == _get(fromChain, "id", null));
      if (recipientError) throw new Error(recipientError);
      let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
      if (_get(fromChain, "chainType", "") != BRIDGE_CHAINS_TYPES.EVM) throw new Error("no approval on this network");
      if (!(await isSignerOnNetwork(signer, fromNetwork.expected))) throw new Error("wrong network");
      let _spender = getBridgeContract(route, _bridge);
      if (!_spender) throw new Error("no route");
      let _allowance = parseTokenAmount(inputValue, _get(_network, "decimals", 8));
      if (_allowance == null || _allowance == "0") throw new Error("invalid amount");
      if (hopFinal) await checkSecondLeg(parseTokenAmount(inputValue, 8));
      const beforeSend = async () => { await checkNotPaused(); if (prompt) Snackbar.closeSnackbar(prompt); prompt = walletPrompt(); };
      let tx;
      if (route == BRIDGE_ROUTES_TYPES.VORTEX) {
        tx = await vortex.ethApprove({ signer, token: _network.address, amount: _allowance, recipient, beforeSend, pageDecimals: _get(_network, "decimals", 8) });
      } else {
        prompt = walletPrompt();
        tx = await EvmTokenContract(_network.address, signer).approve(_spender, _allowance);
      }
      Snackbar.closeSnackbar(prompt);
      Snackbar.enqueueSnackbar(<Typography variant="h6">Transaction submitted</Typography>, {
        variant: 'info',
        persist: false,
        action: actionClose,
      })
      await tx.wait();
      Snackbar.enqueueSnackbar(<Link underline="none" component={fromChain.explorer ? "a" : "span"} style={{ cursor: "pointer" }} target="_blank" rel="noopener noreferrer" href={fromChain.explorer ? `${fromChain.explorer}/${tx.hash}` : undefined}><Typography sx={{ color: "white" }} variant="h6">Transaction success</Typography><Typography sx={{ color: "white" }} variant="subtitle1" component="p">View on the explorer</Typography></Link>, {
        variant: 'success',
        persist: false,
        action: actionClose,
      })
      // what counts is the allowance on the chain, not what was asked for
      setLoadingApproval(false);
      loadBlance();
    } catch (error) {
      console.log(error)
      if (prompt) Snackbar.closeSnackbar(prompt);
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
    if(_get(_chain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA && !_get(walletSelector, "solana", null)) {
      return true
    }
    return false
  }

  const disabledButtonBridge = () => {
    if (recipientError) return true;
    if (loadingBridge) return true;
    if (inputValue == "" || inputValue == 0) return true;
    // more than the balance can not be sent (issue #57)
    if (new BigNumber(inputValue).isNaN() || new BigNumber(inputValue).gt(balance || 0)) return true;
    if (recipient == "" || recipient == null) return true;
    // a wormhole transfer to something that is not an evm address can not be redeemed
    // wormhole: an evm address, or a Solana wallet address (base58; checked strictly before the wallet is asked)
    if (route == BRIDGE_ROUTES_TYPES.WORMHOLE && _get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA) {
      if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipient)) return true;
    } else if (route == BRIDGE_ROUTES_TYPES.WORMHOLE && !ethers.utils.isAddress(recipient)) return true;
    return false;
  }

  const BaseConnections = (props) => (
    <>
      {_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM ? <CustomConnectInfo walletAddress={account.address} {...props} /> : null}
      {_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN ? <CustomKoinConnectButton {...props} /> : null}
      {_get(fromChain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA ? <CustomSolConnectButton {...props} /> : null}
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
    // conect Solana (Phantom, Solflare, Backpack)
    if (_get(chain, "chainType", "") == BRIDGE_CHAINS_TYPES.SOLANA) return (
      <CustomSolConnectButton />
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
    // no direct route, but two steps through the middle network
    if (route == null && hop) return (
      <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", textAlign: "center" }}>
        <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "10px" }}>
          {`No direct route between ${_get(fromChain, "name", "")} and ${_get(toChain, "name", "")}: the transfer goes through ${_get(hop, "via.name", "")} in two steps. Step 1 sends to your own ${_get(hop, "via.name", "")} wallet; once it is redeemed there, the Redeem page offers step 2 to ${_get(toChain, "name", "")}. You pay the network fees of both steps.`}
        </Typography>
        {usesVortex && (!vortex || vortexPaused !== false) ?
          <Typography variant="body1" sx={{ color: "text.grey1" }}>
            {vortex && vortexPaused === null ? "Checking the bridge status..." : "The Vortex bridge is paused or not live yet — the two-step transfer cannot start now. Your funds are safe."}
          </Typography>
          :
          <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => {
            setHopFinal({ from: _get(fromChain, "id", null), via: _get(hop, "via.id", null), to: toChain, second: hop.second });
            dispatch(setNetworkTo(hop.via));
          }}>{`START STEP 1: ${_get(fromChain, "name", "")} → ${_get(hop, "via.name", "")}`}</Button>}
      </Box>
    )
    // no direct route between the networks
    if (route == null) return (
      <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", textAlign: "center" }}>
        <Typography variant="body1" sx={{ color: "text.grey1" }}>
          {`There is no direct route between ${_get(fromChain, "name", "")} and ${_get(toChain, "name", "")}, bridge through Ethereum.`}
        </Typography>
      </Box>
    )
    // the Vortex route while its bridges are not set up or paused (issue #53)
    // fail closed: only an explicit "not paused" from both bridges opens the route
    if (route == BRIDGE_ROUTES_TYPES.VORTEX && (!vortex || vortexPaused !== false)) return (
      <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", textAlign: "center" }}>
        <Typography variant="body1" sx={{ color: "text.grey1" }}>
          {vortex && vortexPaused === null ? "Checking the bridge status..." :
            vortex && vortexPaused == "error" ? "The bridge status could not be read. Please reload the page." :
            "The Vortex bridge is paused for maintenance. Your funds are safe, transfers can be claimed as soon as it is back."}
        </Typography>
      </Box>
    )
    // conect wallet from chain
    if (checkChain(fromChain)) return (
      <Connectors chain={fromChain} />
    )
    // conect wallet to chain
    if (checkChain(toChain)) return (
      <Connectors chain={toChain} />
    )
    // the wallet is on another evm network than the from chain
    if (fromNetwork.wrongNetwork) return (
      <BaseConnections
        actions={
          <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => fromNetwork.switchNetwork().catch((e) => console.log(e))}>SWITCH TO {_get(fromChain, "name", "")}</Button>
        }
      />
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
        <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", display: "flex", alignContent: "center", flexDirection: "column", textAlign: "center" }} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
          <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px", fontSize: '1.0vh' }}>Transaction Hash</Typography>
          <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px", fontSize: '1.0vh' }}>{txHash}</Typography>
          <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px", fontSize: '1.0vh' }}>Click CLAIM TOKENS to Redeem on Receiving Network</Typography>
          {hopFinal ? <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>{`Step 1 of 2. After you redeemed it on ${_get(toChain, "name", "")}, the Redeem page offers step 2 to ${_get(hopFinal, "to.name", "")}.`}</Typography> : null}
        </Box>
        {route == BRIDGE_ROUTES_TYPES.WORMHOLE ?
          <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "1em", textAlign: "center" }}>The Wormhole guardians sign the transfer once {_get(fromChain, "name", "")} has finalized it, this takes around 20 minutes. Keep the transaction hash, you can redeem at any time later.</Typography>
          : null}
        <Button variant="contained" size="large" sx={{ width: "100%" }} onClick={() => navigate(`/redeem?tx=${txHash}&network=${_get(toChain, "id", "")}&from=${_get(fromChain, "id", "")}&to=${_get(toChain, "id", "")}`)}>CLAIM TOKENS</Button>
      </>
    )

    if (recipientError) return (
      <BaseConnections actions={<Button disabled variant="contained" size="large" sx={{ width: "100%" }}>CHECK RECEIVING ADDRESS</Button>} />
    );

    // check approval of tokens
    let _network = _get(tokenToBridge, "networks", []).find(net => _get(net, 'chain', "") == _get(fromChain, "id", null));
    // an amount that can not be parsed counts as zero here, the buttons stay disabled
    let fullAmount = parseTokenAmount(inputValue, _get(_network, "decimals", 8)) || "0";
    // exactly the amount, like the library: a bigger leftover allowance is replaced too (never left standing)
    if (!approvalFree && _get(_network, "allowance", false) && !new BigNumber(approval).eq(fullAmount) || new BigNumber(fullAmount).isZero()) return (
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

  const findTokenSymbolForChain = (token, chain) => {
    if (!token || !chain) return '..';
    const network = token.networks.find(net => net.chain === chain);
    return network ? _get(network, 'symbol', 'Unrecognized') : 'Unrecognized';
  };
  // what the user gets on the receiving network (WETH for native ETH)
  const findReceiveSymbolForChain = (token, chain) => {
    const network = token && chain ? token.networks.find(net => net.chain === chain) : null;
    return network ? payoutSymbol(network) : findTokenSymbolForChain(token, chain);
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
      borderWidth: active ? '0 15px 15px 0' : '36px 41px 0 0',
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
              <InputBase placeholder={"0"} type={"text"} value={inputValue} disabled={loadingApproval || loadingBridge} sx={{ fontSize: "22px", color: "text.main" }} onChange={(e) => numberPattern(e.currentTarget.value, onInput)} />
              <Button
                disabled={loadingApproval || loadingBridge}
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
                  disabled={loadingBalance || loadingApproval || loadingBridge}
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
                      let fullAmount = parseTokenAmount(b, _get(_network, "decimals", 8)) || "0";
                      let _amount = new BigNumber(fullAmount).dividedBy(2).toFixed(0, 1);
                      let value = koilibUtils.formatUnits(_amount, _get(_network, "decimals", 8));
                      onInput(value);
                    });
                  }}
                  disabled={loadingBalance || loadingApproval || loadingBridge}
                >
                  <Typography variant="h6" sx={{ color: "text.grey2" }}>
                    HALF
                  </Typography>
                </Button>
              </Box>
              : null
          }

          <Box marginTop={"1em"}>
            <Typography component="label" htmlFor="bridge-recipient" variant="body1" sx={{ color: "text.grey1", paddingBottom: "4px" }}>Receiving address</Typography>
            <Box paddingY={"6px"} paddingX={"10px"} borderRadius={"10px"} sx={{ backgroundColor: "background.light" }}>
              <Box sx={{ display: "flex", width: "100%" }}>
                <InputBase
                  id="bridge-recipient"
                  placeholder={""}
                  type={"text"}
                  value={recipient}
                  error={!!recipientError}
                  inputProps={{ "aria-describedby": recipientError ? "bridge-recipient-error" : undefined }}
                  disabled={loadingApproval || loadingBridge || hopFinal != null}
                  sx={{ width: "100%", fontSize: "16px", color: "text.main" }}
                  onChange={(e) => setRecipient(e.currentTarget.value)}
                />
              </Box>
            </Box>
            {recipientError ? <Typography id="bridge-recipient-error" role="alert" variant="body2" color="error">{recipientError}</Typography> : null}
          </Box>

          <Box sx={{ border: `1px solid ${theme.palette.background.light}`, borderRadius: "10px", padding: "10px 20px", display: "flex", alignContent: "center", flexDirection: "column" }} marginY={"1.4em"} display={"flex"} justifyContent={"space-between"}>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>You will receive:</Typography>
              <Typography variant="h6" component={"span"}>{calculateReceiveAmount(inputValue, findTokenSymbolForChain(tokenToBridge, toChain?.id))} {findReceiveSymbolForChain(tokenToBridge, toChain?.id)}</Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <Typography variant="body1" component={"span"} sx={{ color: "text.grey2" }}>Receiving address:</Typography>
              <Typography variant="h6" component={"span"}>{recipient && !recipientError ? shortedAddress(recipient) : ".."}</Typography>
            </Box>
            {route == BRIDGE_ROUTES_TYPES.WORMHOLE ?
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <Typography variant="body1" component={"span"} sx={{ color: "text.grey2", whiteSpace: "nowrap", mr: 2 }}>Route:</Typography>
                <Typography variant="body1" component={"span"} sx={{ textAlign: "right" }}>Wormhole Token Bridge, around 20 minutes. You redeem on {_get(toChain, "name", "")} and pay the gas there in {_get(toChain, "symbol", "")}.</Typography>
              </Box>
              : null}
            {route == BRIDGE_ROUTES_TYPES.VORTEX && _get(toChain, "chainType", "") == BRIDGE_CHAINS_TYPES.KOIN ?
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                <Typography variant="body1" component={"span"} sx={{ color: "text.grey2", whiteSpace: "nowrap", mr: 2 }}>Before you send:</Typography>
                <Typography variant="body1" component={"span"} sx={{ textAlign: "right" }}>you claim on Koinos yourself: the receiving Koinos account needs a little KOIN for mana to submit that claim.</Typography>
              </Box>
              : null}
          </Box>

          {hopFinal && !txHash ?
            <Typography variant="body1" sx={{ color: "text.grey1", textAlign: "center", paddingBottom: "1em" }}>
              {`Step 1 of 2: ${_get(fromChain, "name", "")} → ${_get(toChain, "name", "")}, to your own wallet. Step 2 (${_get(toChain, "name", "")} → ${_get(hopFinal, "to.name", "")}) follows on the Redeem page.`}
            </Typography>
            : null}
          {ActionLoad()}

        </CardContent>
      </Card>
    </Box >
  )
}

export default Bridge;
