import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, TextField, Typography } from "@mui/material";

const color = (state) => (["active", "verified", "installed"].includes(state) ? "success" : ["invalid", "recovery-required", "disabled"].includes(state) ? "error" : "default");

function Value({ label, children }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{ overflowWrap: "anywhere" }}>{children || "Unknown"}</Typography></Box>;
}

export default function Lifecycle({ client }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setState(await client("/v1/lifecycle")); setError(""); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [client]);
  useEffect(() => { refresh(); }, [refresh]);
  return <Stack gap={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}>
      <Box><Typography variant="h6" component="h2">Installation and signer lifecycle</Typography><Typography color="text.secondary">Verified local records from the managed host bundle.</Typography></Box>
      <Button variant="outlined" disabled={busy} onClick={refresh}>{busy ? "Checking…" : "Verify local state"}</Button>
    </Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {!state && !error && <Typography role="status">Checking managed installation…</Typography>}
    {state && <>
      {!state.supported && <Alert severity="info">{state.installation.problem} Install the reviewed host bundle first, then connect to the operator service it starts.</Alert>}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack gap={2}>
          <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="h6" component="h3">Managed installation</Typography><Chip label={state.installation.state} color={color(state.installation.state)} /></Stack>
          {state.installation.problem && <Alert severity="error">{state.installation.problem}</Alert>}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Value label="Managed installation instance">{state.instanceId}</Value><Value label="Version / sequence">{state.installation.version ? `${state.installation.version} / ${state.installation.sequence}` : "Unknown"}</Value>
            <Value label="Release digest">{state.installation.releaseDigest}</Value><Value label="Installed artifact SHA-256">{state.installation.artifactSha256}</Value>
            <Value label="Platform">{state.installation.platform}</Value><Value label="Exact files verified">{state.installation.verified ? "Yes" : "No"}</Value>
          </Box>
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack gap={2}>
          <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="h6" component="h3">Managed signer</Typography><Chip label={state.signer.state} color={color(state.signer.state)} /></Stack>
          {state.signer.problem && <Alert severity="error">{state.signer.problem}</Alert>}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <Value label="Process evidence">{state.signer.processEvidence}</Value><Value label="Retained operations">{`${state.signer.operationCount} total · ${state.signer.unfinalizedCount} unfinalized`}</Value>
            <Value label="Policy SHA-256">{state.signer.policySha256}</Value><Value label="Reconciled checkpoint">{state.signer.checkpoint}</Value>
          </Box>
          <Alert severity="info">{state.authority.notice}</Alert>
          <TextField label="Documented activation command" value={state.authority.activation} inputProps={{ readOnly: true }} helperText="Run this shape of command with the private paths on the validator host. The passphrase is read there with echo disabled; never paste it into this page." fullWidth multiline minRows={2} />
          <Typography variant="body2">Safe stop: {state.authority.drain}</Typography>
        </Stack>
      </Paper>
      <Typography variant="h6" component="h3">Reviewed routes</Typography>
      {!state.routes.length && <Alert severity="warning">No managed route configuration is available.</Alert>}
      {state.routes.map((route) => <Paper variant="outlined" sx={{ p: 2 }} key={route.direction}>
        <Stack gap={1}><Typography fontWeight={600}>{route.direction === "evm-to-koinos" ? "EVM → Koinos" : "Koinos → EVM"}</Typography><Value label="Source">{`${route.source.name} · network ${route.source.networkId} · ${route.source.contract}`}</Value><Value label="Destination">{`${route.destination.name} · network ${route.destination.networkId} · ${route.destination.contract}`}</Value><Value label="Signing identity">{route.signerAddress}</Value>{route.previousSignerAddress && <Value label="Retired identity requiring finalized fencing">{route.previousSignerAddress}</Value>}<Value label="Signature lifetime">{`${route.signatureLifetimeMs} ms`}</Value></Stack>
      </Paper>)}
    </>}
  </Stack>;
}
