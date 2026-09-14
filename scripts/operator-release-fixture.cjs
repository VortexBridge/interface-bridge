// PUBLIC SYNTHETIC KEYS. Never use this publisher policy in production.
// Creates a signed manifest for UI tests, not an installable validator release.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const dir = process.argv[2];
if (!dir || !path.isAbsolute(dir) || !/^vortex-operator-dev\./.test(path.basename(dir))) throw new Error("Supply a temporary vortex-operator-dev.* directory only");
const content = Buffer.from("synthetic artifact, not executable");
const manifest = {
  schemaVersion: 1, id: "security-fixture", component: "validator", version: "1.0.1", sequence: 2, channel: "candidate",
  sourceCommit: "a".repeat(40), createdAt: new Date(Date.now() - 60000).toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
  compatibleFrom: ["1.0.0"], configSchema: 1, databaseSchema: 1, signingCodec: "fixture-v1", mixedVersionsSafe: true,
  recovery: "Synthetic UI fixture only. This artifact is not executable.", testEvidence: ["Synthetic fixture: no production test claims"],
  artifacts: [{ platform: "linux-arm64", sha256: crypto.createHash("sha256").update(content).digest("hex"), size: content.length }],
};
const trust = { schemaVersion: 1, requiredSignatures: 2, publishers: {} };
const signatures = [];
for (let i = 1; i <= 2; i++) {
  const seed = Buffer.alloc(32); seed[31] = i;
  const key = crypto.createPrivateKey({ key: Buffer.concat([Buffer.from("302e020100300506032b657004220420", "hex"), seed]), format: "der", type: "pkcs8" });
  const publisher = `fixture-${i}`;
  trust.publishers[publisher] = crypto.createPublicKey(key).export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
  signatures.push({ publisher, signature: crypto.sign(null, Buffer.from(JSON.stringify(manifest)), key).toString("hex") });
}
fs.writeFileSync(path.join(dir, "release-trust.json"), JSON.stringify(trust, null, 2), { mode: 0o600, flag: "wx" });
fs.writeFileSync(path.join(dir, "synthetic-release.json"), JSON.stringify({ manifest, signatures }, null, 2), { mode: 0o600, flag: "wx" });
console.log("Created public synthetic publisher policy and signed UI fixture in " + dir);
