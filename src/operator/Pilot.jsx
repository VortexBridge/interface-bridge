import React, { useEffect, useState } from "react";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import { exportJSON } from "./client";

function Gate({ title, detail, complete }) {
  return <Paper variant="outlined" sx={{ p: 2 }}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}>
      <Typography fontWeight={600}>{title}</Typography>
      <Chip size="small" color={complete ? "success" : "default"} label={complete ? "Recorded locally" : "Pending"} />
    </Stack>
    <Typography color="text.secondary" sx={{ mt: 1 }}>{detail}</Typography>
  </Paper>;
}

export default function Pilot({ client, enabled }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = async () => {
    setBusy(true); setError("");
    try { setState(await client("/v1/pilot")); } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    client("/v1/pilot").then((value) => { if (!cancelled) setState(value); }).catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [client, enabled]);
  const accepted = state?.state === "locally-accepted";
  const passedPhases = new Set((state?.exerciseReceipts || []).filter((receipt) => receipt.claim.result === "passed").map((receipt) => receipt.claim.phase));
  const exerciseComplete = !!state?.requiredExercisePhases?.length && state.requiredExercisePhases.every((phase) => passedPhases.has(phase));
  return <Stack gap={2}>
    <Typography variant="h6" component="h2">Three-operator pilot</Typography>
    <Alert severity="warning">Prompt 06 requires three independent people, each controlling a separate host, cloud recovery, signing-key recovery, backup and release decision. Three processes, instances or virtual machines controlled by one person do not qualify.</Alert>
    {!enabled && <Alert severity="info">Install a validator service that reports pilot acceptance support before creating a declaration. The rest of the operator console remains available.</Alert>}
    {error && <Alert severity="error">{error}</Alert>}
    <Gate title="This operator’s signed acceptance" complete={accepted} detail="Created in the protected host terminal with the local maintenance identity. It lists all required duties and sanitized evidence digests." />
    <Gate title="Three independent control domains" complete={false} detail="A human reviewer must compare the three sanitized evidence packages. Cryptographic identities alone cannot prove separate people or accounts." />
    <Gate title="This operator’s exercise receipts" complete={exerciseComplete} detail="Bidirectional quorum, unexpected outage, maintenance, disagreement, persistence failure, coordinator loss, restart, backup restore and fenced replacement must each be recorded from retained evidence." />
    {state && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={1}>
        <Typography fontWeight={600}>Local declaration</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Instance: {state.instanceId || "Maintenance identity not initialized"}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Maintenance public key: {state.maintenancePublicKey || "Unavailable"}</Typography>
        <Typography>Status: {state.state}</Typography>
        {state.problem && <Alert severity="info">{state.problem}</Alert>}
        {state.acceptance && <>
          <Typography>Operator alias: {state.acceptance.claim.operatorAlias}</Typography>
          <Typography>Host profile: {state.acceptance.claim.hostProfile}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Acceptance SHA-256: {state.acceptanceDigest}</Typography>
          <Typography>Expires: {new Date(state.acceptance.claim.expiresAt).toLocaleString()}</Typography>
          <Button sx={{ alignSelf: "flex-start" }} onClick={() => exportJSON(`${state.acceptance.claim.operatorAlias}-pilot-acceptance.json`, state.acceptance)}>Export signed acceptance</Button>
        </>}
      </Stack>
    </Paper>}
    {!!state?.requiredExercisePhases?.length && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={1}>
        <Typography fontWeight={600}>Local exercise coverage</Typography>
        <Typography>{passedPhases.size} of {state.requiredExercisePhases.length} required phases recorded as passed by this operator.</Typography>
        {state.exerciseProblem && <Alert severity="error">{state.exerciseProblem}</Alert>}
        <Stack direction="row" gap={1} flexWrap="wrap">
          {state.requiredExercisePhases.map((phase) => <Chip key={phase} size="small" color={passedPhases.has(phase) ? "success" : "default"} label={`${phase}: ${passedPhases.has(phase) ? "recorded" : "pending"}`} />)}
        </Stack>
      </Stack>
    </Paper>}
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={2}>
        <Typography fontWeight={600}>Protected-terminal step</Typography>
        <Typography>Create a private mode-0600 request from the pilot template, review every duty and evidence digest, then run:</Typography>
        <Typography component="code" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", bgcolor: "action.hover", p: 2 }}>vortex-operator --data /private/operator --pilot-claim-file /private/pilot-acceptance.request.json pilot-accept</Typography>
        <Typography>The terminal returns the signed public declaration. After each real exercise, create a private request bound to that declaration and run:</Typography>
        <Typography component="code" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", bgcolor: "action.hover", p: 2 }}>vortex-operator --data /private/operator --pilot-exercise-file /private/pilot-exercise.request.json pilot-record</Typography>
        <Typography>Keep raw host evidence, endpoints and credentials outside Git. Share only signed declarations, signed exercise receipts and separately reviewed sanitized evidence summaries.</Typography>
      </Stack>
    </Paper>
    <Alert severity="info">{state?.notice || "Loading local pilot state…"}</Alert>
    <Button variant="outlined" disabled={busy || !enabled} onClick={load} sx={{ alignSelf: "flex-start" }}>{busy ? "Refreshing…" : "Refresh pilot state"}</Button>
  </Stack>;
}
