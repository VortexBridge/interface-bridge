import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const manifest = JSON.parse(await readFile("build/operator/operator-artifact.json", "utf8"));
const name = `vortex-operator-ui-${manifest.version}-${manifest.revision}`;
const output = path.resolve("artifacts");
await mkdir(output, { recursive: true });
const staging = path.join(output, ".operator-package");
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await cp("build/operator", path.join(staging, "site"), { recursive: true });
await cp("operator-static/operator-nginx.conf", path.join(staging, "operator-nginx.conf"));
await writeFile(path.join(staging, "INSTALL.txt"), `Vortex Operator UI ${manifest.version} (${manifest.revision})

Verify the adjacent SHA-256 file before installation. Extract this directory to
/opt/vortex-operator-ui/releases/${manifest.version}-${manifest.revision}, point
/opt/vortex-operator-ui/current at it, install operator-nginx.conf as a reviewed
nginx server configuration, run nginx -t, and reload nginx. The UI listens only
on 127.0.0.1:5174 and expects operator API v1 on 127.0.0.1:3021.
`, { mode: 0o644 });
const archive = path.join(output, `${name}.tar.gz`);
execFileSync("tar", ["-C", staging, "-czf", archive, "."], { stdio: "inherit" });
const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
await writeFile(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`, { mode: 0o644 });
await rm(staging, { recursive: true, force: true });
console.log(`${archive}\nsha256 ${digest}`);
