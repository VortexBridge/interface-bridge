import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, MenuItem, Paper, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";

import { createOperatorClient, scopeOperatorClient, exportJSON, observedStatus } from "./client";
import Incidents from "./Incidents.jsx";
import Lifecycle from "./Lifecycle.jsx";
import Proposals from "./Proposals.jsx";
import Recovery from "./Recovery.jsx";
import Transfers from "./Transfers.jsx";
import Updates from "./Updates.jsx";
import Worker from "./Worker.jsx";

const labels = { overview: "Overview", lifecycle: "Lifecycle", worker: "Validator", setup: "Add deployment", contracts: "Contracts", transfers: "Transfers", incidents: "Incidents", recovery: "Recovery", proposals: "Proposals", updates: "Updates", history: "History" };
const fieldStyle = { minWidth: 0, flex: "1 1 240px" };
const blankProfile = { schemaVersion: 1, id: "", name: "", family: "evm", environment: "local", networkId: "31337", bridgeChainId: 2, contract: "", codec: "", sourceCommit: "", codeHash: "", reviewed: false, reviewEvidence: "" };

function Detail({ label, children }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography component="div" sx={{ overflowWrap: "anywhere" }}>{children ?? "Unknown"}</Typography></Box>;
}

function OperatorWorkspace({ client, initialStatus, capabilities }) {
  const [status, setStatus] = useState(initialStatus);
  const [tab, setTab] = useState("overview");
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(Date.now());
  const [profile, setProfile] = useState(blankProfile);
  const [rpc, setRPC] = useState("http://127.0.0.1:8545");
  const [validated, setValidated] = useState(null);

  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!client) return undefined;
    let cancelled = false;
    const timer = setInterval(async () => {
      try { const next = await client("/v1/status"); if (!cancelled) { setStatus(next); setConnectionError(""); } }
      catch { if (!cancelled) setConnectionError("Operator connection lost. Displayed observations may be stale."); }
    }, 10000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client]);

  const perform = async (work) => {
    setBusy(true); setError(""); setMessage("");
    try { await work(); } catch (e) { setError(e.message || "The operator could not complete this action."); }
    finally { setBusy(false); }
  };
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

  return <Box sx={{ maxWidth: 1120, mx: "auto", pb: 6 }}>
    {connectionError && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{connectionError}</Alert>}
    {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
    {message && <Alert severity="info" role="status" sx={{ mb: 2 }}>{message}</Alert>}
    <Alert severity="info" sx={{ mb: 2 }}>The browser receives public operational evidence only. Managed signer secrets stay in the protected host terminal, and this service exposes no unlock, arbitrary-signing or command-execution endpoint.</Alert>
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, minWidth: 0 }}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile aria-label="Operator sections" sx={{ minWidth: 0, width: "100%" }}>
        {Object.entries(labels).map(([value, label]) => <Tab key={value} value={value} label={label} id={`operator-tab-${value}`} aria-controls={`operator-panel-${value}`} />)}
      </Tabs>
    </Stack>
    <Box role="tabpanel" id={`operator-panel-${tab}`} aria-labelledby={`operator-tab-${tab}`}>
      {tab === "worker" && <Worker client={client} onChange={async () => setStatus(await client("/v1/status"))} />}
      {tab === "lifecycle" && <Lifecycle client={client} />}
      {tab === "transfers" && <Transfers client={client} />}
      {tab === "incidents" && <Incidents client={client} />}
      {tab === "recovery" && <Recovery client={client} />}
      {tab === "proposals" && <Proposals client={client} profiles={status.profiles} />}
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
      {tab === "history" && <Stack gap={2}><Typography variant="h6" component="h2">Local operational history</Typography><Typography color="text.secondary">Configuration revision {status.revision}. This local activity log is not a tamper-proof audit record.</Typography>{status.events.length === 0 ? <Alert severity="info">No configuration changes recorded.</Alert> : [...status.events].reverse().map((event) => <Paper variant="outlined" sx={{ p: 2 }} key={event.revision}><Typography>{event.action} · {event.profileId}</Typography><Typography variant="caption">{new Date(event.at).toLocaleString()} · Revision {event.revision}</Typography></Paper>)}</Stack>}
    </Box>
  </Box>;
}

export default function Operate() {
  const [endpoint, setEndpoint] = useState("http://127.0.0.1:3021");
  const [token, setToken] = useState("");
  const [rootClient, setRootClient] = useState(null);
  const [instances, setInstances] = useState([]);
  const [selectedInstance, setSelectedInstance] = useState("default");
  const [workspace, setWorkspace] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadWorkspace = async (api, id) => {
    const scoped = scopeOperatorClient(api, id);
    const [status, capabilities] = await Promise.all([scoped("/v1/status"), scoped("/v1/capabilities")]);
    return { client: scoped, status, capabilities, id };
  };
  const connect = async () => {
    setBusy(true); setError("");
    try {
      const api = createOperatorClient(endpoint, token);
      const inventory = await api("/v1/instances");
      const next = await loadWorkspace(api, "default");
      setInstances(inventory.instances); setSelectedInstance("default"); setRootClient(() => api); setWorkspace(next); setToken("");
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const selectInstance = async (id) => {
    // Unmount the previous workspace before awaiting the next scope. Its pending
    // requests retain their original client and cannot populate the new view.
    setWorkspace(null); setSelectedInstance(id); setBusy(true); setError("");
    try {
      const inventory = await rootClient("/v1/instances");
      setInstances(inventory.instances);
      setWorkspace(await loadWorkspace(rootClient, id));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const disconnect = () => { setWorkspace(null); setRootClient(null); setInstances([]); setToken(""); setError(""); };

  return <Box sx={{ maxWidth: 1120, mx: "auto", pb: 6 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={2} sx={{ mb: 3 }}>
      <Box><Typography variant="h4" component="h1">Operate your bridge</Typography><Typography color="text.secondary">Your validator, your approvals, your infrastructure.</Typography></Box>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Chip label={rootClient ? "Private operator connected" : "Operator disconnected"} color={rootClient ? "success" : "default"} variant="outlined" />
        {rootClient && <Button disabled={busy} onClick={disconnect} size="small">Disconnect</Button>}
      </Stack>
    </Stack>
    {error && <Alert severity="error" role="alert" sx={{ mb: 2 }}>{error}</Alert>}
    {!rootClient ? <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2">Connect your operator</Typography>
      <Typography sx={{ my: 2 }}>Install the reviewed signed host bundle with <code>vortex-host install</code>, run its <code>doctor</code> and <code>authorize</code> checks, then start the bundled user service. For a remote host, forward its loopback port through an SSH tunnel. Use the token in the private state directory’s access-token file; it stays in this page’s memory.</Typography>
      <Alert severity="info" sx={{ mb: 2 }}>Installation never activates signing. After connecting, Lifecycle shows the exact installed artifact, first-run state and the documented protected-terminal activation command.</Alert>
      <Box component="form" onSubmit={(e) => { e.preventDefault(); connect(); }}>
        <Stack gap={2}><TextField label="Local operator address" value={endpoint} disabled={busy} onChange={(e) => setEndpoint(e.target.value)} fullWidth required />
          <TextField label="Operator access token" type="password" autoComplete="off" value={token} disabled={busy} onChange={(e) => setToken(e.target.value)} fullWidth required />
          <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start" }}>{busy ? "Connecting…" : "Connect operator"}</Button></Stack>
      </Box>
    </Paper> : <>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} alignItems={{ xs: "stretch", sm: "center" }}>
          <TextField select fullWidth label="Local bridge instance" value={selectedInstance} disabled={busy} onChange={(e) => selectInstance(e.target.value)}>
            {instances.map((instance) => <MenuItem value={instance.id} key={instance.id}>{instance.id === "default" ? "Default instance" : instance.id} · {instance.deploymentCount} {instance.deploymentCount === 1 ? "deployment" : "deployments"}</MenuItem>)}
          </TextField>
          <Button disabled={busy} onClick={() => selectInstance(selectedInstance)} sx={{ flexShrink: 0 }}>Reload instance</Button>
        </Stack>
        <Typography variant="body2" sx={{ mt: 2 }}>These instances share this local operator and host. Separate storage does not establish independent validators. Actions apply to the selected instance; running workers continue when you switch.</Typography>
      </Paper>
      {busy && <Typography role="status" sx={{ mb: 2 }}>Loading selected instance…</Typography>}
      {workspace && <OperatorWorkspace key={workspace.id} client={workspace.client} initialStatus={workspace.status} capabilities={workspace.capabilities} />}
    </>}
  </Box>;
}
