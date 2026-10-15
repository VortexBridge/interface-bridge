// Keep koilib's read helpers, with an explicitly JSON-typed, bounded transport.
// This reader never falls back to an unconfigured node and cannot submit transactions.
/* global globalThis */
const READS = new Set([
  "chain.get_chain_id", "chain.get_head_info", "chain.get_fork_heads",
  "chain.get_account_nonce", "chain.get_account_rc", "chain.get_resource_limits",
  "chain.invoke_system_call", "chain.read_contract", "block_store.get_blocks_by_id",
  "block_store.get_blocks_by_height", "transaction_store.get_transactions_by_id",
]);

export function createJsonReader(Provider, url, { fetchFn = globalThis.fetch, timeoutMs = 15000, maxBytes = 2097152 } = {}) {
  const provider = new Provider(url);
  let nextId = 0;
  provider.call = async (method, params) => {
    if (!READS.has(method)) throw new Error("This Koinos reader supports read methods only");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const id = ++nextId;
    try {
      const response = await fetchFn(url, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
        signal: controller.signal, redirect: "error",
      });
      if (!response.ok) throw new Error(`Koinos read failed (HTTP ${response.status})`);
      const stream = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        for (;;) {
          const { value, done } = await stream.read();
          if (done) break;
          size += value.byteLength;
          if (size > maxBytes) throw new Error("Koinos read response exceeds its size limit");
          chunks.push(value);
        }
      } finally { await stream.cancel(); }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let reply;
      try { reply = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
      catch { throw new Error("Koinos read returned invalid JSON"); }
      if (!reply || reply.jsonrpc !== "2.0" || reply.id !== id
          || Object.hasOwn(reply, "result") === Object.hasOwn(reply, "error"))
        throw new Error("Koinos read returned an invalid RPC envelope");
      // Do not display upstream error bodies: they can contain private URLs or arbitrary markup.
      if (Object.hasOwn(reply, "error")) throw new Error("Koinos RPC refused the read");
      return reply.result;
    } catch (error) {
      if (controller.signal.aborted) throw new Error("Koinos read timed out; check availability before retrying");
      if (/^Koinos /.test(error.message || "")) throw error;
      throw new Error("Koinos read unavailable");
    } finally { clearTimeout(timer); }
  };
  return provider;
}
