import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";

const stageColor = (state) => (["verified", "local-signature-retained", "observed-complete", "finalized", "not-applicable", "none-recorded"].includes(state) ? "success" : ["rejected", "expired", "failed"].includes(state) ? "error" : "default");

export default function Transfers({ client }) {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    setBusy(true);
    try { setHistory(await client("/v1/transfers")); setError(""); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }, [client]);
  useEffect(() => { refresh(); const timer = setInterval(refresh, 30000); return () => clearInterval(timer); }, [refresh]);
  const stages = [["sourceEvent", "Source event"], ["observation", "Independent observation"], ["signatures", "Local signatures"], ["quorum", "Aggregate quorum"], ["submission", "Destination submission"], ["finality", "Destination finality"], ["expiry", "Expiry"], ["rejection", "Rejection"]];
  return <Stack gap={2}>
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} gap={1}><Box><Typography variant="h6" component="h2">Transfer history</Typography><Typography color="text.secondary">Both directions, from accepted source evidence through destination finality.</Typography></Box><Button variant="outlined" disabled={busy} onClick={refresh}>{busy ? "Reading…" : "Refresh receipts"}</Button></Stack>
    {error && <Alert severity="error" role="alert">{error}</Alert>}
    {history && <Alert severity="info">{history.notice}</Alert>}
    {history && history.items.length === 0 && <Paper variant="outlined" sx={{ p: 3 }}><Typography>No managed transfer operations are retained for this instance.</Typography></Paper>}
    {history?.items.map((item) => <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }} key={item.id}>
      <Stack gap={2}>
        <Box><Typography variant="h6" component="h3">{item.direction === "evm-to-koinos" ? "EVM → Koinos" : "Koinos → EVM"}</Typography><Typography variant="body2" sx={{ overflowWrap: "anywhere" }}>{item.id}</Typography><Typography variant="caption" sx={{ overflowWrap: "anywhere" }}>Digest: {item.digest}</Typography></Box>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1.5 }}>
          {stages.map(([name, label]) => <Box key={name} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5, minWidth: 0 }}><Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1} alignItems="flex-start"><Typography fontWeight={600}>{label}</Typography><Chip size="small" color={stageColor(item[name].state)} label={item[name].state} /></Stack><Typography variant="body2" sx={{ mt: 1, overflowWrap: "anywhere" }}>{item[name].evidence}</Typography></Box>)}
        </Box>
      </Stack>
    </Paper>)}
  </Stack>;
}
