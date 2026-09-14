import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Typography } from "@mui/material";

export default function Worker({ client }) {
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopApproved, setStopApproved] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const next = await client("/v1/worker");
        if (!cancelled) { setWorker(next); setError(""); }
      } catch (e) { if (!cancelled) { setError(e.message); setWorker(null); } }
    };
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client]);
  useEffect(() => { setStopApproved(false); }, [worker?.health?.startedAt]);
  const act = async (action) => {
    setBusy(true); setError("");
    try {
      const request = { registrationDigest: worker.registrationDigest, ...(action === "stop" ? { pid: worker.health.pid, startedAt: worker.health.startedAt } : {}) };
      const next = await client(`/v1/worker/${action}`, request);
      setWorker(next); setStopApproved(false);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <Stack gap={2}>
    <Typography variant="h6" component="h2">Validator process</Typography>
    <Typography>Your validator runs independently of this panel and its operator service. This build manages observation workers; they do not load keys or exchange signatures.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {!worker && !error && <Typography role="status">Reading worker status…</Typography>}
    {worker && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 2 }}><Typography component="h3" variant="h6" sx={{ overflowWrap: "anywhere" }}>{worker.instanceId || "No worker registered"}</Typography><Chip size="small" label={worker.state} /></Stack>
      <Typography sx={{ mb: 2 }}>{worker.message}</Typography>
      {!worker.registered && <Typography>Use the local worker-register command to select your private validator directory and reviewed binary hash. Registration instructions are in OPERATOR.md.</Typography>}
      {worker.registered && <>
        <Typography variant="caption">Registered binary SHA-256</Typography><Typography sx={{ overflowWrap: "anywhere", mb: 2 }}>{worker.binarySha256}</Typography>
        <Typography variant="caption">Reviewed configuration SHA-256</Typography><Typography sx={{ overflowWrap: "anywhere", mb: 2 }}>{worker.configSha256}</Typography>
        {worker.health && <>
          <Typography>Mode: {worker.health.mode} · Process: {worker.health.pid}</Typography>
          <Typography sx={{ mb: 2 }}>Started: {new Date(worker.health.startedAt).toLocaleString()}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, my: 2 }}>
            {Object.entries(worker.health.chains).map(([chain, health]) => <Box key={chain}><Typography component="h4" fontWeight={600}>{chain === "evm" ? "Ethereum / EVM" : "Koinos"}</Typography><Typography>Status: {health.status}</Typography><Typography>Saved block: {health.height}</Typography><Typography variant="caption">{health.updatedAt && !health.updatedAt.startsWith("0001") ? `Checked ${new Date(health.updatedAt).toLocaleString()}` : "No chain observation yet"}</Typography></Box>)}
          </Box>
        </>}
        {worker.state === "unavailable" && <Button variant="contained" disabled={busy} onClick={() => act("start")}>Start observation worker</Button>}
        {worker.state === "running" && <Stack alignItems="flex-start" gap={1}><FormControlLabel control={<Checkbox checked={stopApproved} onChange={(e) => setStopApproved(e.target.checked)} />} label="Stop this worker and suspend its event observation" /><Button variant="outlined" disabled={busy || !stopApproved} onClick={() => act("stop")}>Stop worker gracefully</Button></Stack>}
      </>}
    </Paper>}
  </Stack>;
}
