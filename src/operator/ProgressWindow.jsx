import React, { useEffect, useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { exportJSON } from "./client";

export default function ProgressWindow({ client, running }) {
  const [state, setState] = useState(null);
  const [seconds, setSeconds] = useState("300");
  const [error, setError] = useState("");
  const [readError, setReadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setState(null); setError(""); setReadError(""); setPending(null);
    const refresh = async () => {
      try { const next = await client("/v1/worker/progress"); if (!cancelled) { setState(next); setReadError(""); } }
      catch (e) { if (!cancelled) { setState(null); setReadError(e.message); } }
    };
    refresh();
    const refreshTimer = setInterval(refresh, 5000);
    const clockTimer = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(refreshTimer); clearInterval(clockTimer); };
  }, [client]);
  const window = state?.window;
  const collecting = window?.evaluation.state === "collecting";
  const validDuration = Number.isInteger(Number(seconds)) && Number(seconds) >= 30 && Number(seconds) <= 86400;
  const run = async (path, request) => {
    setBusy(true); setError("");
    try {
      const result = await client(path, request);
      setState((previous) => ({ ...previous, window: result })); setPending(null);
      setState(await client("/v1/worker/progress"));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const start = () => {
    const request = pending || { id: `progress-${crypto.randomUUID()}`, expectedRevision: state.revision, minimumSeconds: Number(seconds) };
    setPending(request);
    return run("/v1/worker/progress/start", request);
  };
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}><Stack gap={2}>
    <Typography component="h3" variant="h6">Observe progress over time</Typography>
    <Typography>Capture a baseline and a final observation from this worker. Keep the same process running throughout the window, then finish within five minutes of the minimum duration.</Typography>
    <Alert severity="info">This records local transfer-store changes. It does not verify signatures, finality or available quorum, and it cannot authorize an update.</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    {readError && <Alert severity="error">{readError}</Alert>}
    {state?.error && <Alert severity="error">{state.error}</Alert>}
    {!collecting && <>
      <TextField label="Minimum observation seconds" type="number" value={seconds} disabled={busy || !!pending} onChange={(e) => setSeconds(e.target.value)} inputProps={{ min: 30, max: 86400, step: 1 }} helperText="30 seconds to 24 hours. Choose the duration required by your test plan." />
      <Button variant="outlined" disabled={busy || !running || !state || !!state.error || !validDuration} onClick={start}>{pending ? "Retry starting the same window" : "Start progress window"}</Button>
      {pending && <Button disabled={busy} onClick={() => setPending(null)}>Discard pending start request</Button>}
    </>}
    {window && <>
      <Typography component="h4" fontWeight={600}>{({ collecting: "Collecting observations", invalid: "Invalid observation window", "recorded-progress": "Recorded activity changed", "no-recorded-progress": "No transfer progress recorded" })[window.evaluation.state]}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Window: {window.id}</Typography>
      <Typography>Process {window.baseline.worker.health.pid} · Started {new Date(window.baseline.worker.health.startedAt).toLocaleString()}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Artifact SHA-256: {window.baseline.worker.binarySha256}</Typography>
      <Typography>Baseline: {new Date(window.baseline.sampledAt).toLocaleString()}</Typography>
      <Typography>Finish between {new Date(window.earliestFinish).toLocaleString()} and {new Date(window.expiresAt).toLocaleString()}</Typography>
      <Typography>{window.evaluation.reason}</Typography>
      {collecting && <>
        <Typography role="status">{now < Date.parse(window.earliestFinish) ? `${Math.ceil((Date.parse(window.earliestFinish) - now) / 1000)} seconds until the earliest finish.` : now >= Date.parse(window.expiresAt) ? "Window expired. Finish it to record the failure and start again." : "Minimum duration elapsed. Collect the final observation now."}</Typography>
        <Button variant="contained" disabled={busy || now < Date.parse(window.earliestFinish)} onClick={() => run("/v1/worker/progress/finish", { id: window.id })}>Finish progress window</Button>
      </>}
      {Object.entries(window.evaluation.directions || {}).map(([direction, delta]) => <Paper key={direction} variant="outlined" sx={{ p: 2 }}>
        <Typography fontWeight={600}>{direction === "evm-to-koinos" ? "EVM → Koinos" : "Koinos → EVM"}</Typography>
        <Typography>New records: {delta.newRecords} · Successful writes: {delta.writes}</Typography>
        <Typography>Local-address signature changes: {delta.localSignatureChanges} · Other signature changes: {delta.otherSignatureChanges}</Typography>
        <Typography>Completion transitions: {delta.completionTransitions}</Typography>
      </Paper>)}
      {!collecting && <Typography>Historical result: {window.final?.sampledAt ? new Date(window.final.sampledAt).toLocaleString() : "No final observation"}. Recorded activity in both directions: {window.evaluation.bothDirectionsRecorded ? "yes" : "no"}. Local-address signature changes in both directions: {window.evaluation.bothLocalSignaturesChanged ? "yes" : "no"}.</Typography>}
      <Button variant="outlined" onClick={() => exportJSON(`${window.id}.json`, window)}>Export observation receipt</Button>
    </>}
  </Stack></Paper>;
}
