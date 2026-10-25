import test from "node:test";
import assert from "node:assert/strict";
import { collectionConfig } from "../collection-config.mjs";

test("collector-only startup needs no validator setting and exposes no private roster", () => {
  const result = collectionConfig({ VITE_VORTEX_COLLECTION_MODE: "collector", VITE_VORTEX_COLLECTORS: "https://primary.example,https://backup.example", VITE_VORTEX_DEPLOYMENT: "pilot" });
  assert(result.ready);
  assert.deepEqual(Object.keys(result.cfg).sort(), ["collectionMode", "collectors", "deployment"]);
});

test("collector builds reject private origin settings instead of embedding them", () => {
  const env = { VITE_VORTEX_COLLECTION_MODE: "collector", VITE_VORTEX_COLLECTORS: "https://primary.example,https://backup.example", VITE_VORTEX_DEPLOYMENT: "pilot" };
  for (const change of [
    { VITE_VORTEX_VALIDATORS: "https://private.invalid" },
    { VITE_VORTEX_COLLECTORS: "https://primary.example,https://primary.example/" },
    { VITE_VORTEX_COLLECTORS: "http://primary.example,https://backup.example" },
    { VITE_VORTEX_COLLECTORS: "https://primary.example/path,https://backup.example" },
    { VITE_VORTEX_DEPLOYMENT: "" },
  ]) assert.throws(() => collectionConfig({ ...env, ...change }));
});

test("unconfigured and direct legacy startups retain their maintenance behavior", () => {
  assert.equal(collectionConfig({}).ready, false);
  assert.equal(collectionConfig({ VITE_VORTEX_VALIDATORS: "https://a.example" }).ready, true);
  assert.throws(() => collectionConfig({ VITE_VORTEX_COLLECTION_MODE: "unknown" }));
});

test("collector mode without any collector setting is unavailable at import, never direct", () => {
  const result = collectionConfig({ VITE_VORTEX_COLLECTION_MODE: "collector" });
  assert.equal(result.ready, false); assert.equal(result.cfg.collectionMode, "collector");
  assert.deepEqual(result.cfg.collectors, []); assert.equal(result.cfg.validators, undefined);
});
