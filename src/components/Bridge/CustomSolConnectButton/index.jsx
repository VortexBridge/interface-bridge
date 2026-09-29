/* eslint-disable */
import React, { useEffect, useState } from "react";
import { get as _get } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { Box, Button, Link, Typography } from '@mui/material'
import { setSolanaWallet } from "../../../redux/actions/wallet";
import { shortedAddress } from "./../../../utils/display";

// Solana wallets injected by the browser (Phantom, Solflare, Backpack). The Solana libraries load on the first click.
// Connected: shows the wallet and the page's actions (props.actions), like the other connect buttons.
const CustomSolConnectButton = (props) => {
  const dispatch = useDispatch();
  const solana = useSelector(state => _get(state, "wallet.solana", null));
  const [wallets, setWallets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    // the injected wallets, without loading the Solana libraries yet
    let found = [
      { id: "phantom", name: "Phantom", ok: !!_get(window, "phantom.solana", null) },
      { id: "solflare", name: "Solflare", ok: !!_get(window, "solflare", null) },
      { id: "backpack", name: "Backpack", ok: !!_get(window, "backpack", null) },
    ].filter(w => w.ok);
    setWallets(found);
  }, []);

  // follow account switches / disconnects made in the wallet itself
  useEffect(() => {
    if (!solana) return;
    let stop = () => {};
    let active = true;
    import("../../../helpers/solana.mjs").then(sol => {
      if (active) stop = sol.onSolanaWalletChange((w) => dispatch(setSolanaWallet(w)));
    });
    return () => { active = false; stop(); };
  }, [_get(solana, "id", null)]);

  const connect = async (id) => {
    setError("");
    try {
      let sol = await import("../../../helpers/solana.mjs");
      dispatch(setSolanaWallet(await sol.connectSolanaWallet(id)));
    } catch (e) {
      console.log(e);
      setError(String(_get(e, "message", "") || e).slice(0, 120));
    }
  };

  const disconnect = async () => {
    let sol = await import("../../../helpers/solana.mjs");
    await sol.disconnectSolanaWallet();
    dispatch(setSolanaWallet(null));
  };

  if (solana) return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <Button variant="outlined" sx={{ width: "100%", borderRadius: "10px" }} onClick={disconnect}>
        {`${_get(solana, "name", "")} ${shortedAddress(_get(solana, "address", ""))} — disconnect`}
      </Button>
      {props.actions}
    </Box>
  );

  if (wallets.length == 0) return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body1" sx={{ color: "text.grey1", paddingBottom: "8px" }}>No Solana wallet found in this browser.</Typography>
      <Button variant="contained" sx={{ width: "100%", borderRadius: "10px" }} component={Link} href="https://phantom.com/download" target="_blank" rel="noopener noreferrer">Get a Solana wallet</Button>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {wallets.map(w => (
        <Button key={w.id} variant="contained" sx={{ width: "100%", borderRadius: "10px" }} onClick={() => connect(w.id)}>{`CONNECT ${w.name.toUpperCase()}`}</Button>
      ))}
      {error ? <Typography variant="body2" sx={{ color: "error.main", textAlign: "center" }}>{error}</Typography> : null}
    </Box>
  );
};

export default CustomSolConnectButton;
