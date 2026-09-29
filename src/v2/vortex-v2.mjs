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
  // what a validator said when it did not sign (plain, short text; shown when the quorum is missing)
  const plain = (x) => String(x).replace(/[^\x20-\x7e]/g, "").slice(0, 120);
  async function collect(claim, { expiry, isValidator, quorum, timeoutMs = 10000 }) {
    if (!Number.isInteger(quorum) || quorum < 2) throw new Error("bad quorum");
    const c = { ...claim, expiry: BigInt(expiry) };
    const digest = claim.direction === "k2e" ? ethClaimDigest(c) : koinosClaimDigest(c);
    const problems = [];
    const answers = await Promise.all(cfg.validators.map(async (base) => {
      const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
      const t = ctrl && setTimeout(() => ctrl.abort(), timeoutMs);
      const who = plain(base.replace(/^https?:\/\//, "").replace(/\/$/, ""));
      try {
        const r = await fetchFn(`${base.replace(/\/$/, "")}/v2/claim/${claim.direction}/${claim.depositNonce}?expiry=${expiry}`, ctrl ? { signal: ctrl.signal } : {});
        if (r.status !== 200) { let why = `HTTP ${r.status}`; try { const j = await readSmall(r); if (j && j.error) why = j.error; } catch (e) { /* keep the status */ }
          problems.push(`${who}: ${plain(why)}`); return null; }
        return await readSmall(r);
      } catch (e) { problems.push(`${who}: no answer`); return null; } finally { if (t) clearTimeout(t); }
    }));
    // each answer: recover the signer of OUR message, then ask the chain whether it is a validator (in parallel, bounded)
    const checked = await Promise.all(answers.map(async (a) => {
      if (!a || typeof a.signature !== "string") return null;
      try {
        const sig = claim.direction === "k2e" ? canonicalEth(a.signature) : canonicalKoinos(a.signature);   // what gets submitted
        const signer = claim.direction === "k2e" ? U.verifyTypedData(ethDomain(), CLAIM_TYPES, ethValue(c), sig) : recoverKoinos(digest, sig);
        return (await withTimeout(Promise.resolve(isValidator(signer)), timeoutMs)) === true ? [signer, sig] : null;
      } catch (e) { return null; }   // malformed / non-canonical / wrong message / no answer from the chain: ignore
    }));
    const good = new Map();   // signer -> signature (one per signer)
    for (const x of checked) if (x && !good.has(x[0])) good.set(x[0], x[1]);
    const list = [...good.entries()];
    if (claim.direction === "k2e") list.sort((x, y) => (x[0].toLowerCase() < y[0].toLowerCase() ? -1 : 1));   // contract wants ascending signers
    return { claim: c, digest, quorum, signatures: list.map((x) => x[1]).slice(0, quorum), signers: list.map((x) => x[0]), enough: list.length >= quorum,
      problems: problems.slice(0, 3) };
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
