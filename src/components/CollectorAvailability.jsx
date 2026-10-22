import React, { useEffect, useState } from "react";
import { Alert, Button } from "@mui/material";
import { collectorsUnavailable } from "../v2/collector-availability.mjs";

export default function CollectorAvailability({ collectors }) {
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setUnavailable(false);
    if (collectors?.length) collectorsUnavailable(collectors, { signal: controller.signal }).then((down) => {
      if (!controller.signal.aborted) setUnavailable(down);
    });
    return () => controller.abort();
  }, [collectors, attempt]);
  return unavailable ? <Alert severity="warning" sx={{ marginY: 2 }}
    action={<Button color="inherit" size="small" onClick={() => setAttempt((n) => n + 1)}>Retry</Button>}>
    Signature collection is temporarily unavailable. Completed transfers can still be checked.
  </Alert> : null;
}
