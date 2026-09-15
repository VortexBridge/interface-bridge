// UI readiness only. The destination contract and validator API remain the
// authority for signature validity and redemption authorization.

export function contractQuorum(count) {
  if (!Number.isInteger(count) || count < 1 || count > 256) return null;
  return Math.floor((count * 5 + 10) / 9);
}

export function normalizeMember(member, family) {
  if (typeof member !== "string" || member.trim() === "") return null;
  const value = member.trim();
  return family === "evm" ? value.toLowerCase() : value;
}

export function makeQuorumSnapshot({ family, contract, members, fetchedAt = Date.now() }) {
  const unique = [...new Set((Array.isArray(members) ? members : [])
    .map((member) => normalizeMember(member, family))
    .filter(Boolean))];
  const required = contractQuorum(unique.length);
  if (!required || !contract || !Number.isFinite(fetchedAt)) return null;
  return { family, contract, members: unique, count: unique.length, required, fetchedAt };
}

export function snapshotIsFresh(snapshot, now = Date.now(), maxAgeMs = 30000) {
  return Boolean(snapshot && Number.isFinite(snapshot.fetchedAt) &&
    now >= snapshot.fetchedAt && now - snapshot.fetchedAt <= maxAgeMs);
}

export function signaturesMeetQuorum(recoverData, snapshot, now = Date.now()) {
  if (!snapshotIsFresh(snapshot, now) || !recoverData) return false;
  const validators = _array(recoverData.validators);
  const signatures = _array(recoverData.signatures);
  if (validators.length !== signatures.length) return false;
  const members = new Set(snapshot.members);
  const signed = new Set();
  validators.forEach((validator, index) => {
    const normalized = normalizeMember(validator, snapshot.family);
    if (normalized && signatures[index] && members.has(normalized)) signed.add(normalized);
  });
  return signed.size >= snapshot.required;
}

function _array(value) {
  return Array.isArray(value) ? value : [];
}
