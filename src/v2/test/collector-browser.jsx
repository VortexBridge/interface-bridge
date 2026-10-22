// Browser fixture only: never imported by the production entry. No wallet extension, chain or real key is used.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Box, Button, Typography } from "@mui/material";
import { ethers } from "ethers";
import SignatureCollection from "../../components/SignatureCollection";
import { createVortex } from "../vortex-v2.mjs";
import { collectionStatus } from "../collection-status.mjs";

const U = ethers.utils;
const keys = Array.from({ length: 8 }, (_, i) => new ethers.Wallet(U.hexZeroPad(U.hexlify(i + 1), 32)));
function kAddress(w) {
  const b = U.concat(["0x00", U.ripemd160(U.sha256(U.computePublicKey(w.publicKey, true)))]);
  return U.base58.encode(U.concat([b, U.hexDataSlice(U.sha256(U.sha256(b)), 0, 4)]));
}
const cfg = { koinos: { bridge: kAddress(keys[5]), bridgeChainId: 1 }, eth: { bridge: keys[5].address, networkChainId: 1, bridgeChainId: 2 },
  collectionMode: "collector", deployment: "fixture", collectors: ["https://primary.example", "https://backup.example"] };

function App() {
  const [got, setGot] = useState(null), [calls, setCalls] = useState([]), [busy, setBusy] = useState(false);
  async function exercise(mode) {
    setBusy(true); setGot(null);
    const claim = { direction: "k2e", depositNonce: 1n, token: keys[6].address, recipient: keys[7].address, amount8: 100000000n };
    const vx = createVortex({ ethers, cfg });
    const expiry = mode === "Expired" ? 1n : vx.expiryFor("k2e");
    const signatures = keys.slice(0,4).map((w) => U.joinSignature(w._signingKey().signDigest(vx.ethClaimDigest({ ...claim, expiry }))));
    const requests = [];
    const client = createVortex({ ethers, cfg, fetch: async (url) => {
      requests.push(url.startsWith(cfg.collectors[0]) ? "primary" : "backup");
      if (mode === "Both unavailable" || mode === "Primary unavailable" && requests.at(-1) === "primary") throw new Error("fixture outage");
      const responses = mode === "Validators not ready" ? [] : mode === "Insufficient" ? signatures.slice(0,2) : signatures;
      return new Response(JSON.stringify({ version:1, deployment:"fixture", direction:"k2e", depositNonce:"1", expiry:expiry.toString(),
        responses: responses.map((signature,i) => ({validatorId:`slot-${i}`,signature})),
        unavailable: mode === "Validators not ready" ? [{ validatorId:"slot", reason:"not ready" }] : [] }));
    } });
    const result = await client.collect(claim, { expiry, quorum:4, isValidator: async (a) => keys.slice(0,5).some((w) => w.address === a) });
    setGot(result); setCalls(requests); setBusy(false);
  }
  return <Box sx={{ maxWidth:680, margin:"32px auto", padding:2 }}>
    <Typography variant="h4">Collector UI fixture</Typography>
    <p>Temporary test keys and responses. No wallet or blockchain transactions.</p>
    <Box sx={{ display:"flex", flexWrap:"wrap", gap:1 }}>
      {["Primary healthy","Primary unavailable","Both unavailable","Validators not ready","Insufficient","Expired"].map((s) => <Button key={s} variant="outlined" disabled={busy} onClick={() => exercise(s)}>{s}</Button>)}
    </Box>
    {got && <Box sx={{ marginTop:3 }}>
      <Typography role="status">{collectionStatus(got)}</Typography>
      <SignatureCollection got={got}/>
      <p>Fixture requests: {calls.join(", ") || "none"}</p>
      <Button disabled={!got.enough} variant="contained">Prepare claim (fixture only)</Button>
    </Box>}
  </Box>;
}
createRoot(document.getElementById("root")).render(<App/>);
