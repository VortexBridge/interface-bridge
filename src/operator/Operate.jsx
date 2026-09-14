import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Divider, FormControlLabel, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, Typography } from "@mui/material";

import { createOperatorClient, exportJSON, observedStatus } from "./client";
import Updates from "./Updates.jsx";
import Worker from "./Worker.jsx";

const emptyStatus = { profiles: [], observations: [], events: [], revision: 0 };
const labels = { overview: "Overview", worker: "Validator", setup: "Add deployment", contracts: "Contracts", proposals: "Proposals", updates: "Updates", history: "History" };
const sentence = (value) => value.replaceAll("_", " ");
const fieldStyle = { minWidth: 0, flex: "1 1 240px" };
const blankProfile = { schemaVersion: 1, id: "", name: "", family: "evm", environment: "local", networkId: "31337", bridgeChainId: 2, contract: "", codec: "", sourceCommit: "", codeHash: "", reviewed: false, reviewEvidence: "" };

function Detail({ label, children }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography component="div" sx={{ overflowWrap: "anywhere" }}>{children ?? "Unknown"}</Typography></Box>;
}

export default function Operate() {
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:3021");
  const [token, setToken] = useState("");
  const [client, setClient] = useState(null);
  const [status, setStatus] = useState(emptyStatus);
  const [capabilities, setCapabilities] = useState({ families: [], actions: {} });
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [profile, setProfile] = useState(blankProfile);
  const [rpc, setRPC] = useState("http://127.0.0.1:8545");
  const [validated, setValidated] = useState(null);
  const [selected, setSelected] = useState("");
  const [kind, setKind] = useState("set_pause");
  const [action, setAction] = useState({ address: "", wallet: "", fee: "", pause: true, nonce: "", expiration: "" });
  const [draft, setDraft] = useState(null);

  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!client) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try { const next = await client("/v1/status"); if (!cancelled) setStatus(next); }
      catch { if (!cancelled) setError("Operator connection lost. Displayed observations may be stale."); }
    }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client]);

  const perform = async (work) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (e) { setError(e.message || "The operator could not complete this action."); }
    finally { setBusy(false); }
  };
  const connect = () => perform(async () => {
    const api = createOperatorClient(endpoint, token);
    const [next, caps] = await Promise.all([api("/v1/status"), api("/v1/capabilities")]);
    setClient(() => api); setStatus(next); setCapabilities(caps); setToken("");
    setMessage("Connected to your private operator service.");
  });
  const refresh = (id) => perform(async () => { await client(`/v1/observations/${encodeURIComponent(id)}`, {}); setStatus(await client("/v1/status")); });
  const chooseFamily = (family) => { setProfile({ ...profile, family, networkId: family === "evm" ? "31337" : "", bridgeChainId: family === "evm" ? 2 : 1, contract: "" }); setValidated(null); };
  const updateProfile = (key, value) => { setProfile({ ...profile, [key]: value }); setValidated(null); };
  const binding = () => {
    const family = capabilities.families.find((f) => f.id === profile.family);
    return { profile: { ...profile, codec: family.codec, sourceCommit: family.sourceCommit, bridgeChainId: Number(profile.bridgeChainId) }, rpc };
  };
  const validate = () => perform(async () => { const b = binding(); const result = await client("/v1/config/validate", b); setValidated({ ...result, binding: b }); });
  const apply = () => perform(async () => {
    await client("/v1/config/apply", { expectedRevision: status.revision, idempotencyKey: `config-${crypto.randomUUID()}`, binding: validated.binding });
    setStatus(await client("/v1/status")); setValidated(null); setRPC(""); setProfile(blankProfile); setTab("overview"); setMessage("Deployment saved in observation-only mode. Refresh its contract state to inspect the network.");
  });
  const deployment = status.profiles.find((p) => p.id === selected);
  const needsFee = ["set_fee_token", "set_fee_wrapped_token"].includes(kind) || (deployment?.family === "evm" && ["add_token", "add_wrapped_token"].includes(kind));
  const claim = kind.startsWith("claim_fee");
  const encode = () => perform(async () => {
    const values = { kind, nonce: action.nonce, expiration: action.expiration };
    if (kind === "set_pause") values.pause = action.pause; else values.address = action.address;
    if (needsFee) values.fee = action.fee;
    if (claim) values.wallet = action.wallet;
    const result = await client("/v1/governance/encode", { profileId: selected, action: values }); setDraft({ ...result, profile: deployment });
  });

  return <Box sx={{ maxWidth: 1120, mx: "auto", pb: 6 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2} sx={{ mb: 3 }}>
      <Box><Typography variant="h4" component="h1">Operate your bridge</Typography><Typography color="text.secondary">Your validator, your approvals, your infrastructure.</Typography></Box>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Chip label={client ? "Private operator connected" : "Operator disconnected"} color={client ? "success" : "default"} variant="outlined" />
        {client && <Button onClick={() => { setClient(null); setToken(""); setStatus(emptyStatus); setDraft(null); setRPC(""); setValidated(null); }} size="small">Disconnect</Button>}
      </Stack>
    </Stack>
    {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="info" role="status" sx={{ mb: 2 }}>{message}</Alert>}
    {!client ? <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2">Connect your operator</Typography>
      <Typography sx={{ my: 2 }}>Start the private operator service on your host. For a remote host, forward its port through an SSH tunnel. Use the token in your operator directory’s access-token file; it stays in this page’s memory.</Typography>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); connect(); }}>
        <Stack gap={2}><TextField label="Local operator address" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} fullWidth required />
          <TextField label="Operator access token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} fullWidth required />
          <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start" }}>{busy ? "Connecting…" : "Connect operator"}</Button></Stack>
      </Box>
    </Paper> : <>
      <Alert severity="info" sx={{ mb: 2 }}>The operator service holds no signing keys. Registered observation workers can be started and stopped independently. Managed signing and transaction submission remain unavailable.</Alert>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, minWidth: 0 }}>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Operator sections" sx={{ minWidth: 0, width: "100%" }}>
          {Object.entries(labels).map(([value, label]) => <Tab key={value} value={value} label={label} id={`operator-tab-${value}`} aria-controls={`operator-panel-${value}`} />)}
        </Tabs>
      </Stack>
      <Box role="tabpanel" id={`operator-panel-${tab}`} aria-labelledby={`operator-tab-${tab}`}>
        {tab === "worker" && <Worker client={client} />}
        {tab === "updates" && <Updates client={client} revision={status.revision} instanceId={status.instanceId} onChange={async () => setStatus(await client("/v1/status"))} />}
        {tab === "overview" && <Stack gap={2}>
          <Typography variant="h6" component="h2">Your deployments</Typography>
          {status.profiles.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography sx={{ mb: 2 }}>Add the contracts you want to observe. Each deployment keeps its own network identity and verification status.</Typography><Button variant="contained" onClick={() => setTab("setup")}>Add deployment</Button></Paper>}
          {status.profiles.map((p) => {
            const o = status.observations.find((x) => x.profileId === p.id);
            const state = observedStatus(o, clock);
            return <Paper variant="outlined" key={p.id} sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="h6" component="h3">{p.name}</Typography><Chip size="small" label={state} color={["mismatch", "unavailable"].includes(state) ? "error" : "default"} /></Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>{p.environment} · {p.family} · {p.reviewed ? "Local review recorded" : "Deployment not verified"}</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2, my: 2 }}>
                <Detail label="On-chain validator keys">{o?.complete ? o.validators.length : "Unknown"}</Detail>
                <Detail label="Contract quorum">{o?.complete ? o.quorum : "Unknown"}</Detail>
                <Detail label="Operational independence">Unknown — key count does not establish independent operators</Detail>
              </Box>
              <Typography sx={{ mb: 2 }}>{o?.message || "Contract state has not been read yet."}</Typography>
              {o && <Typography variant="caption" display="block" sx={{ mb: 2 }}>Last observation: {new Date(o.observedAt).toLocaleString()}</Typography>}
              <Button variant="outlined" disabled={busy} onClick={() => refresh(p.id)}>Refresh contract state</Button>
            </Paper>;
          })}
        </Stack>}
        {tab === "setup" && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" component="h2">Add a contract deployment</Typography>
          <Typography sx={{ my: 2 }}>Select the network and contract to observe. Saving a profile does not enroll a validator or approve a deployment for signing.</Typography>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); validate(); }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <TextField sx={fieldStyle} label="Profile ID" helperText="Lowercase letters, numbers and hyphens" value={profile.id} onChange={(e) => updateProfile("id", e.target.value)} required />
              <TextField sx={fieldStyle} label="Display name" value={profile.name} onChange={(e) => updateProfile("name", e.target.value)} required />
              <TextField sx={fieldStyle} select label="Chain family" value={profile.family} onChange={(e) => chooseFamily(e.target.value)}>{capabilities.families.map((f) => <MenuItem key={f.id} value={f.id}>{f.id === "evm" ? "Ethereum / EVM" : "Koinos"}</MenuItem>)}</TextField>
              <TextField sx={fieldStyle} select label="Environment" value={profile.environment} onChange={(e) => updateProfile("environment", e.target.value)}>{["local", "testnet", "mainnet"].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>
              <TextField sx={fieldStyle} label="Actual network ID" helperText={profile.family === "evm" ? "RPC/wallet chain ID, e.g. 1 for Ethereum" : "Koinos chain ID in base64url"} value={profile.networkId} onChange={(e) => updateProfile("networkId", e.target.value)} required />
              <TextField sx={fieldStyle} label="Bridge protocol chain ID" helperText="Separate from the wallet/network ID" inputProps={{ inputMode: "numeric" }} value={profile.bridgeChainId} onChange={(e) => updateProfile("bridgeChainId", e.target.value)} required />
              <TextField fullWidth label="Bridge contract address" value={profile.contract} onChange={(e) => updateProfile("contract", e.target.value)} required />
              <TextField fullWidth label="Private RPC URL" helperText="HTTPS, or literal loopback HTTP for local development. Stored only by your operator service." value={rpc} onChange={(e) => { setRPC(e.target.value); setValidated(null); }} required />
              <TextField fullWidth label="Expected contract code hash (optional)" helperText="64 lowercase hex characters. A match alone does not establish code review." value={profile.codeHash} onChange={(e) => updateProfile("codeHash", e.target.value)} />
            </Box>
            <Button type="submit" variant="outlined" disabled={busy} sx={{ mt: 3 }}>Validate configuration</Button>
          </Box>
          {validated && <Box sx={{ mt: 3 }}><Alert severity="success">Configuration is valid. Save {validated.binding.profile.name} on network {validated.binding.profile.networkId} in observation-only mode.</Alert><Button variant="contained" disabled={busy} onClick={apply} sx={{ mt: 2 }}>Save deployment</Button></Box>}
        </Paper>}
        {tab === "contracts" && <Stack gap={2}>
          <Typography variant="h6" component="h2">Contract state by network</Typography>
          {!status.profiles.length && <Alert severity="info">Add a deployment to inspect its contract.</Alert>}
          {status.profiles.map((p) => { const o = status.observations.find((x) => x.profileId === p.id); return <Paper variant="outlined" sx={{ p: 3 }} key={p.id}>
            <Typography variant="h6" component="h3" sx={{ mb: 2 }}>{p.name}</Typography>
            <Stack gap={2}><Detail label="Contract address">{p.contract}</Detail><Detail label="Actual network ID">{p.networkId}</Detail><Detail label="Bridge protocol chain ID">{p.bridgeChainId}</Detail><Detail label="Observed governance nonce">{o?.nonce}</Detail><Detail label="Paused">{o?.paused === true ? "Yes" : o?.paused === false ? "No" : "Unknown"}</Detail><Detail label="Finality / freshness">{o ? `${o.finality} · ${observedStatus(o, clock)}` : "Unknown"}</Detail><Detail label="Observed code hash">{o?.codeHash}</Detail><Detail label="Validator addresses">{o?.validators.length ? o.validators.join("\n") : "Unknown"}</Detail></Stack>
            <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 3 }}><Button disabled={busy} onClick={() => refresh(p.id)}>Refresh state</Button><Button onClick={() => exportJSON(`${p.id}-profile.json`, p)}>Export public profile</Button></Stack>
          </Paper>; })}
        </Stack>}
        {tab === "proposals" && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h6" component="h2">Prepare a governance proposal</Typography>
          <Alert severity="info" sx={{ my: 2 }}>This build prepares unsigned payloads for review. It does not collect approvals or submit transactions. Each chain requires a separate proposal.</Alert>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); encode(); }}>
            <Stack gap={2}>
              <TextField select required label="Contract deployment" value={selected} onChange={(e) => { setSelected(e.target.value); setDraft(null); }}>{status.profiles.map((p) => <MenuItem key={p.id} value={p.id}>{p.name} ({p.environment})</MenuItem>)}</TextField>
              <TextField select label="Action" value={kind} onChange={(e) => { setKind(e.target.value); setDraft(null); }}>{Object.keys(capabilities.actions).sort().map((value) => <MenuItem key={value} value={value} disabled={deployment?.family === "koinos" && value === "claim_fee_wrapped_token"}>{sentence(value)}</MenuItem>)}</TextField>
              {kind === "set_pause" ? <FormControlLabel control={<Switch checked={action.pause} onChange={(e) => { setAction({ ...action, pause: e.target.checked }); setDraft(null); }} />} label={action.pause ? "Pause selected contract" : "Resume selected contract"} /> : <TextField label={kind.includes("validator") ? "Validator address" : "Token address"} value={action.address} required onChange={(e) => { setAction({ ...action, address: e.target.value }); setDraft(null); }} />}
              {needsFee && <TextField label="Fee in exact contract integer units" value={action.fee} required onChange={(e) => { setAction({ ...action, fee: e.target.value }); setDraft(null); }} />}
              {claim && <TextField label="Fee recipient address" value={action.wallet} required onChange={(e) => { setAction({ ...action, wallet: e.target.value }); setDraft(null); }} />}
              <TextField label="Governance nonce" helperText="Read current contract state; drafts do not reserve this nonce" value={action.nonce} required onChange={(e) => { setAction({ ...action, nonce: e.target.value }); setDraft(null); }} />
              <TextField label="Expiration (Unix milliseconds)" value={action.expiration} required onChange={(e) => { setAction({ ...action, expiration: e.target.value }); setDraft(null); }} />
              <Button type="submit" variant="outlined" disabled={busy || !selected} sx={{ alignSelf: "flex-start" }}>Prepare unsigned payload</Button>
            </Stack>
          </Box>
          {draft && <Stack gap={2} sx={{ mt: 3 }}><Divider /><Chip label="Unsigned draft — not approved" sx={{ alignSelf: "flex-start" }} /><Detail label="Action">{sentence(draft.payload.action.kind)}</Detail><Detail label="Contract">{draft.profile.contract}</Detail><Detail label="Network ID">{draft.profile.networkId}</Detail><Detail label="Signing digest">{draft.payload.digest}</Detail><Detail label="Profile digest">{draft.payload.profileDigest}</Detail><Button variant="outlined" sx={{ alignSelf: "flex-start" }} onClick={() => exportJSON(`${draft.profile.id}-${draft.payload.action.kind}-draft.json`, draft)}>Export unsigned draft</Button></Stack>}
        </Paper>}
        {tab === "history" && <Stack gap={2}><Typography variant="h6" component="h2">Local operational history</Typography><Typography color="text.secondary">Configuration revision {status.revision}. This local activity log is not a tamper-proof audit record.</Typography>{status.events.length === 0 ? <Alert severity="info">No configuration changes recorded.</Alert> : [...status.events].reverse().map((event) => <Paper variant="outlined" sx={{ p: 2 }} key={event.revision}><Typography>{event.action} · {event.profileId}</Typography><Typography variant="caption">{new Date(event.at).toLocaleString()} · Revision {event.revision}</Typography></Paper>)}</Stack>}
      </Box>
    </>}
  </Box>;
}
