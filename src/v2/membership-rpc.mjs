// Cancellation-aware reads only for signature collection. Never uses a wallet or submits a transaction.
// Reuse the selected providers' URLs and Ethereum fallback weights/quorum; do not silently change readers.
export function membershipRpc(fetchFn) {
  async function call(connection, method, params, signal) {
    const c = typeof connection === "string" ? { url: connection } : connection;
    const u = new URL(c?.url);
    if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new Error("unsupported membership reader");
    if (signal.aborted) throw new Error("membership read cancelled");
    const r = await fetchFn(u.href, { method: "POST", headers: { ...c.headers, "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal, redirect: "error", credentials: "omit", cache: "no-store" });
    if (!r.ok || !r.body?.getReader) throw new Error("membership reader unavailable");
    const reader = r.body.getReader(); let size = 0; const chunks = [];
    try {
      for (;;) { const { value, done } = await reader.read(); if (done) break;
        size += value.length; if (size > 65536) throw new Error("membership answer too large"); chunks.push(value); }
    } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const b of chunks) { bytes.set(b, offset); offset += b.length; }
    const rep = JSON.parse(new TextDecoder().decode(bytes));
    if (rep?.jsonrpc !== "2.0" || rep.id !== 1 || rep.error || rep.result === undefined) throw new Error("membership reader refused");
    return rep.result;
  }
  async function ethCall(provider, chainId, to, data, signal) {
    const peers = provider?.providerConfigs || [{ provider, weight: 1 }];
    const quorum = provider?.providerConfigs ? provider.quorum : 1;
    if (!peers.length || peers.length > 19 || !Number.isInteger(quorum) || quorum < 1) throw new Error("unsupported membership provider");
    const ctrl = new AbortController(), abort = () => ctrl.abort();
    if (signal.aborted) throw new Error("membership read cancelled"); signal.addEventListener("abort", abort, { once: true });
    try {
      return await new Promise((resolve, reject) => {
        let pending = peers.length, settled = false; const votes = new Map();
        const fail = () => { if (!settled) { settled = true; reject(new Error("validator membership not readable")); } };
        ctrl.signal.addEventListener("abort", fail, { once: true });
        for (const peer of peers) (async () => {
          if (!Number.isInteger(peer.weight) || peer.weight < 1) throw new Error("invalid reader weight");
          const connection = peer.provider?.connection;
          const actualChain = await call(connection, "eth_chainId", [], ctrl.signal);
          if (!/^0x[0-9a-f]+$/i.test(actualChain) || BigInt(actualChain) !== BigInt(chainId)) throw new Error("membership reader on another chain");
          const raw = await call(connection, "eth_call", [{ to, data }, "latest"], ctrl.signal);
          if (typeof raw !== "string" || !/^0x[0-9a-f]{64}$/i.test(raw)) throw new Error("invalid membership result");
          const key = raw.toLowerCase(), weight = (votes.get(key) || 0) + peer.weight; votes.set(key, weight);
          if (!settled && weight >= quorum) { settled = true; resolve(key); ctrl.abort(); }
        })().catch(() => {}).finally(() => { if (!--pending) fail(); });
      });
    } finally { ctrl.abort(); signal.removeEventListener("abort", abort); }
  }
  async function koinosRead(provider, operation, signal) {
    const url = provider?.rpcNodes?.[provider.currentNodeId || 0];
    if (typeof url !== "string") throw new Error("unsupported membership provider");
    // Keep koilib's selected reader. No unbounded retry loop after an abort or native refusal.
    return call(url, "chain.read_contract", operation, signal);
  }
  return { ethCall, koinosRead };
}
