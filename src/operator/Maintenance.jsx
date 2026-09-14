import React, { useEffect, useState } from "react";
import { Alert, Button, Checkbox, FormControlLabel, Paper, Stack, TextField, Typography } from "@mui/material";
import { exportJSON } from "./client";
import Participation from "./Participation.jsx";

export default function Maintenance({ client, revision, onChange }) {
  const [state, setState] = useState(null);
  const [raw, setRaw] = useState("");
  const [review, setReview] = useState(null);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let cancelled = false; client("/v1/maintenance").then((value) => { if (!cancelled) setState(value); }).catch((e) => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [client, revision]);
  const run = async (work) => { setBusy(true); setError(""); try { await work(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const verify = () => run(async () => {
    setReview(null); setConsent(false);
    const envelope = JSON.parse(raw);
    const report = await client("/v1/maintenance/verify", envelope);
    setReview({ envelope, report, revision: state.revision });
  });
  const endorse = () => run(async () => {
    const envelope = await client("/v1/maintenance/endorse", { envelope: review.envelope, digest: review.report.digest, expectedRevision: review.revision });
    setRaw(JSON.stringify(envelope, null, 2)); setConsent(false);
    const report = await client("/v1/maintenance/verify", envelope);
    setReview({ envelope, report, revision: review.revision });
    setState(await client("/v1/maintenance")); await onChange();
  });
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={2}>
    <Typography component="h3" variant="h6">Coordinate maintenance</Typography>
    <Typography>Review a shared schedule and add this operator’s endorsement. Every member of your locally configured roster must endorse the same plan. The reservation covers the whole schedule, including time between windows.</Typography>
    <Alert severity="info">A reservation records schedule consent. It does not install software or prove current quorum. Activation must check fresh participation and the preceding operator’s verified progress.</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    {state && (!state.initialized || !state.policyConfigured) && <Alert severity="warning">{state.identityError} {state.policyError} Follow MAINTENANCE.md to initialize a separate scheduling identity and install the locally reviewed roster and route thresholds.</Alert>}
    {state?.policyConfigured && <>
      <Typography sx={{ overflowWrap: "anywhere" }}>Policy {state.policy.id} · {state.policy.members.length} members · Expires {new Date(state.policy.expiresAt).toLocaleString()}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Policy SHA-256: {state.policyDigest}</Typography>
      {state.policy.routes.map((route) => <Stack key={route.id} gap={1}>
        <Typography fontWeight={600}>{route.id}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>EVM {route.evm.networkId} · {route.evm.contract}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Koinos {route.koinos.networkId} · {route.koinos.contract}</Typography>
        <Typography>Declared requirements: {route.stages.map((stage) => `${stage.name} ${stage.required}/${stage.participants.length}`).join(" · ")}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Review evidence: {route.evidence}</Typography>
      </Stack>)}
    </>}
    <TextField label="Portable maintenance plan JSON" multiline minRows={4} maxRows={10} fullWidth disabled={busy} value={raw} onChange={(e) => { setRaw(e.target.value); setReview(null); setConsent(false); }} inputProps={{ spellCheck: false }} />
    <Button variant="outlined" disabled={busy || !raw || !state?.policyConfigured} onClick={verify}>Review maintenance plan</Button>
    {review && <Stack gap={2}>
      <Typography component="h4" fontWeight={600}>{review.report.state === "reserved" ? "All schedule endorsements collected" : "Waiting for schedule endorsements"}</Typography>
      <Typography sx={{ overflowWrap: "anywhere" }}>Plan SHA-256: {review.report.digest}</Typography>
      {review.envelope.plan.windows.map((window) => <Paper variant="outlined" key={window.instanceId} sx={{ p: 2 }}>
        <Typography sx={{ overflowWrap: "anywhere" }}>{window.instanceId}</Typography>
        <Typography>{new Date(window.start).toLocaleString()} – {new Date(window.end).toLocaleString()}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Release: {window.releaseDigest}</Typography>
      </Paper>)}
      <Typography sx={{ overflowWrap: "anywhere" }}>Endorsed: {review.report.endorsed.join(", ") || "None"}. Missing: {review.report.missing.join(", ") || "None"}.</Typography>
      <Alert severity="warning">{review.report.notice}</Alert>
      <FormControlLabel control={<Checkbox checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} />} label="I reserve this complete schedule on my operator. Conflicting plans stay blocked until its final window ends. My own update also requires separate release approval." />
      <Button variant="contained" disabled={busy || !consent || !state?.initialized} onClick={endorse}>Endorse schedule locally</Button>
      <Button onClick={() => exportJSON("maintenance-plan.json", review.envelope)}>Export portable schedule</Button>
    </Stack>}
    {!!state?.reservations.length && <>
      <Typography component="h4" fontWeight={600}>Locally recorded reservations</Typography>
      {state.reservations.map((entry) => <Stack key={entry.endorsements[0].planDigest} gap={1}>
        <Typography>{entry.plan.id} · Reserved through {new Date(entry.plan.windows[entry.plan.windows.length - 1].end).toLocaleString()}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>{entry.endorsements[0].planDigest}</Typography>
        <Button onClick={() => exportJSON("local-maintenance-endorsement.json", entry)}>Export recorded endorsement</Button>
      </Stack>)}
    </>}
    <Participation client={client} envelope={review?.report.state === "reserved" ? review.envelope : null} />
  </Stack></Paper>;
}
