import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { createJsonReader } from "./json-reader.mjs";

const { Provider } = createRequire(import.meta.url)("koilib");
const result = (body) => new Response(JSON.stringify(body));
test("a strict JSON gateway accepts the inherited contract read", async () => {
  let calls = 0;
  const reader = createJsonReader(Provider, "/rpc/koinos", { fetchFn: async (url, options) => {
    calls++;
    assert.equal(url, "/rpc/koinos");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(options.headers.Accept, "application/json");
    assert.equal(options.redirect, "error");
    const request = JSON.parse(options.body);
    assert.equal(request.method, "chain.read_contract");
    assert.deepEqual(request.params, { contract_id: "fixture", entry_point: 1, args: "" });
    return result({ jsonrpc: "2.0", id: request.id, result: { result: "CAE=" } });
  } });
  assert.deepEqual(await reader.readContract({ contract_id: "fixture", entry_point: 1, args: "" }), { result: "CAE=" });
  assert.equal(calls, 1);
});
test("submission and unknown methods never reach fetch", async () => {
  const reader = createJsonReader(Provider, "unused", { fetchFn: () => assert.fail("network used") });
  for (const method of ["chain.submit_transaction", "chain.submit_block", "unknown"]) await assert.rejects(reader.call(method, {}), /read methods only/);
});
test("HTTP and RPC failures are explicit, sanitized and never retried", async () => {
  for (const response of [new Response("private upstream URL", { status: 502 }), result({ jsonrpc: "2.0", id: 1, error: { message: "private upstream URL" } })]) {
    let calls = 0;
    const reader = createJsonReader(Provider, "unused", { fetchFn: async () => { calls++; return response; } });
    await assert.rejects(reader.call("chain.get_chain_id", {}), (error) => /Koinos /.test(error.message) && !/private/.test(error.message));
    assert.equal(calls, 1);
  }
});
test("malformed, mismatched and ambiguous replies are refused", async () => {
  for (const reply of ["not JSON", JSON.stringify({ id: 2, jsonrpc: "2.0", result: false }), JSON.stringify({ id: 1, jsonrpc: "2.0", result: false, error: {} })]) {
    const reader = createJsonReader(Provider, "unused", { fetchFn: async () => new Response(reply) });
    await assert.rejects(reader.call("chain.get_chain_id", {}), /invalid/);
  }
});
test("streamed responses are bounded", async () => {
  const reader = createJsonReader(Provider, "unused", { maxBytes: 10, fetchFn: async () => new Response("x".repeat(100)) });
  await assert.rejects(reader.call("chain.get_chain_id", {}), /size limit/);
});
test("a stalled read is aborted", async () => {
  const reader = createJsonReader(Provider, "unused", { timeoutMs: 5, fetchFn: (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(new Error("aborted")))) });
  await assert.rejects(reader.call("chain.get_chain_id", {}), /timed out/);
});

test("correlated successful proto3 empty read responses normalize the omitted bytes default", async () => {
  const operation = { contract_id: "fixture", entry_point: 1, args: "" };
  for (const wire of [{ result: "" }, {}, { logs: [] }, { result: "CAE=" }]) {
    const reader = createJsonReader(Provider, "unused", { fetchFn: async (_url, options) =>
      result({ jsonrpc: "2.0", id: JSON.parse(options.body).id, result: wire }) });
    assert.deepEqual(await reader.readContract(operation), { ...wire, result: wire.result ?? "" });
  }
});
test("a missing outer result or malformed contract-read response never becomes zero", async () => {
  const operation = { contract_id: "fixture", entry_point: 1, args: "" };
  for (const malformed of [null, [], "", { result: null }, { result: 0 }, { result: false },
    { logs: null }, { logs: [false] }, { error: "private upstream details" }]) {
    let calls = 0;
    const reader = createJsonReader(Provider, "unused", { fetchFn: async () => {
      calls++; return result({ jsonrpc: "2.0", id: 1, result: malformed });
    } });
    await assert.rejects(reader.readContract(operation), /contract read returned an invalid result/);
    assert.equal(calls, 1);
  }
  for (const reply of [{ jsonrpc: "2.0", id: 1 }, { jsonrpc: "2.0", id: 1, result: {}, error: {} }]) {
    const reader = createJsonReader(Provider, "unused", { fetchFn: async () => result(reply) });
    await assert.rejects(reader.readContract(operation), /invalid RPC envelope/);
  }
});
