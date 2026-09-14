import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, Typography } from "@mui/material";
import WorkerSetup from "./WorkerSetup.jsx";
import ProgressWindow from "./ProgressWindow.jsx";
import Backups from "./Backups.jsx";

export default function Worker({ client, onChange }) {
  const [worker, setWorker] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stopApproved, setStopApproved] = useState(false);
  const [doctor, setDoctor] = useState(null);
  const [setupCreated, setSetupCreated] = useState(false);
  const preflight = async () => {
    setBusy(true); setError(""); setDoctor(null);
    try { setDoctor(await client("/v1/worker/doctor", {})); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
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
    <Typography>Your validator runs independently of this panel and its operator service. Observation workers can be created and started here. An existing signing worker can be attached for status, fixed maintenance proofs and a reviewed stop; its host service retains its keys and start authority.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {setupCreated && <Alert severity="success">Observation worker created. Run preflight checks and review the results before starting it. Signing is not enabled.</Alert>}
    <Button variant="outlined" disabled={busy} onClick={preflight} sx={{ alignSelf: "flex-start" }}>Run preflight checks</Button>
    {doctor && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography component="h3" variant="h6">{doctor.status === "checks-passed" ? "Observation checks passed" : "Setup needs attention"}</Typography>
      <Typography variant="caption">Checked {new Date(doctor.checkedAt).toLocaleString()} · Configuration revision {doctor.revision}</Typography>
      <Typography sx={{ my: 2 }}>{doctor.notice}</Typography>
      <Stack gap={1}>{[...doctor.checks].sort((a, b) => ({ failed: 0, unknown: 1, passed: 2 }[a.status] - { failed: 0, unknown: 1, passed: 2 }[b.status])).map((check) => <Alert key={check.id} severity={check.status === "failed" ? "error" : check.status === "passed" ? "success" : "info"}>
        <Typography fontWeight={600}>{check.id.replaceAll("-", " ")} · {check.status}</Typography>{check.message}
      </Alert>)}</Stack>
    </Paper>}
    {!worker && !error && <Typography role="status">Reading worker status…</Typography>}
    {worker?.state === "unregistered" && <WorkerSetup client={client} onCreated={async () => { setSetupCreated(true); setWorker(await client("/v1/worker")); if (onChange) await onChange(); }} />}
    {worker && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
      <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 2 }}><Typography component="h3" variant="h6" sx={{ overflowWrap: "anywhere" }}>{worker.instanceId || "No worker registered"}</Typography><Chip size="small" label={worker.state} /></Stack>
      <Typography sx={{ mb: 2 }}>{worker.message}</Typography>
      {!worker.registered && <Typography>Complete setup above, or use the local worker-register command for an existing reviewed worker directory. Instructions are in OPERATOR.md.</Typography>}
      {worker.registered && <>
        <Typography variant="caption">Registered binary SHA-256</Typography><Typography sx={{ overflowWrap: "anywhere", mb: 2 }}>{worker.binarySha256}</Typography>
        <Typography variant="caption">Reviewed configuration SHA-256</Typography><Typography sx={{ overflowWrap: "anywhere", mb: 2 }}>{worker.configSha256}</Typography>
        {worker.health && <>
          <Typography>Mode: {worker.health.mode} · Process: {worker.health.pid}</Typography>
          {worker.health.networkBinding ? <Typography sx={{ overflowWrap: "anywhere", my: 1 }}>Pinned networks: EVM {worker.health.networkBinding.evmNetworkId} · Koinos {worker.health.networkBinding.koinosNetworkId}</Typography> : <Alert severity="warning" sx={{ my: 1 }}>This worker does not report pinned network identities. Its chain progress does not verify which networks supplied the data.</Alert>}
          <Typography sx={{ mb: 2 }}>Started: {new Date(worker.health.startedAt).toLocaleString()}</Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, my: 2 }}>
            {Object.entries(worker.health.chains).map(([chain, health]) => <Box key={chain}><Typography component="h4" fontWeight={600}>{chain === "evm" ? "Ethereum / EVM" : "Koinos"}</Typography><Typography>Status: {health.status}</Typography>{health.status === "network-unverified" && <Alert severity="error" sx={{ my: 1 }}>Observation is paused because this RPC network identity cannot be verified. Check RPC access and the configured network; saved progress is retained.</Alert>}<Typography>Saved block: {health.height}</Typography><Typography variant="caption">{health.updatedAt && !health.updatedAt.startsWith("0001") ? `Checked ${new Date(health.updatedAt).toLocaleString()}` : "No chain observation yet"}</Typography></Box>)}
          </Box>
          <Typography component="h4" fontWeight={600}>Recorded transfer activity</Typography>
          <Typography variant="body2">Counters cover this process only. Compare the same process and tracking start time across an observation window. Stored signature changes and completion states do not prove valid signatures, finality or available quorum.</Typography>
          {!worker.health.activity && <Alert severity="info">This worker does not report transfer activity. Block polling alone cannot establish progress after an update.</Alert>}
          {Object.entries(worker.health.activity || {}).map(([direction, activity]) => <Paper key={direction} variant="outlined" sx={{ p: 2, my: 1 }}>
            <Typography fontWeight={600}>{direction === "evm-to-koinos" ? "EVM → Koinos" : "Koinos → EVM"}</Typography>
            {!activity.enabled || !activity.complete ? <Alert severity="warning">Activity evidence is incomplete{activity.problem ? `: ${activity.problem}` : "."}. These counters cannot establish progress.</Alert> : <Typography variant="caption">Tracking since {new Date(activity.startedAt).toLocaleString()}</Typography>}
            <Typography>New records: {activity.newRecords} · Successful writes: {activity.writes}</Typography>
            <Typography>Local-address signature changes: {activity.localSignatureChanges} · Other signature changes: {activity.otherSignatureChanges}</Typography>
            <Typography>Completion transitions: {activity.completionTransitions}</Typography>
            <Typography variant="caption">{activity.lastWriteAt && !activity.lastWriteAt.startsWith("0001") ? `Last write ${new Date(activity.lastWriteAt).toLocaleString()}` : "No transaction writes recorded in this process"}</Typography>
          </Paper>)}
        </>}
        {worker.state === "unavailable" && worker.mode !== "signing" && <Button variant="contained" disabled={busy} onClick={() => act("start")}>Start observation worker</Button>}
        {worker.state === "unavailable" && worker.mode === "signing" && <Alert severity="info">Start this signing worker through its independently reviewed host service, then reload its status here.</Alert>}
        {worker.state === "running" && <Stack alignItems="flex-start" gap={1}><FormControlLabel control={<Checkbox checked={stopApproved} onChange={(e) => setStopApproved(e.target.checked)} />} label={worker.mode === "signing" ? "Stop this signing worker and suspend its bridge activity" : "Stop this worker and suspend its event observation"} /><Button variant="outlined" disabled={busy || !stopApproved} onClick={() => act("stop")}>Stop worker gracefully</Button></Stack>}
      </>}
    </Paper>}
    {worker?.registered && <Backups client={client} worker={worker} />}
    {worker?.registered && <ProgressWindow client={client} running={worker.state === "running"} />}
  </Stack>;
}
