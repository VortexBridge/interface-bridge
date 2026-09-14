import React, { useEffect, useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { exportJSON } from "./client.js";

export default function Backups({ client, worker }) {
  const [inventory, setInventory] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [id, setID] = useState("");
  const [request, setRequest] = useState(null);
  const [verification, setVerification] = useState({});
  const [shownReceipt, setShownReceipt] = useState("");
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try { const next = await client("/v1/worker/backups"); if (!cancelled) { setInventory(next); setError(""); } }
      catch (e) { if (!cancelled) { setError(e.message); setInventory(null); } }
    };
    refresh(); const timer = setInterval(refresh, 5000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client]);
  const create = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    const input = request || { id, registrationDigest: worker.registrationDigest, policyDigest: inventory.policyDigest };
    setRequest(input);
    try { await client("/v1/worker/backups/create", input); setInventory(await client("/v1/worker/backups")); }
    catch (e) { setError(`${e.message} Refresh or retry this same backup ID to check its result.`); }
    finally { setBusy(false); }
  };
  const verify = async (jobID) => {
    setBusy(true); setError("");
    try { const result = await client("/v1/worker/backups/verify", { id: jobID }); setVerification((old) => ({ ...old, [jobID]: result })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const running = inventory?.jobs.some((job) => job.state === "running");
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}>
    <Stack gap={2}>
      <Typography component="h3" variant="h6">Encrypted backups</Typography>
      <Typography>Stop the worker gracefully before creating a consistent snapshot. This action leaves it stopped. Your recovery identity stays on your own host and is never entered here.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {inventory?.problem && <Alert severity="warning">{inventory.problem}</Alert>}
      {!inventory && !error && <Typography role="status">Reading backup inventory…</Typography>}
      {inventory?.configured && <>
        <Typography sx={{ overflowWrap: "anywhere" }}>Recovery recipient: {inventory.recipient}</Typography>
        <Stack component="form" onSubmit={create} gap={1} alignItems="flex-start">
          <TextField required label="Backup ID" value={id} disabled={busy || running} onChange={(e) => { setID(e.target.value); setRequest(null); }} helperText="A unique lowercase name, such as before-security-update. Reusing an ID checks its original job." inputProps={{ pattern: "[a-z][a-z0-9-]{0,62}", maxLength: 63 }} fullWidth />
          <Button type="submit" variant="outlined" disabled={busy || running || !worker.registered || worker.state !== "unavailable" || !id}>{request ? "Retry or check this backup" : "Create encrypted backup"}</Button>
        </Stack>
      </>}
      {inventory?.notice && <Typography variant="body2">{inventory.notice}</Typography>}
      {inventory?.jobs.map((job) => <Paper key={job.request.id} variant="outlined" sx={{ p: 2, minWidth: 0 }}>
        <Stack gap={1}>
          <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{job.request.id} · {job.state}</Typography>
          <Typography variant="caption">Started {new Date(job.startedAt).toLocaleString()}</Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Encrypted for: {job.recoveryRecipient || "Recipient not recorded in this older job. Consult its original local policy."}</Typography>
          <Typography role={job.state === "running" ? "status" : undefined}>{job.message}</Typography>
          {job.receipt && <>
            <Typography sx={{ overflowWrap: "anywhere" }}>Archive: backups/{job.request.id}/archive.age</Typography>
            <Typography>{job.receipt.bytes.toLocaleString()} encrypted bytes</Typography>
            <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>SHA-256: {job.receipt.ciphertextSha256}</Typography>
            <Stack direction={{ xs: "column", sm: "row" }} gap={1}>
              <Button disabled={busy} onClick={() => verify(job.request.id)}>Check archive integrity</Button>
              <Button onClick={() => setShownReceipt(shownReceipt === job.request.id ? "" : job.request.id)}>View backup receipt</Button>
            </Stack>
            {shownReceipt === job.request.id && <>
              <TextField label="Backup receipt JSON" multiline minRows={6} maxRows={12} value={JSON.stringify(job, null, 2)} inputProps={{ readOnly: true }} helperText="Copy and save this receipt with the archive. It contains public metadata, not the recovery identity." fullWidth />
              <Button onClick={() => exportJSON(`vortex-backup-${job.request.id}.json`, job)}>Download receipt JSON</Button>
            </>}
          </>}
          {verification[job.request.id] && <Alert severity={verification[job.request.id].state === "intact" ? "success" : "error"}>
            {verification[job.request.id].state} · Checked {new Date(verification[job.request.id].checkedAt).toLocaleString()}. {verification[job.request.id].message}
          </Alert>}
        </Stack>
      </Paper>)}
      {inventory && inventory.jobs.length === 0 && <Typography>No managed backups recorded for this instance.</Typography>}
    </Stack>
  </Paper>;
}
