import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Divider, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import { exportJSON } from "./client";

function Mappings({ label, rows, onChange, peers, disabled }) {
  const update = (index, field, value) => onChange(rows.map((row, i) => i === index ? { ...row, [field]: value } : row));
  return <Stack gap={2}>
    <Typography component="h4" fontWeight={600}>{label}</Typography>
    {rows.map((row, i) => <Paper variant="outlined" key={i} sx={{ p: 2 }}><Stack gap={2}>
      <TextField required disabled={disabled} label={`${label} ${i + 1} ID`} value={row.id} onChange={(e) => update(i, "id", e.target.value)} helperText="Lowercase letters, numbers and hyphens" />
      <TextField required disabled={disabled} label={`${label} ${i + 1} EVM address`} value={row.evm} onChange={(e) => update(i, "evm", e.target.value)} />
      <TextField required disabled={disabled} label={`${label} ${i + 1} Koinos address`} value={row.koinos} onChange={(e) => update(i, "koinos", e.target.value)} />
      {peers && <TextField required disabled={disabled} label={`Peer ${i + 1} private endpoint`} value={row.endpoint} onChange={(e) => update(i, "endpoint", e.target.value)} helperText="HTTPS, or literal loopback HTTP for development" />}
      <Button disabled={disabled} onClick={() => onChange(rows.filter((_, index) => index !== i))}>Remove {peers ? "peer" : "token pair"}</Button>
    </Stack></Paper>)}
    <Button variant="outlined" disabled={disabled || rows.length >= 256} sx={{ alignSelf: "flex-start" }} onClick={() => onChange([...rows, { id: "", evm: "", koinos: "", ...(peers ? { endpoint: "" } : {}) }])}>Add {peers ? "peer" : "token pair"}</Button>
  </Stack>;
}

export default function WorkerSetup({ client, onCreated }) {
  const [setup, setSetup] = useState(null);
  const [form, setForm] = useState({ evmProfileId: "", koinosProfileId: "", evmStartBlock: "1", koinosStartBlock: "1", evmConfirmations: "15", apiPort: "13000", tokens: [], peers: [] });
  const [preview, setPreview] = useState(null);
  const [request, setRequest] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let cancelled = false; client("/v1/worker/setup").then((value) => { if (!cancelled) setSetup(value); }).catch((e) => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [client]);
  const update = (field, value) => { setForm((old) => ({ ...old, [field]: value })); setPreview(null); setRequest(null); };
  const reload = async () => {
    setBusy(true); setError(""); setPreview(null); setRequest(null);
    try { const value = await client("/v1/worker/setup"); setSetup(value); if (value.receipt) { setReceipt(value.receipt); await onCreated(value.receipt); } }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const review = async () => {
    setBusy(true); setError(""); setPreview(null); setRequest(null);
    try {
      const input = { ...form, expectedRevision: setup.revision, apiPort: Number(form.apiPort) };
      const next = await client("/v1/worker/setup/preview", input);
      setPreview(next); setRequest({ input, previewDigest: next.digest, idempotencyKey: `setup-${crypto.randomUUID()}` });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true); setError("");
    try { const result = await client("/v1/worker/setup/create", request); setReceipt(result); await onCreated(result); }
    catch (e) { setError(`${e.message} You can retry this request or reload setup to inspect a completed job.`); }
    finally { setBusy(false); }
  };
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={2}>
    <Typography component="h3" variant="h6">Set up an observation worker</Typography>
    <Typography>Select both deployments, review the scan settings and add any known token pairs and peers. Setup creates a private directory for this instance. It does not start the worker or enroll a signing identity.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    <Button disabled={busy} onClick={reload} sx={{ alignSelf: "flex-start" }}>Reload setup</Button>
    {!setup && !error && <Typography role="status">Reading setup prerequisites…</Typography>}
    {setup && !setup.prepared && <Alert severity="info">First run the local worker-prepare command with your reviewed validator binary and SHA-256. This console cannot choose executable files. Instructions are in OPERATOR.md.</Alert>}
    {setup?.prepared && !receipt && <>
      <Typography sx={{ overflowWrap: "anywhere" }}>Locally reviewed binary: {setup.preparation.binarySha256}</Typography>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); review(); }}><Stack gap={2}>
        {[["evmProfileId", "evm", "EVM deployment"], ["koinosProfileId", "koinos", "Koinos deployment"]].map(([field, family, label]) => <TextField key={field} required select disabled={busy} label={label} value={form[field]} onChange={(e) => update(field, e.target.value)}>{setup.profiles.filter((p) => p.family === family).map((p) => <MenuItem value={p.id} key={p.id}>{p.name} ({p.environment})</MenuItem>)}</TextField>)}
        <Typography variant="body2">Missing deployments can be added in Add deployment. Their saved private RPC URLs are used for the worker.</Typography>
        {[["evmStartBlock", "First EVM block to observe"], ["koinosStartBlock", "First Koinos block to observe"], ["evmConfirmations", "EVM confirmation distance"], ["apiPort", "Local worker API port"]].map(([field, label]) => <TextField key={field} required disabled={busy} label={label} value={form[field]} inputProps={{ inputMode: "numeric" }} onChange={(e) => update(field, e.target.value)} />)}
        <Alert severity="info">Verify deployment start blocks and confirmation distance for this route. Block 1 scans from the beginning. The API binds only to 127.0.0.1; use a different port for each local worker.</Alert>
        <Mappings label="Token pair" rows={form.tokens} onChange={(rows) => update("tokens", rows)} disabled={busy} />
        <Mappings label="Peer" peers rows={form.peers} onChange={(rows) => update("peers", rows)} disabled={busy} />
        {(!form.tokens.length || !form.peers.length) && <Alert severity="warning">Empty mappings are allowed for observation setup. Transfer interpretation and peer participation remain incomplete until the correct mappings are reviewed.</Alert>}
        <Button type="submit" variant="outlined" disabled={busy || !form.evmProfileId || !form.koinosProfileId}>Review worker configuration</Button>
      </Stack></Box>
    </>}
    {preview && !receipt && <Stack gap={2}><Divider /><Typography component="h4" fontWeight={600}>Configuration preview</Typography>
      <Typography>{preview.evm.name} ↔ {preview.koinos.name}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>EVM network {preview.evm.networkId} · Protocol chain {preview.evm.bridgeChainId} · {preview.evm.contract}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Koinos network {preview.koinos.networkId} · Protocol chain {preview.koinos.bridgeChainId} · {preview.koinos.contract}</Typography>
      <Typography>First blocks: EVM {preview.evmStartBlock}, Koinos {preview.koinosStartBlock}. EVM confirmation distance: {preview.evmConfirmations}. Loopback port: {preview.apiPort}.</Typography>
      <Typography>{preview.tokens.length} token pairs · {preview.peers.length} peers · Configuration revision {preview.revision}</Typography>
      <Typography>Both chains poll every 3 seconds with at most 100 blocks per batch. No signing keys are configured.</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Configuration SHA-256: {preview.configSha256}</Typography>
      <Alert severity="info">{preview.notice}</Alert>
      <Button onClick={() => exportJSON("worker-setup-preview.json", preview)}>Export public preview</Button>
      <Button variant="contained" disabled={busy} onClick={create}>Create observation worker</Button>
    </Stack>}
    {receipt && <Alert severity="success">Worker configuration created. Run preflight checks and review the results before starting observation. Signing is not enabled.</Alert>}
  </Stack></Paper>;
}
