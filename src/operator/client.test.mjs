import assert from "node:assert/strict";
import test from "node:test";
import { createOperatorClient, observedStatus } from "./client.js";

test("management token cannot be sent to a remote URL or a URL with credentials", () => {
  const token = "a".repeat(64);
  for (const endpoint of ["https://evil.invalid", "http://localhost:3021", "http://127.0.0.1.evil.invalid", "http://user:pass@127.0.0.1:3021", "http://127.0.0.1:3021/path", "http://127.0.0.1:3021/?secret=1"]) {
    assert.throws(() => createOperatorClient(endpoint, token));
  }
  assert.throws(() => createOperatorClient("http://127.0.0.1:3021", "short"));
});

test("client sends scoped requests with no cookie credentials or redirects", async () => {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return { ok: true, json: async () => ({ revision: 1 }) }; };
  try {
    const client = createOperatorClient("http://127.0.0.1:3021", "a".repeat(64));
    assert.deepEqual(await client("/v1/status"), { revision: 1 });
    assert.equal(calls[0].url, "http://127.0.0.1:3021/v1/status");
    assert.equal(calls[0].options.credentials, "omit");
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(calls[0].options.cache, "no-store");
    await assert.rejects(client("https://evil.invalid"));
  } finally { globalThis.fetch = original; }
});

test("missing, old and future-dated observations are never fresh", () => {
  const now = Date.now();
  assert.equal(observedStatus(null, now), "unknown");
  assert.equal(observedStatus({ observedAt: "invalid", status: "observed" }, now), "stale");
  assert.equal(observedStatus({ observedAt: new Date(now - 31000).toISOString(), status: "observed" }, now), "stale");
  assert.equal(observedStatus({ observedAt: new Date(now + 6000).toISOString(), status: "observed" }, now), "stale");
  assert.equal(observedStatus({ observedAt: new Date(now).toISOString(), status: "mismatch" }, now), "mismatch");
});
