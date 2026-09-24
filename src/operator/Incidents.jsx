import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

function IncidentCard({ incident, historical = false }) {
  return <Paper variant="outlined" sx={{ p: 2 }}><Stack gap={1}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1}><Typography fontWeight={600}>{incident.category.replaceAll("-", " ")}</Typography><Chip size="small" color={incident.severity === "critical" ? "error" : "warning"} label={`${historical ? "recorded" : incident.state} · ${incident.severity}`} /></Stack><Typography>{incident.evidence}</Typography><Typography variant="body2"><strong>Action:</strong> {incident.action}</Typography><Typography variant="caption">Observed {new Date(incident.observedAt).toLocaleString()}</Typography></Stack></Paper>;
}

export default function Incidents({ client }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setState(await client("/v1/incidents")); setError(""); } catch (e) { setError(e.message); } }, [client]);
  useEffect(() => { load(); }, [load]);
  const check = async () => {
    setBusy(true); setError("");
    try { setState(await client("/v1/incidents/check", {})); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <Stack gap={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}><Box><Typography variant="h6" component="h2">Incidents and diagnostics</Typography><Typography color="text.secondary">Sanitized local checks for chain, storage, peer and signer failures.</Typography></Box><Button variant="contained" disabled={busy} onClick={check}>{busy ? "Running checks…" : "Run incident checks"}</Button></Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {state?.problem && <Alert severity="error">{state.problem}</Alert>}
    {state && <Alert severity="info">{state.notice}</Alert>}
    {state && state.current.length === 0 && <Alert severity="success">No current incident was found by the available point-in-time checks.</Alert>}
    {state?.current.map((incident) => <IncidentCard incident={incident} key={incident.id} />)}
    <Typography variant="h6" component="h3">Recorded check history</Typography>
    {!state?.history.length && <Typography color="text.secondary">Run the checks to create the first local history entry when a problem is found.</Typography>}
    {state?.history.slice().reverse().map((incident) => <IncidentCard historical incident={incident} key={incident.id} />)}
  </Stack>;
}
