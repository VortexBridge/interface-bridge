// Vortex bridge v2 — client library (browser + Node). Only dependency: ethers v5, passed in (no bundler assumptions).
//
//   const vx = createVortex({ ethers, fetch, cfg: {
//     koinos: { bridge: "1aqHt…", bridgeChainId: 1 },
//     eth:    { bridge: "0x…", networkChainId: 1, bridgeChainId: 2 },
//     validators: ["https://validator-a.example", …] } })
//
// Security rules implemented here (docs/13):
//  - approvals are EXACT amounts (never unlimited; the callers pass the amount itself);
//  - recipients/amounts are checked BEFORE a deposit (same rules as the contracts);
//  - the claim is derived from the user's OWN deposit; validators are only asked to sign that exact message;
//  - every returned signature is verified locally AND its signer must be a current validator (on-chain check).

export const CLAIM_VERSION = "vortex-bridge-v2/claim";
const CLAIM_TYPES = { Claim: [
  { name: "sourceChain", type: "uint32" }, { name: "sourceBridge", type: "bytes32" }, { name: "depositNonce", type: "uint64" },
  { name: "token", type: "address" }, { name: "recipient", type: "address" }, { name: "amount8", type: "uint256" }, { name: "expiry", type: "uint64" }] };
const MAX_U64 = (1n << 64n) - 1n;

export function createVortex({ ethers, fetch: fetchFn = globalThis.fetch, cfg }) {
  const U = ethers.utils;
  const collectionMode = cfg.collectionMode || "direct";
  if (!["direct", "collector"].includes(collectionMode)) throw new Error("unknown collection mode");
  const collectors = collectionMode === "collector" ? validateCollectors(cfg) : [];
  function validateCollectors(config) {
    if ((config.validators || []).length) throw new Error("collector mode must not contain validator URLs");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(config.deployment || "")) throw new Error("collector deployment is required");
    if (!Array.isArray(config.collectors) || config.collectors.length !== 2) throw new Error("primary and backup collectors are required");
    const result = config.collectors.map((base) => {
      const u = new URL(base);
      const local = config.allowInsecureLocal === true && u.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(u.hostname);
      if ((!local && u.protocol !== "https:") || u.username || u.password || u.search || u.hash || !["", "/"].includes(u.pathname)) throw new Error("invalid collector URL");
      return u.origin;
    });
    if (new Set(result).size !== 2) throw new Error("collectors must have distinct URLs");
    return result;
  }
  const b58 = (s) => U.arrayify(U.base58.decode(s));
  const hex = (b) => U.hexlify(b);
  const b64url = {
    enc: (b) => U.base64.encode(b).replace(/\+/g, "-").replace(/\//g, "_"),
    dec: (s) => { let t = s.replace(/-/g, "+").replace(/_/g, "/"); while (t.length % 4) t += "="; return U.arrayify(U.base64.decode(t)); },
  };
  const kBridge = b58(cfg.koinos.bridge);
  const eBridge = U.getAddress(cfg.eth.bridge);

  // ------------------------------------------------------------ addresses + amounts (same rules as the contracts)
  function koinosAddress(s) {
    let a;
    try { a = b58(s); } catch (e) { throw new Error("not a Koinos address"); }
    if (a.length !== 25 || a[0] !== 0 || a.slice(1, 21).every((x) => x === 0)) throw new Error("not a Koinos address");
    const c = U.arrayify(U.sha256(U.sha256(a.slice(0, 21))));
    if (!a.slice(21).every((x, i) => x === c[i])) throw new Error("Koinos address checksum wrong");
    return a;
  }
  function koinosRecipient(s) {   // for Ethereum -> Koinos deposits
    const a = koinosAddress(s);
    if (hex(a) === hex(kBridge)) throw new Error("the Koinos bridge itself cannot receive");
    return a;
  }
  function ethRecipient(s) {       // for Koinos -> Ethereum deposits
    if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error("not an Ethereum address");
    const a = U.getAddress(s);
    if (a === ethers.constants.AddressZero || a === eBridge) throw new Error("this Ethereum address cannot receive");
    return a;
  }
  // amount (token units) -> 8-decimal units, exact or throw (no silent dust)
  function toAmount8(amount, decimals) {
    const v = BigInt(amount.toString());
    if (v <= 0n) throw new Error("amount must be > 0");
    let a8;
    if (decimals > 8) {
      const unit = 10n ** BigInt(decimals - 8);
      if (v % unit !== 0n) throw new Error(`amount must be a multiple of 10^${decimals - 8} (8 decimals on Koinos)`);
      a8 = v / unit;
    } else a8 = v * 10n ** BigInt(8 - decimals);
    if (a8 > MAX_U64) throw new Error("amount too large");
    return a8;
  }
  // 8-decimal units -> destination token units, exact or throw
  function fromAmount8(a8, decimals) {
    const v = BigInt(a8.toString());
    if (v <= 0n || v > MAX_U64) throw new Error("amount out of range");
    if (decimals >= 8) return v * 10n ** BigInt(decimals - 8);
    const unit = 10n ** BigInt(8 - decimals);
    if (v % unit !== 0n) throw new Error(`amount not representable with ${decimals} decimals`);
    return v / unit;
  }

  // ------------------------------------------------------------ claim messages (byte-identical to the contracts)
  function pbVarint(v) { const out = []; let x = BigInt(v); if (x < 0n || x > MAX_U64) throw new Error("value out of range"); while (x >= 0x80n) { out.push(Number(x & 0x7fn) | 0x80); x >>= 7n; } out.push(Number(x)); return out; }
  function pbUint(f, v) { return BigInt(v) === 0n ? [] : [...pbVarint(f << 3), ...pbVarint(v)]; }
  function pbBytes(f, b) { return b.length === 0 ? [] : [...pbVarint((f << 3) | 2), ...pbVarint(b.length), ...b]; }
  // Koinos claim_hash: canonical proto3, default values omitted, sha256
  function koinosClaimDigest(c) {
    const bytes = new Uint8Array([
      ...pbBytes(1, U.toUtf8Bytes(CLAIM_VERSION)), ...pbBytes(2, kBridge), ...pbUint(3, cfg.koinos.bridgeChainId),
      ...pbUint(4, cfg.eth.bridgeChainId), ...pbBytes(5, U.arrayify(eBridge)), ...pbUint(6, c.depositNonce),
      ...pbBytes(7, koinosAddress(c.token)), ...pbBytes(8, koinosRecipient(c.recipient)), ...pbUint(9, c.amount8), ...pbUint(10, c.expiry)]);
    return U.sha256(bytes);
  }
  const ethDomain = () => ({ name: "VortexBridge", version: "2", chainId: cfg.eth.networkChainId, verifyingContract: eBridge });
  const sourceBridge32 = () => U.hexlify(U.concat([kBridge, new Uint8Array(7)]));
  const ethValue = (c) => ({ sourceChain: cfg.koinos.bridgeChainId, sourceBridge: sourceBridge32(), depositNonce: c.depositNonce.toString(),
    token: U.getAddress(c.token), recipient: ethRecipient(c.recipient), amount8: c.amount8.toString(), expiry: c.expiry.toString() });
  const ethClaimDigest = (c) => U._TypedDataEncoder.hash(ethDomain(), CLAIM_TYPES, ethValue(c));

  // accept only what the CONTRACTS accept, and submit exactly that canonical form — otherwise one hostile
  // validator could hand the page a variant (64-byte, high-s, v 0/1, another base64 alphabet) that the page accepts but
  // the contract refuses, and block every claim. Both: 0 < r < N, 0 < s <= N/2 (OpenZeppelin ECDSA / Koinos canonical).
  const SECP_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n, HALF_N = SECP_N >> 1n;
  const rsOk = (b, at) => { const r = BigInt(hex(b.slice(at, at + 32))), s = BigInt(hex(b.slice(at + 32, at + 64)));
    return r > 0n && r < SECP_N && s > 0n && s <= HALF_N; };
  function canonicalEth(sig) {        // exactly 65 bytes r | s | v, v 27 or 28 -> lower-case hex
    if (typeof sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(sig)) throw new Error("not a 65-byte signature");
    const b = U.arrayify(sig);
    if ((b[64] !== 27 && b[64] !== 28) || !rsOk(b, 0)) throw new Error("non-canonical signature");
    return sig.toLowerCase();
  }
  function canonicalKoinos(sig) {     // exactly 65 bytes header(31..34) | r | s -> freshly encoded url-safe base64
    if (typeof sig !== "string" || sig.length > 200) throw new Error("bad signature");
    const b = b64url.dec(sig);
    if (b.length !== 65 || b[0] < 31 || b[0] > 34 || !rsOk(b, 1)) throw new Error("non-canonical signature");
    return b64url.enc(b);
  }
  // Koinos compact signature (31+recid | r | s) -> Koinos address of the signer
  function recoverKoinos(digest, sigB64) {
    const s = b64url.dec(sigB64);
    if (s.length !== 65 || s[0] < 31 || s[0] > 34) throw new Error("bad Koinos signature");
    const pub = U.recoverPublicKey(digest, { r: hex(s.slice(1, 33)), s: hex(s.slice(33, 65)), recoveryParam: s[0] - 31 });
    const body = U.concat(["0x00", U.ripemd160(U.sha256(U.computePublicKey(pub, true)))]);
    return U.base58.encode(U.concat([body, U.hexDataSlice(U.sha256(U.sha256(body)), 0, 4)]));
  }

  // ------------------------------------------------------------ claims from the user's OWN deposit
  // Koinos deposit_event (base64 of the proto) -> its fields; the Koinos token tells the caller which partner to look up
  function readKoinosDeposit(eventDataB64) {
    const b = b64url.dec(eventDataB64); const f = {}; let i = 0;
    const rv = () => { let r = 0n, sh = 0n; for (;;) { if (i >= b.length || sh > 63n) throw new Error("bad deposit event");
      const x = b[i++]; if (sh === 63n && x > 1) throw new Error("bad deposit event");   // uint64 only
      if (x === 0 && sh > 0n) throw new Error("bad deposit event");                     // overlong (non-canonical) form
      r |= BigInt(x & 0x7f) << sh; sh += 7n; if (x < 0x80) return r; } };
    while (i < b.length) { const k = Number(rv()); const n = k >> 3, w = k & 7;
      if (w === 0) f[n] = rv(); else if (w === 2) { const l = Number(rv()); if (i + l > b.length) throw new Error("bad deposit event"); f[n] = b.slice(i, i + l); i += l; }
      else throw new Error("bad deposit event"); }
    if (!f[1] || !f[4] || !(f[3] instanceof Uint8Array) || !(f[5] instanceof Uint8Array)) throw new Error("bad deposit event");
    return { nonce: f[1], token: U.base58.encode(f[3]), amount8: f[4], recipient: hex(f[5]), toChain: f[6] || 0n };
  }
  // Koinos -> Ethereum: `eventDataB64` = data of the bridge.deposit_event in the user's transaction; ethToken = partner.
  function claimFromKoinosDeposit(eventDataB64, ethToken) {
    const d = readKoinosDeposit(eventDataB64);
    if (d.toChain !== BigInt(cfg.eth.bridgeChainId)) throw new Error("deposit is not towards this Ethereum bridge");
    return { direction: "k2e", depositNonce: d.nonce, token: U.getAddress(ethToken), recipient: ethRecipient(d.recipient), amount8: d.amount8 };
  }
  // Ethereum -> Koinos: `log` = the Deposit log from the user's receipt; koinosToken = partner (base58).
  const depositIface = new U.Interface(["event Deposit(uint64 indexed nonce, address indexed token, address indexed from, bytes25 recipient, uint256 amount8, uint32 toChain)"]);
  function claimFromEthDeposit(log, koinosToken) {
    if (U.getAddress(log.address) !== eBridge) throw new Error("log is not from the Ethereum bridge");
    const e = depositIface.parseLog(log).args;
    if (e.toChain !== cfg.koinos.bridgeChainId) throw new Error("deposit is not towards Koinos");
    const rec = U.base58.encode(e.recipient);
    koinosRecipient(rec);
    return { direction: "e2k", depositNonce: e.nonce.toBigInt(), token: koinosToken, recipient: rec, amount8: e.amount8.toBigInt() };
  }

  // ------------------------------------------------------------ collect + verify signatures
  // One expiry in the unit the destination contract uses: Ethereum = unix seconds, Koinos = unix milliseconds.
  // Validators accept 10 min .. 2 h from now; 1 h leaves room for clock skew and a slow wallet.
  function expiryFor(direction, nowMs = Date.now()) {
    if (direction === "k2e") return BigInt(Math.floor(nowMs / 1000) + 3600);
    if (direction === "e2k") return BigInt(Math.floor(nowMs) + 3600 * 1000);
    throw new Error("unknown direction");
  }
  // isValidator(address) -> Promise<bool>: on-chain membership on the DESTINATION bridge (the UI passes a read call).
  // Membership comes from ONE node of the destination chain (the site's RPC): it decides what the page shows; the
  // destination contract re-checks every signature and the quorum when the claim is submitted.
  const withTimeout = (p, ms) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error("timeout")), ms); })]).finally(() => clearTimeout(t)); };
  // a validator answer is small — read at most 4 KiB WHILE streaming (a hostile URL cannot make the tab
  // allocate a huge body), then parse
  async function readSmall(r, max = 4096) {
    if (Number((r.headers && r.headers.get && r.headers.get("content-length")) || 0) > max) throw new Error("answer too large");
    // only a streamed body can be bounded while it arrives (browsers and Node always give one): anything else is refused
    if (!r.body || typeof r.body.getReader !== "function") throw new Error("answer not readable safely");
    const rd = r.body.getReader(), parts = []; let n = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; n += value.length;
      if (n > max) { try { await rd.cancel(); } catch (e) { /* ignore */ } throw new Error("answer too large"); } parts.push(value); }
    return JSON.parse(new TextDecoder().decode(U.concat(parts.length ? parts : [new Uint8Array(0)])));
  }
  // plain, short text (host names)
  const plain = (x) => String(x).replace(/[^\x20-\x7e]/g, "").slice(0, 120);
  // why a validator did not sign, in FIXED wording (shown when the quorum is missing): only the validator program's own
  // known answers are recognised, anything else shows as the HTTP status — a hostile host cannot put its text on the page
  const KNOWN = [["not seen at finality", "deposit not final yet"], ["not ready", "not ready yet"], ["halted", "signing halted"],
    ["conflicting records", "conflicting records"], ["busy", "busy"], ["expiry must be", "expiry out of range"], ["record unavailable", "record unavailable"]];
  const reason = (status, text) => { const s = String(text || "").toLowerCase(); const k = KNOWN.find(([m]) => s.includes(m)); return k ? k[1] : `HTTP ${status}`; };
  async function collect(claim, { expiry, isValidator, getValidatorCount, quorum, timeoutMs = 10000, operationTimeoutMs = 20000 }) {
    if (typeof getValidatorCount !== "function" && (!Number.isInteger(quorum) || quorum < 2 || quorum > 13)) throw new Error("bad quorum");
    if (typeof isValidator !== "function" || !["k2e", "e2k"].includes(claim.direction)) throw new Error("invalid collection request");
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000 || !Number.isInteger(operationTimeoutMs) || operationTimeoutMs < 1 || operationTimeoutMs > 30000) throw new Error("invalid collection deadline");
    const c = { ...claim, depositNonce: BigInt(claim.depositNonce), expiry: BigInt(expiry) };
    if (c.depositNonce < 1n || c.depositNonce > MAX_U64 || c.expiry < 1n || c.expiry > MAX_U64) throw new Error("claim integer out of range");
    const digest = c.direction === "k2e" ? ethClaimDigest(c) : koinosClaimDigest(c);
    const problems = [], good = new Map(), membership = new Map();
    const end = Date.now() + operationTimeoutMs;
    const operation = new AbortController();
    const overallTimer = setTimeout(() => operation.abort(), operationTimeoutMs);
    const remaining = () => Math.max(0, end - Date.now());
    const expiresAt = () => c.expiry * (c.direction === "k2e" ? 1000n : 1n);
    let answered = 0, notReady = false, usedBackup = false, deadlineExpired = false, signerLimit = 19;
    const issue = (text) => { if (problems.length < 3 && !problems.includes(text)) problems.push(text); };
    async function request(base, path, max, ms) {
      if (operation.signal.aborted || !remaining()) throw new Error("timeout");
      const ctrl = new AbortController();
      const abort = () => ctrl.abort();
      operation.signal.addEventListener("abort", abort, { once: true });
      const limit = Math.min(ms, remaining());
      const timer = setTimeout(abort, limit);
      try {
        // Bound even a non-cooperating custom fetch/body reader; native fetch also cancels the network work.
        return await withTimeout((async () => {
          const r = await fetchFn(base + path, { signal: ctrl.signal, redirect: "error", credentials: "omit", cache: "no-store" });
          const body = await readSmall(r, max);
          return { status: r.status, body };
        })(), limit);
      } finally { clearTimeout(timer); ctrl.abort(); operation.signal.removeEventListener("abort", abort); }
    }
    async function memberRead(fn) {
      if (operation.signal.aborted || !remaining()) throw new Error("timeout");
      const ctrl = new AbortController(), abort = () => ctrl.abort();
      operation.signal.addEventListener("abort", abort, { once: true });
      const ms = Math.min(timeoutMs, remaining()), timer = setTimeout(abort, ms);
      try { return await withTimeout(Promise.resolve().then(() => fn({ signal: ctrl.signal })), ms); }
      finally { clearTimeout(timer); ctrl.abort(); operation.signal.removeEventListener("abort", abort); }
    }
    // signers are recovered locally first (an answer holds at most 19); their membership is read in rounds of at most
    // `signerLimit` (the validator count, else the contracts' 19) and only until the quorum is verified, so one hostile
    // answer cannot cause a burst of reads — and valid signers after removed ones still count
    async function check(candidates) {
      const pairs = new Map();
      for (const signature of candidates) {
        try {
          const sig = c.direction === "k2e" ? canonicalEth(signature) : canonicalKoinos(signature);
          const signer = c.direction === "k2e" ? U.verifyTypedData(ethDomain(), CLAIM_TYPES, ethValue(c), sig) : recoverKoinos(digest, sig);
          if (!pairs.has(signer)) pairs.set(signer, sig);
        } catch (e) { /* not a canonical signature: never reaches a membership read */ }
      }
      const list = [...pairs];
      for (let at = 0; at < list.length && good.size < quorum && !operation.signal.aborted && remaining(); at += Math.max(1, signerLimit)) {
        await checkRound(list.slice(at, at + Math.max(1, signerLimit)));
      }
    }
    async function checkRound(round) {
      const checked = await Promise.all(round.map(async ([signer, sig]) => {
        if (operation.signal.aborted || !remaining()) return null;
        try {
          if (!membership.has(signer)) {
            // a failed read is no answer: it is not kept, so the backup collector's copy is read again
            const read = memberRead((options) => isValidator(signer, options));
            membership.set(signer, read);
            read.catch(() => { if (membership.get(signer) === read) membership.delete(signer); });
          }
          return (await membership.get(signer)) === true && !operation.signal.aborted && remaining() ? [signer, sig] : null;
        } catch (e) { return null; }
      }));
      for (const pair of checked) if (pair && !good.has(pair[0])) good.set(pair[0], pair[1]);
    }
    function collectorCandidates(rep) {
      if (!rep || rep.version !== 1 || rep.deployment !== cfg.deployment || rep.direction !== c.direction || rep.depositNonce !== c.depositNonce.toString() || rep.expiry !== c.expiry.toString()
          || !Array.isArray(rep.responses) || !Array.isArray(rep.unavailable) || rep.responses.length + rep.unavailable.length > 19) throw new Error("invalid collector response");
      const ids = new Set(), signatures = [];
      for (const item of [...rep.responses, ...rep.unavailable]) {
        if (!item || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(item.validatorId || "") || ids.has(item.validatorId)) throw new Error("invalid collector slots");
        ids.add(item.validatorId);
      }
      const fixedReasons = ["timeout", "unavailable", "busy", "not ready", "deposit not final", "halted", "invalid response", "expiry rejected"];
      for (const item of rep.unavailable) {
        if (!fixedReasons.includes(item.reason)) throw new Error("invalid collector reason");
        if (["not ready", "deposit not final", "halted"].includes(item.reason)) notReady = true;
      }
      for (const item of rep.responses) {
        if (typeof item.signature !== "string" || item.signature.length > 200 || /[^\x20-\x7e]/.test(item.signature)) throw new Error("invalid signature field");
        signatures.push(item.signature);
      }
      return signatures;
    }
    try {
      if (typeof getValidatorCount === "function") { const n = await memberRead(getValidatorCount); quorum = quorumFor(n); signerLimit = n; }
      if (expiresAt() <= BigInt(Date.now())) { issue("signature request expired"); }
      else if (collectionMode === "collector") {
        for (let i = 0; i < collectors.length && good.size < quorum && remaining() && !operation.signal.aborted; i++) {
          usedBackup = i === 1;
          try {
            const { status, body } = await request(collectors[i], `/v1/claims/${c.direction}/${c.depositNonce}?expiry=${c.expiry}`, 16384, Math.min(timeoutMs, 5000));
            if (status !== 200) { issue(i === 0 ? "primary collector unavailable" : "backup collector unavailable"); continue; }
            const candidates = collectorCandidates(body);
            answered++;
            await check(candidates);
          } catch (e) { issue(i === 0 ? "primary collector unavailable" : "backup collector unavailable"); }
        }
      } else {
        if (!Array.isArray(cfg.validators) || cfg.validators.length < 1 || cfg.validators.length > 19) throw new Error("invalid validator endpoints");
        const answers = await Promise.all(cfg.validators.map(async (base) => {
          const who = plain(base.replace(/^https?:\/\//, "").replace(/\/$/, ""));
          try {
            const { status, body } = await request(base.replace(/\/$/, ""), `/v2/claim/${c.direction}/${c.depositNonce}?expiry=${c.expiry}`, 4096, timeoutMs);
            if (status !== 200) { issue(`${who}: ${reason(status, body && body.error)}`); return null; }
            return body && body.signature;
          } catch (e) { issue(`${who}: no answer`); return null; }
        }));
        await check(answers.filter((s) => typeof s === "string"));
      }
      deadlineExpired = operation.signal.aborted || !remaining();
    } finally { clearTimeout(overallTimer); operation.abort(); }
    const expired = expiresAt() <= BigInt(Date.now());
    const list = expired || deadlineExpired ? [] : [...good.entries()];
    if (c.direction === "k2e") list.sort((x, y) => (x[0].toLowerCase() < y[0].toLowerCase() ? -1 : 1));
    const enough = list.length >= quorum;
    const outcome = enough ? "ready" : expired ? "expired" : deadlineExpired ? "timeout" : collectionMode === "collector" && !answered ? "collector unavailable" : notReady ? "validators not ready" : "insufficient signatures";
    const used = list.slice(0, quorum);                                // signers[i] signed signatures[i]
    return { claim: c, digest, quorum, signatures: used.map((x) => x[1]), signers: used.map((x) => x[0]), enough,
      problems, outcome, usedBackup };
  }

  // ------------------------------------------------------------ transaction arguments
  const ethClaimArgs = (c, sigs) => [[cfg.koinos.bridgeChainId, sourceBridge32(), c.depositNonce.toString(), U.getAddress(c.token),
    ethRecipient(c.recipient), c.amount8.toString(), c.expiry.toString()], sigs];
  const koinosClaimArgs = (c, sigs) => ({ sourceChain: cfg.eth.bridgeChainId, sourceBridge: eBridge.toLowerCase(), depositNonce: c.depositNonce.toString(),
    token: c.token, recipient: c.recipient, amount8: c.amount8.toString(), expiry: c.expiry.toString(), signatures: sigs });
  // same formula as both contracts (two-thirds + 1, as Wormhole); both keep 3 to 19 validators, so anything else is a bad answer from the node
  function quorumFor(n) {
    if (!Number.isInteger(n) || n < 3 || n > 19) throw new Error("validator set not readable");
    return Math.floor(n * 2 / 3) + 1;
  }
  // deposit identities (status: already claimed?)
  const ethDepositId = (nonce) => U.keccak256(U.defaultAbiCoder.encode(["uint32", "bytes32", "uint64"], [cfg.koinos.bridgeChainId, sourceBridge32(), nonce.toString()]));
  function koinosDepositId(nonce) {
    const b = new Uint8Array(32); const dv = new DataView(b.buffer);
    dv.setUint32(0, cfg.eth.bridgeChainId); b.set(U.arrayify(eBridge), 4); dv.setBigUint64(24, BigInt(nonce));
    return U.hexlify(U.concat(["0x1220", U.sha256(b)]));
  }

  return { koinosAddress, koinosRecipient, ethRecipient, toAmount8, fromAmount8, koinosClaimDigest, ethClaimDigest, recoverKoinos,
    readKoinosDeposit, claimFromKoinosDeposit, claimFromEthDeposit, expiryFor, collect, ethClaimArgs, koinosClaimArgs, quorumFor, ethDepositId, koinosDepositId,
    canonicalEth, canonicalKoinos };
}
