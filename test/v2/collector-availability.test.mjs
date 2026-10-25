import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { collectorsUnavailable } from "../../src/v2/collector-availability.mjs";

test("one reachable collector suppresses the outage warning, without inspecting validator readiness", async () => {
  const outcomes = [502, 200];
  assert.equal(await collectorsUnavailable(["https://primary.example", "https://backup.example"], {
    fetch: async (_, options) => {
      assert.equal(options.redirect, "error"); assert.equal(options.cache, "no-store"); assert.equal(options.credentials, "omit");
      return new Response(null, { status: outcomes.shift() });
    },
  }), false);
  assert.equal(await collectorsUnavailable(["https://primary.example", "https://backup.example"], {
    fetch: async () => new Response(null, { status: 502 }),
  }), true);
});

test("outage deadline cancels both real stalled network requests", async (t) => {
  let closed = 0, started = 0;
  const server = http.createServer((req, res) => { started++; res.on("close", () => closed++); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  assert.equal(await collectorsUnavailable([origin, origin], { timeoutMs: 150 }), true);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(started, 2); assert.equal(closed, 2);
});
