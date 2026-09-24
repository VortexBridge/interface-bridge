import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, Chip, Paper, Stack, Typography } from "@mui/material";

export default function Recovery({ client }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setState(await client("/v1/recovery")); setError(""); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [client]);
  useEffect(() => { refresh(); }, [refresh]);
  return <Stack gap={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}><Typography variant="h6" component="h2">Backup, restore and fenced recovery</Typography><Button variant="outlined" disabled={busy} onClick={refresh}>{busy ? "Reading…" : "Refresh recovery state"}</Button></Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {state && <>
      <Alert severity="info">{state.notice}</Alert>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={1}><Typography variant="h6" component="h3">Current recovery evidence</Typography><Chip sx={{ alignSelf: "flex-start" }} label={`restore: ${state.restoreState}`} /><Typography sx={{ overflowWrap: "anywhere" }}>Backup digest: {state.restoreDigest || "No registered restore"}</Typography><Typography>Signer fencing: {state.fencingState}</Typography>{state.reviewNote && <Typography>Local review note: {state.reviewNote}</Typography>}</Stack></Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={1}><Typography variant="h6" component="h3">Protected recovery sequence</Typography><ol style={{ margin: 0, paddingLeft: "1.4rem" }}>{state.steps.map((step) => <li key={step}><Typography sx={{ mb: 1 }}>{step}</Typography></li>)}</ol></Stack></Paper>
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Stack gap={1}><Typography variant="h6" component="h3">Encrypted backup inventory</Typography><Typography>{state.backup.configured ? `Configured for ${state.backup.recipient}` : state.backup.problem}</Typography>{state.backup.jobs.length === 0 && <Typography color="text.secondary">No managed backup jobs recorded.</Typography>}{state.backup.jobs.map((job) => <Paper variant="outlined" sx={{ p: 2 }} key={job.request.id}><Typography fontWeight={600}>{job.request.id} · {job.state}</Typography><Typography variant="body2">{job.message}</Typography>{job.receipt && <Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Ciphertext SHA-256: {job.receipt.ciphertextSha256}</Typography>}</Paper>)}</Stack></Paper>
    </>}
  </Stack>;
}
