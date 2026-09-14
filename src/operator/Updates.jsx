import React, { useEffect, useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, TextField, Typography } from "@mui/material";

import Maintenance from "./Maintenance.jsx";

export default function Updates({ client, revision, instanceId, onChange }) {
  const [state, setState] = useState({ approvals: [], trustedPublishers: [], requiredSignatures: 0, installedVersion: null, installedProblem: "", staged: [] });
  const [raw, setRaw] = useState("");
  const [verified, setVerified] = useState(null);
  const [consent, setConsent] = useState(false);
  const [start, setStart] = useState(new Date(Date.now() + 5 * 60000).toISOString());
  const [end, setEnd] = useState(new Date(Date.now() + 65 * 60000).toISOString());
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { let cancelled = false; client("/v1/updates").then((result) => { if (!cancelled) setState(result); }).catch((e) => { if (!cancelled) setError(e.message); }); return () => { cancelled = true; }; }, [client, revision]);
  const run = async (work) => { setBusy(true); setError(""); setMessage(""); try { await work(); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  const verify = () => run(async () => {
    const release = JSON.parse(raw);
    const result = await client("/v1/updates/verify", release);
    setVerified({ ...result, release }); setConsent(false);
  });
  const approve = () => run(async () => {
    await client("/v1/updates/approve", { instanceId, expectedRevision: revision, release: verified.release, digest: verified.digest, windowStart: new Date(start).toISOString(), windowEnd: new Date(end).toISOString() });
    setMessage("Approval recorded only on this operator. Nothing has been installed."); setConsent(false); setVerified(null); await onChange();
  });
  const revoke = (digest) => run(async () => { await client("/v1/updates/revoke", { digest, expectedRevision: revision }); setMessage("Local approval revoked. The release sequence remains recorded to prevent replay."); await onChange(); });
  return <Stack gap={2}>
    <Typography variant="h6" component="h2">Security updates</Typography>
    <Typography>Review one exact release and control its approval on your operator. A publisher’s signature cannot install software on your behalf.</Typography>
    <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Operator instance: {instanceId || "Unknown"}</Typography>
    <Alert severity="info">Release verification and local approvals are available. The local CLI can stage artifacts and run isolated observation checks, including synthetic transfer persistence with current checkers. Full release qualification and the staged installer remain unavailable.</Alert>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {message && <Alert severity="success" role="status">{message}</Alert>}
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={1.5}>
        <Typography variant="h6" component="h3">Current validator release</Typography>
        {state.installedVersion ? <>
          <Chip label={state.installedVersion.state} color="success" variant="outlined" sx={{ alignSelf: "flex-start" }} />
          <Typography>{state.installedVersion.component} {state.installedVersion.version} · sequence {state.installedVersion.sequence} · {state.installedVersion.platform}</Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Release digest: {state.installedVersion.digest}</Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Pinned validator SHA-256: {state.installedVersion.artifactSha256}</Typography>
          <Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>Source commit: {state.installedVersion.sourceCommit}</Typography>
          <Typography variant="body2">Compatibility: config schema {state.installedVersion.configSchema}, database schema {state.installedVersion.databaseSchema}, signing codec {state.installedVersion.signingCodec}.</Typography>
          <Typography variant="caption">Recorded locally {new Date(state.installedVersion.recordedAt).toLocaleString()}. The operator rechecks the pinned binary, worker registration and configuration before returning this identity.</Typography>
        </> : <Alert severity="warning">{state.installedProblem || "The current validator release has not been recorded."} After staging the signed release whose artifact exactly matches the registered worker, run the local release-adopt command with that digest and platform. Adoption records identity only; it does not install or start software.</Alert>}
      </Stack>
    </Paper>
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h3">Verify a release</Typography>
      <Typography sx={{ my: 2 }}>Locally trusted publishers: {state.trustedPublishers.length ? state.trustedPublishers.join(", ") : "None configured"}. Required publisher signatures: {state.requiredSignatures || "Not configured"}.</Typography>
      {!state.trustedPublishers.length && <Alert severity="warning" sx={{ mb: 2 }}>Install your reviewed publisher public-key policy in the private release-trust.json file on the operator host. A release cannot supply its own trust policy.</Alert>}
      <Box component="form" onSubmit={(e) => { e.preventDefault(); verify(); }}>
        <TextField label="Signed release manifest JSON" multiline minRows={6} maxRows={14} fullWidth required disabled={busy} value={raw} onChange={(e) => { setRaw(e.target.value); setVerified(null); setConsent(false); }} inputProps={{ spellCheck: false }} />
        <Button type="submit" variant="outlined" disabled={busy || !state.trustedPublishers.length} sx={{ mt: 2 }}>Verify release signatures</Button>
      </Box>
    </Paper>
    {verified && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={2}>
        <Chip label="Publisher signatures verified — not installed" sx={{ alignSelf: "flex-start", maxWidth: "100%" }} />
        <Typography variant="h6" component="h3">{verified.manifest.component} {verified.manifest.version} · {verified.manifest.channel}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Exact release digest: {verified.digest}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Source commit: {verified.manifest.sourceCommit}</Typography>
        <Typography>Compatible predecessor versions: {verified.manifest.compatibleFrom.join(", ")}</Typography>
        <Typography>Mixed versions: {verified.manifest.mixedVersionsSafe ? "Publisher declares compatibility; independent testing still required" : "Migration required; ordinary rolling update is not permitted"}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Recovery instructions: {verified.manifest.recovery}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Publisher test evidence: {verified.manifest.testEvidence.join("; ")}</Typography>
        {verified.manifest.artifacts.map((artifact) => <Box key={artifact.platform}><Typography>{artifact.platform} · {artifact.size} bytes</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>SHA-256: {artifact.sha256}</Typography></Box>)}
        <Alert severity="warning">{verified.notice}</Alert>
        <TextField label="Activation window starts (ISO date with timezone)" disabled={busy} value={start} onChange={(e) => { setStart(e.target.value); setConsent(false); }} />
        <TextField label="Activation window ends (ISO date with timezone)" disabled={busy} value={end} onChange={(e) => { setEnd(e.target.value); setConsent(false); }} />
        <FormControlLabel control={<Checkbox checked={consent} disabled={busy} onChange={(e) => setConsent(e.target.checked)} />} label={`I approve the displayed digest for ${verified.manifest.component} ${verified.manifest.version} on this operator, within this window.`} />
        <Button variant="contained" disabled={!consent || busy || !instanceId} onClick={approve} sx={{ alignSelf: "flex-start" }}>Record local approval</Button>
      </Stack>
    </Paper>}
    <Typography variant="h6" component="h3">Staged artifacts and candidate checks</Typography>
    {!state.staged?.length && <Typography color="text.secondary">No artifacts staged on this operator. Use the documented local release-stage command to verify already downloaded artifact bytes.</Typography>}
    {(state.staged || []).map((item) => <Paper key={`${item.digest}-${item.platform}`} variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack gap={2}>
        <Typography variant="h6" component="h4">{item.component || "Artifact"} {item.version} · {item.platform}</Typography>
        <Chip label={item.state} sx={{ alignSelf: "flex-start" }} />
        <Typography sx={{ overflowWrap: "anywhere" }}>Manifest digest: {item.digest}</Typography>
        <Typography sx={{ overflowWrap: "anywhere" }}>Artifact SHA-256: {item.artifactSha256 || "Not verified"}</Typography>
        <Typography>{item.message}</Typography>
        {item.compatibility && <Alert severity={item.compatibility.rollingUpdate ? "success" : item.compatibility.state === "already-installed" ? "info" : "warning"}>
          <Typography component="div" fontWeight={600}>{item.compatibility.state}</Typography>
          <Typography component="div">Rolling update metadata: {item.compatibility.rollingUpdate ? "Compatible for further qualification" : "Not eligible"}.</Typography>
          {item.compatibility.reasons.map((reason) => <Typography component="div" variant="body2" key={reason}>{reason}</Typography>)}
        </Alert>}
        {item.candidate ? <>
          <Alert severity={["checks-passed", "smoke-passed"].includes(item.candidate.report.state) ? "info" : "error"}>Candidate isolated checks: {["checks-passed", "smoke-passed"].includes(item.candidate.report.state) ? "Passed" : "Failed"}. Full release qualification remains required.</Alert>
          <Typography>Completed: {new Date(item.candidate.finishedAt).toLocaleString()}</Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>Reviewed checker SHA-256: {item.candidate.checkerSha256}</Typography>
          <Typography>{item.candidate.notice}</Typography>
          {item.candidate.report.error && <Box component="details"><Typography component="summary" sx={{ cursor: "pointer" }}>Test failure details</Typography><Typography component="pre" color="error" sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", maxHeight: 240, overflow: "auto", fontSize: "0.8rem" }}>{item.candidate.report.error}</Typography></Box>}
        </> : <Typography>No candidate report recorded. The local candidate-test command runs a restricted container with synthetic data.</Typography>}
      </Stack>
    </Paper>)}
    <Maintenance client={client} revision={revision} onChange={onChange} />
    <Typography variant="h6" component="h3">Local approval history</Typography>
    {!state.approvals.length && <Typography color="text.secondary">No releases approved on this operator.</Typography>}
    {state.approvals.map((approval) => <Paper key={approval.digest} variant="outlined" sx={{ p: 2 }}>
      <Typography>{approval.component} {approval.version} · {approval.revoked ? "Revoked" : new Date(approval.windowEnd).getTime() <= Date.now() ? "Window expired" : "Locally approved"}</Typography>
      <Typography variant="body2" sx={{ overflowWrap: "anywhere", my: 1 }}>{approval.digest}</Typography>
      <Typography variant="caption" display="block">Window: {new Date(approval.windowStart).toLocaleString()} – {new Date(approval.windowEnd).toLocaleString()}</Typography>
      {!approval.revoked && <Button disabled={busy} onClick={() => revoke(approval.digest)} sx={{ mt: 1 }}>Revoke local approval</Button>}
    </Paper>)}
  </Stack>;
}
