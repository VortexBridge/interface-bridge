import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, utimes, writeFile } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await readFile("build/operator/operator-artifact.json", "utf8"));
const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const committedAt = new Date(execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], { encoding: "utf8" }).trim());
const name = `vortex-operator-ui-${manifest.version}-${manifest.revision}`;
const output = path.resolve("artifacts");
await mkdir(output, { recursive: true });
const staging = path.join(output, ".operator-package");
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp("build/operator", path.join(staging, "site"), { recursive: true });
await cp("operator-static/operator-nginx.conf", path.join(staging, "operator-nginx.conf"));
await writeFile(path.join(staging, "INSTALL.txt"), `Vortex Operator UI ${manifest.version} (${manifest.revision})

Verify the adjacent SHA-256 file. The adjacent release-manifest JSON is unsigned
input for the normal Vortex publisher-signature and independent local-approval
workflow; it is not authorization by itself. After that review, extract this directory to
/opt/vortex-operator-ui/releases/${manifest.version}-${manifest.revision}, point
/opt/vortex-operator-ui/current at it, install operator-nginx.conf as a reviewed
nginx server configuration, run nginx -t, and reload nginx. The UI listens only
on 127.0.0.1:5174 and expects operator API v1 on 127.0.0.1:3021.
`, { mode: 0o644 });
async function normalizeTimes(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await normalizeTimes(file);
    await utimes(file, committedAt, committedAt);
  }
  await utimes(directory, committedAt, committedAt);
}
await normalizeTimes(staging);
const archive = path.join(output, `${name}.tar.gz`);
const tarBytes = execFileSync("tar", ["-C", staging, "-cf", "-", "."], { env: { ...process.env, COPYFILE_DISABLE: "1" }, maxBuffer: 64 << 20 });
const archiveBytes = execFileSync("gzip", ["-n", "-9", "-c"], { input: tarBytes, maxBuffer: 64 << 20 });
await writeFile(archive, archiveBytes, { mode: 0o644 });
const digest = createHash("sha256").update(archiveBytes).digest("hex");
await writeFile(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`, { mode: 0o644 });
const expiresAt = new Date(committedAt.getTime() + 180 * 24 * 60 * 60 * 1000);
const boundaryDigest = createHash("sha256").update(await readFile("scripts/verify-app-boundaries.mjs")).digest("hex");
const archiveStat = await stat(archive);
const releaseManifest = {
  schemaVersion: 1,
  id: `vortex-operator-ui-${manifest.version.replaceAll(".", "-")}`,
  component: "operator",
  version: manifest.version,
  sequence: 2,
  channel: "candidate",
  sourceCommit,
  createdAt: committedAt.toISOString().replace(".000Z", "Z"),
  expiresAt: expiresAt.toISOString().replace(".000Z", "Z"),
  compatibleFrom: ["0.1.0"],
  configSchema: 1,
  databaseSchema: 1,
  signingCodec: "operator-api-v1",
  mixedVersionsSafe: true,
  recovery: "Restore the previously reviewed static UI directory and current symlink. Do not restart or alter the validator service.",
  testEvidence: [`operator-boundary-script-sha256:${boundaryDigest}`],
  artifacts: [{ platform: "web", sha256: digest, size: archiveStat.size }],
};
await writeFile(`${archive}.release-manifest.json`, `${JSON.stringify(releaseManifest, null, 2)}\n`, { mode: 0o644 });
await rm(staging, { recursive: true, force: true });
console.log(`${archive}\nsha256 ${digest}\nunsigned release manifest ${archive}.release-manifest.json`);
