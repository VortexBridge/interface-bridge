import assert from "node:assert/strict";
import { cp, lstat, mkdir, mkdtemp, readFile, readlink, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const built = JSON.parse(await readFile("build/operator/operator-artifact.json", "utf8"));
assert.equal(built.application, "vortex-operator-ui");
assert.deepEqual(built.operatorApi, { minimum: "v1", maximum: "v1" });

const compatible = (manifest, api) => manifest.application === "vortex-operator-ui" && manifest.operatorApi?.minimum === api && manifest.operatorApi?.maximum === api;
assert.equal(compatible(built, "v1"), true);
assert.equal(compatible({ ...built, operatorApi: { minimum: "v2", maximum: "v2" } }, "v1"), false);
const packageName = `vortex-operator-ui-${built.version}-${built.revision}.tar.gz`;
const unsignedRelease = JSON.parse(await readFile(path.join("artifacts", `${packageName}.release-manifest.json`), "utf8"));
assert.equal(unsignedRelease.component, "operator");
assert.equal(unsignedRelease.version, built.version);
assert.equal(unsignedRelease.signingCodec, "operator-api-v1");
assert.equal(unsignedRelease.artifacts[0].platform, "web");
assert.match(await readFile(path.join("artifacts", `${packageName}.sha256`), "utf8"), new RegExp(`^${unsignedRelease.artifacts[0].sha256}  ${packageName}\\n$`));

const root = await mkdtemp(path.join(os.tmpdir(), "vortex-operator-ui-rollout."));
try {
  const releases = path.join(root, "releases");
  await mkdir(releases, { recursive: true });
  const oldRelease = path.join(releases, "0.1.0-reviewed");
  const newRelease = path.join(releases, `${built.version}-${built.revision}`);
  await cp("build/operator", oldRelease, { recursive: true });
  await cp("build/operator", newRelease, { recursive: true });
  await writeFile(path.join(oldRelease, "operator-artifact.json"), `${JSON.stringify({ ...built, version: "0.1.0", revision: "reviewed-old" }, null, 2)}\n`);
  const current = path.join(root, "current");
  await symlink(oldRelease, current);
  assert.equal(await readlink(current), oldRelease);

  // A UI-only rollout swaps one static symlink. No operator API, validator
  // process, worker path or command is accepted by this test helper.
  await unlink(current);
  await symlink(newRelease, current);
  const active = JSON.parse(await readFile(path.join(current, "operator-artifact.json"), "utf8"));
  assert.equal(compatible(active, "v1"), true);

  // Compatible rollback restores the previously reviewed static directory.
  await unlink(current);
  await symlink(oldRelease, current);
  const rolledBack = JSON.parse(await readFile(path.join(current, "operator-artifact.json"), "utf8"));
  assert.equal(compatible(rolledBack, "v1"), true);
  assert.equal((await lstat(current)).isSymbolicLink(), true);
} finally {
  await rm(root, { recursive: true, force: true });
}

console.log("operator UI compatible update, rollback and incompatible-API rejection verified");
