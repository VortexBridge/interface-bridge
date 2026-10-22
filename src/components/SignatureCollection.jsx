import React from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import moment from "moment";

// Only the independently verified client result reaches this component; collector counts are never displayed.
export default function SignatureCollection({ got }) {
  const count = (got.signers || []).length;
  const quorum = Number(got.quorum) || 1;
  const expiry = Number(got.claim.expiry) * (got.claim.direction === "k2e" ? 1000 : 1);
  return <>
    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
      <Typography variant="body1" component="span" sx={{ color: "text.grey2" }}>Validator signatures:</Typography>
      <Typography variant="h6" component="span">{`${count} verified, ${quorum} needed`}</Typography>
    </Box>
    <LinearProgress variant="determinate" aria-label="validator signatures verified"
      color={got.enough ? "success" : "primary"} value={Math.min(100, 100 * count / quorum)}
      sx={{ height: 6, borderRadius: 3, marginY: "6px" }} />
    <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
      <Typography variant="body1" component="span" sx={{ color: "text.grey2" }}>Signatures valid until:</Typography>
      <Typography variant="h6" component="span">{moment(expiry).format("DD-MM-YYYY, HH:mm")}</Typography>
    </Box>
  </>;
}
