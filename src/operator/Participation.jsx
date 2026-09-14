import React, { useEffect, useState } from "react";
import { Alert, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { exportJSON } from "./client";

export default function Participation({ client, envelope }) {
  const [state, setState] = useState(null);
  const [requestJSON, setRequestJSON] = useState("");
  const [response, setResponse] = useState(null);
  const [responsesJSON, setResponsesJSON] = useState("[]");
  const [report, setReport] = useState(null);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let cancelled = false;
    client("/v1/maintenance/participation").then((next) => { if (!cancelled) setState(next); }).catch((e) => { if (!cancelled) setError(e.message); });
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [client]);
  const run = async (work) => { setBusy(true); setError(""); try { await work(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const begin = () => run(async () => {
    const current = await client("/v1/maintenance/participation");
    const request = pending || { id: `participation-${crypto.randomUUID()}`, expectedRevision: current.revision, envelope };
    setPending(request); setReport(null);
    const next = await client("/v1/maintenance/participation/begin", request);
    setState({ request: next }); setPending(null);
  });
  const respond = () => run(async () => {
    setResponse(null);
    const next = await client("/v1/maintenance/participation/respond", JSON.parse(requestJSON));
    setResponse(next);
  });
  const verify = () => run(async () => {
    setReport(null);
    setReport(await client("/v1/maintenance/participation/verify", JSON.parse(responsesJSON)));
  });
  const expired = report && now >= Date.parse(report.expiresAt);
  return <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}><Stack gap={2}>
    <Typography component="h3" variant="h6">Check fresh operator responses</Typography>
    <Typography>Create a short-lived request for this operator’s scheduled release, then exchange it with the other operators. Each response captures that operator’s own worker through its private service.</Typography>
    <Alert severity="info">Signed responses authenticate local observations. A signing worker can prove possession of both locally mapped bridge keys. The requesting operator then reads each contract from its own saved RPC profile and checks those keys against the current validator set. Productive signing, external stages and permission to install remain separate.</Alert>
    {error && <Alert severity="error">{error}</Alert>}
    {state?.error && <Alert severity="warning">{state.error}</Alert>}
    <Button variant="outlined" disabled={busy || (!pending && !envelope)} onClick={begin}>{pending ? "Retry the same participation request" : "Create participation request for reviewed plan"}</Button>
    {!envelope && <Typography>Review a fully endorsed schedule above to create a request. Only an operator with its own approved maintenance window can create it.</Typography>}
    {pending && <Button disabled={busy} onClick={() => setPending(null)}>Discard pending participation request</Button>}
    {state?.request && <>
      <Typography sx={{ overflowWrap: "anywhere" }}>Request {state.request.probe.challenge.id} · Release {state.request.probe.challenge.releaseDigest}</Typography>
      <Typography>Request expires {new Date(state.request.probe.challenge.expiresAt).toLocaleString()}{now >= Date.parse(state.request.probe.challenge.expiresAt) ? " · Expired" : ""}</Typography>
      <TextField label="Participation request to share" multiline minRows={2} maxRows={5} fullWidth value={JSON.stringify(state.request, null, 2)} InputProps={{ readOnly: true }} />
      <Button onClick={() => exportJSON("participation-request.json", state.request)}>Export participation request</Button>
    </>}
    <Typography component="h4" fontWeight={600}>Respond from this operator</Typography>
    <TextField label="Incoming participation request JSON" multiline minRows={3} maxRows={6} fullWidth disabled={busy} value={requestJSON} onChange={(e) => { setRequestJSON(e.target.value); setResponse(null); }} />
    <Button variant="outlined" disabled={busy || !requestJSON} onClick={respond}>Capture and sign local observation</Button>
    {response && <>
      <Typography>Observed {new Date(response.observation.observedAt).toLocaleString()}. The response must be verified within 30 seconds.</Typography>
      <Typography>{response.observation.problem || "Local worker observation captured; signing participation remains unverified."}</Typography>
      <TextField label="Local participation response JSON" multiline minRows={2} maxRows={5} fullWidth value={JSON.stringify(response, null, 2)} InputProps={{ readOnly: true }} />
      <Button onClick={() => exportJSON("participation-response.json", response)}>Export local participation response</Button>
      <Button disabled={busy} onClick={() => run(async () => { const responses = JSON.parse(responsesJSON); if (!Array.isArray(responses)) throw new Error("Enter a JSON array of responses first."); setResponsesJSON(JSON.stringify([...responses.filter((item) => item.observation?.instanceId !== response.observation.instanceId), response], null, 2)); setReport(null); })}>Use local response in collection</Button>
    </>}
    <Typography component="h4" fontWeight={600}>Verify responses on the requesting operator</Typography>
    <TextField label="Participation responses JSON array" multiline minRows={3} maxRows={6} fullWidth disabled={busy} value={responsesJSON} onChange={(e) => { setResponsesJSON(e.target.value); setReport(null); }} />
    <Button variant="outlined" disabled={busy} onClick={verify}>Verify fresh responses</Button>
    <Button component="label" variant="outlined" disabled={busy}>Import and verify responses file
      <input type="file" accept="application/json,.json" hidden onChange={(e) => {
        const file = e.target.files?.[0]; e.target.value = "";
        if (!file) return;
        run(async () => {
          setReport(null);
          if (file.size > 1024 * 1024) throw new Error("Responses file exceeds 1 MiB.");
          const raw = await file.text(); const responses = JSON.parse(raw);
          if (!Array.isArray(responses)) throw new Error("Responses file must contain a JSON array.");
          setResponsesJSON(raw);
          setReport(await client("/v1/maintenance/participation/verify", responses));
        });
      }} />
    </Button>
    {report && <>
      <Alert severity={expired ? "warning" : "info"}>{expired ? "This inspection is stale. Collect and verify fresh responses before relying on it." : report.contractMembershipThresholdsMet ? "Enough non-updating operators proved their keys and finalized contract membership for every route. Productive signing and external stages remain unverified." : report.contractKeyThresholdsMet ? "Enough keys were proved, but at least one contract membership check is missing, mismatched, unfinalized or below its required threshold." : report.allResponded ? "Every operator responded, but the contract key thresholds were not proved." : "Some operator responses are missing."}</Alert>
      <Typography>Checked {new Date(report.checkedAt).toLocaleString()} · Valid until {new Date(report.expiresAt).toLocaleString()}</Typography>
      {report.members.map((member) => <Typography key={member.instanceId} sx={{ overflowWrap: "anywhere" }}>{member.instanceId}: {member.state}. {member.notice}</Typography>)}
      <Typography sx={{ overflowWrap: "anywhere" }}>Missing: {report.missing.join(", ") || "None"}</Typography>
      {!!report.contractObservations?.length && <Stack gap={1}>
        <Typography component="h5" fontWeight={600}>Fresh contract membership</Typography>
        {report.contractObservations.map((observation) => <Paper variant="outlined" sx={{ p: 1.5, minWidth: 0 }} key={`${observation.routeId}-${observation.stage}`}>
          <Typography sx={{ overflowWrap: "anywhere" }}>{observation.routeId} · {observation.family.toUpperCase()}: {observation.state}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Profile {observation.profileId} · Block {observation.block || "Unknown"} · {observation.finality || "Finality unknown"}</Typography>
          <Typography>Contract validators {observation.validators?.length || 0} · Observed quorum {observation.quorum || "Unknown"}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Policy members seen on-chain: {observation.observedMemberIds?.join(", ") || "None observed"}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Non-updating key-proved members seen: {observation.observedEligibleIds?.join(", ") || "None observed"}</Typography>
          <Typography>{observation.notice}</Typography>
        </Paper>)}
      </Stack>}
      {!!report.stages?.length && <Stack gap={1}>
        <Typography component="h5" fontWeight={600}>Route-stage evidence</Typography>
        {report.stages.map((stage) => <Paper variant="outlined" sx={{ p: 1.5 }} key={`${stage.routeId}-${stage.stage}`}>
          <Typography sx={{ overflowWrap: "anywhere" }}>{stage.routeId} · {stage.stage}: {stage.state}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Key proof: {stage.eligible.length}/{stage.required}{stage.stage.endsWith("-contract") ? ` · Verified membership: ${stage.membershipEligible?.length || 0}/${Math.max(stage.required, stage.observedRequired || 0)} · Contract quorum: ${stage.observedRequired || "Unknown"}` : ""}</Typography>
          <Typography>{stage.notice}</Typography>
        </Paper>)}
      </Stack>}
      <Typography>{report.notice}</Typography>
      <Button onClick={() => exportJSON("participation-inspection.json", report)}>Export dated participation inspection</Button>
    </>}
  </Stack></Paper>;
}
