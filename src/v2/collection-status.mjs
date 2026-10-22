export function collectionStatus(got) {
  if (got.enough) return "ready to redeem";
  if (got.outcome === "collector unavailable") return "signature service unavailable; please try again";
  if (got.outcome === "validators not ready") return "validators are still checking the deposit";
  if (got.outcome === "expired") return "signature request expired; requesting fresh signatures";
  if (got.outcome === "timeout") return "signature request timed out; please try again";
  const why = got.problems && got.problems.length ? ` — ${got.problems[0]}` : "";
  return "waiting for enough valid signatures" + why;
}
