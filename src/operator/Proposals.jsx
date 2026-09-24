import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Chip, FormControlLabel, MenuItem, Paper, Stack, Switch, TextField, Typography } from "@mui/material";

import { exportJSON } from "./client";

const sentence = (value = "") => value.replaceAll("_", " ").replaceAll("-", " ");

function Route({ proposal, route, submissionEnabled, busy, act }) {
  const canSubmit = submissionEnabled && route.state === "ready" && !route.receipt;
  return <Paper variant="outlined" sx={{ p: 2, minWidth: 0 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
      <Typography variant="subtitle1" component="h4">{route.profile.name}</Typography>
      <Chip size="small" label={sentence(route.state)} color={route.state === "finalized" ? "success" : route.state === "failed" || route.state === "stale" ? "error" : "default"} />
    </Stack>
    <Box sx={{ mt: 2, display: "grid", gap: 1 }}>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}><b>Network:</b> {route.profile.networkId}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}><b>Contract:</b> {route.profile.contract}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}><b>Payload digest:</b> {route.payload.digest}</Typography>
      <Typography variant="body2"><b>Current approvals:</b> {route.approvals.length} / {route.anchor.quorum}</Typography>
      <Typography variant="body2"><b>Observed nonce:</b> {route.anchor.nonce}</Typography>
      <Typography variant="body2"><b>Anchor:</b> {route.anchor.finality} · {route.anchor.block}</Typography>
      {route.receipt && <>
        <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}><b>Transaction:</b> {route.receipt.transactionId}</Typography>
        <Typography variant="body2"><b>Receipt:</b> {sentence(route.receipt.state)}{route.receipt.block ? ` · block ${route.receipt.block}` : ""}</Typography>
      </>}
      {route.problem && <Alert severity="warning">{route.problem}</Alert>}
    </Box>
    <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
      <Button size="small" variant="contained" disabled={!canSubmit || busy} onClick={() => act("submit", { proposalId: proposal.id, profileId: route.profile.id })}>Submit route</Button>
    </Stack>
    {!submissionEnabled && route.state === "ready" && !route.receipt && <Typography variant="caption" display="block" sx={{ mt: 1 }}>Transaction-payer keys intentionally stay outside this loopback service. Run the protected terminal <code>governance-submit</code> command, then refresh this page.</Typography>}
    {!submissionEnabled && route.receipt && route.receipt.state !== "finalized" && <Typography variant="caption" display="block" sx={{ mt: 1 }}>Receipt finality is checked without a payer key. Run the terminal <code>governance-reconcile</code> command, then refresh this page.</Typography>}
    <Typography variant="caption" display="block" sx={{ mt: 1 }}>Signing stays in each validator’s protected local tool. Export the complete portable proposal below; this page accepts only the resulting public signature envelope.</Typography>
  </Paper>;
}

export default function Proposals({ client, profiles }) {
  const [inventory, setInventory] = useState({ proposals: [], submissionEnabled: false, notice: "" });
  const [id, setID] = useState("");
  const [evm, setEVM] = useState("");
  const [koinos, setKoinos] = useState("");
  const [pause, setPause] = useState(true);
  const [expiration, setExpiration] = useState(() => new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16));
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const importRef = useRef(null);
  const evmProfiles = useMemo(() => profiles.filter((profile) => profile.family === "evm"), [profiles]);
  const koinosProfiles = useMemo(() => profiles.filter((profile) => profile.family === "koinos"), [profiles]);

  const refresh = async () => setInventory(await client("/v1/governance"));
  useEffect(() => {
    let active = true;
    client("/v1/governance").then((next) => { if (active) setInventory(next); }).catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [client]);
  const perform = async (work, success) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); await refresh(); if (success) setMessage(success); }
    catch (e) { setError(e.message || "Governance action failed."); }
    finally { setBusy(false); }
  };
  const create = () => perform(async () => {
    const expiry = Date.parse(expiration);
    if (!Number.isFinite(expiry)) throw new Error("Choose a valid expiration time.");
    await client("/v1/governance/proposals", { id, profileIds: [evm, koinos], pause, expiration: String(expiry) });
    setID("");
  }, "The paired proposal was created from fresh finalized state on both routes.");
  const importProposal = async (event) => {
    const file = event.target.files?.[0]; event.target.value = "";
    if (!file) return;
    await perform(async () => {
      if (file.size > 256 * 1024) throw new Error("Proposal file is too large.");
      const proposal = JSON.parse(await file.text());
      await client("/v1/governance/import", proposal);
    }, "The proposal was imported and revalidated against this operator’s current contract state.");
  };
  const addSignature = () => perform(async () => {
    const envelope = JSON.parse(signature);
    await client("/v1/governance/signatures", envelope);
    setSignature("");
  }, "The signature was recovered, matched to a current validator and added to the exact route payload.");
  const act = (kind, body) => perform(async () => {
    await client(`/v1/governance/${kind}`, body);
  }, kind === "submit" ? "The route was submitted. Reconcile its receipt to confirm finality." : kind === "revalidate" ? "The proposal was revalidated against fresh contract state." : "Receipts were reconciled against the isolated chains.");

  return <Stack gap={2}>
    <Typography variant="h6" component="h2">Contract governance</Typography>
    <Alert severity="info">A pause or resume proposal pairs one reviewed local EVM deployment with one reviewed local Koinos deployment. Each route has its own nonce, digest, current members, quorum, submission and finality.</Alert>
    {inventory.notice && <Typography color="text.secondary">{inventory.notice}</Typography>}
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {message && <Alert severity="success" role="status">{message}</Alert>}
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="subtitle1" component="h3">Create a paired pause proposal</Typography>
      <Box component="form" onSubmit={(event) => { event.preventDefault(); create(); }} sx={{ mt: 2 }}>
        <Stack gap={2}>
          <TextField required label="Proposal ID" helperText="Lowercase letters, numbers and hyphens" value={id} onChange={(event) => setID(event.target.value)} />
          <TextField required select label="EVM deployment" value={evm} onChange={(event) => setEVM(event.target.value)}>{evmProfiles.map((profile) => <MenuItem key={profile.id} value={profile.id}>{profile.name}</MenuItem>)}</TextField>
          <TextField required select label="Koinos deployment" value={koinos} onChange={(event) => setKoinos(event.target.value)}>{koinosProfiles.map((profile) => <MenuItem key={profile.id} value={profile.id}>{profile.name}</MenuItem>)}</TextField>
          <FormControlLabel control={<Switch checked={pause} onChange={(event) => setPause(event.target.checked)} />} label={pause ? "Pause both bridge contracts" : "Resume both bridge contracts"} />
          <TextField required type="datetime-local" label="Expiration" InputLabelProps={{ shrink: true }} value={expiration} onChange={(event) => setExpiration(event.target.value)} />
          <Button type="submit" variant="contained" disabled={busy || !evm || !koinos} sx={{ alignSelf: "flex-start" }}>Create from fresh chain state</Button>
        </Stack>
      </Box>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
        <input ref={importRef} hidden type="file" accept="application/json,.json" onChange={importProposal} />
        <Button variant="outlined" disabled={busy} onClick={() => importRef.current?.click()}>Import portable proposal</Button>
        <Button onClick={refresh} disabled={busy}>Refresh proposals</Button>
      </Stack>
    </Paper>
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="subtitle1" component="h3">Import a validator signature</Typography>
      <Typography color="text.secondary" sx={{ my: 1 }}>Paste the public JSON signature envelope produced by a validator’s protected local signing tool. Private keys and vault passwords never belong here.</Typography>
      <TextField multiline minRows={4} fullWidth label="Public signature envelope JSON" value={signature} onChange={(event) => setSignature(event.target.value)} />
      <Button sx={{ mt: 2 }} variant="outlined" disabled={busy || !signature.trim()} onClick={addSignature}>Verify and add signature</Button>
    </Paper>
    {inventory.proposals.length === 0 && <Alert severity="info">No governance proposals have been recorded.</Alert>}
    {inventory.proposals.map((proposal) => <Paper key={proposal.id} variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
        <Box><Typography variant="h6" component="h3">{proposal.id}</Typography><Typography color="text.secondary">{proposal.pause ? "Pause" : "Resume"} · expires {new Date(Number(proposal.expiration)).toLocaleString()}</Typography><Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Proposal digest: {proposal.digest}</Typography></Box>
        <Chip label={sentence(proposal.state)} color={proposal.state === "finalized" ? "success" : proposal.state === "blocked" ? "error" : "default"} />
      </Stack>
      {proposal.state === "partially-finalized" && <Alert severity="warning" sx={{ my: 2 }}>{proposal.notice}</Alert>}
      <Typography sx={{ my: 2 }}>{proposal.notice}</Typography>
      <Stack gap={2}>{proposal.routes.map((route) => <Route key={route.profile.id} proposal={proposal} route={route} submissionEnabled={inventory.submissionEnabled} busy={busy} act={act} />)}</Stack>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => exportJSON(`${proposal.id}-proposal.json`, proposal)}>Export portable proposal</Button>
        {proposal.state !== "finalized" && <Button disabled={busy} onClick={() => act("revalidate", { proposalId: proposal.id })}>Revalidate proposal</Button>}
        {proposal.routes.some((route) => route.receipt && route.receipt.state !== "finalized") && <Button disabled={busy} onClick={() => act("reconcile", { proposalId: proposal.id })}>Reconcile receipts</Button>}
      </Stack>
      <Typography variant="caption" display="block" sx={{ mt: 2 }}>{proposal.history.length} public audit events. Imported receipts are never trusted as local finality.</Typography>
    </Paper>)}
  </Stack>;
}
