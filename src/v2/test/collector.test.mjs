import test from "node:test";
import assert from "node:assert/strict";
import { ethers } from "ethers";
import { createVortex } from "../vortex-v2.mjs";

const U = ethers.utils;
const wallets = Array.from({ length: 8 }, (_, i) => new ethers.Wallet(U.hexZeroPad(U.hexlify(i + 1), 32)));
function kAddress(wallet) {
  const body = U.concat(["0x00", U.ripemd160(U.sha256(U.computePublicKey(wallet.publicKey, true)))]);
  return U.base58.encode(U.concat([body, U.hexDataSlice(U.sha256(U.sha256(body)), 0, 4)]));
}
const config = {
  koinos: { bridge: kAddress(wallets[5]), bridgeChainId: 1 },
  eth: { bridge: wallets[5].address, networkChainId: 1, bridgeChainId: 2 },
  collectionMode: "collector", deployment: "test-deployment",
  collectors: ["https://primary.example", "https://backup.example"],
};
function claimFor(direction) {
  return { direction, depositNonce: 1n, token: direction === "k2e" ? wallets[6].address : kAddress(wallets[6]),
    recipient: direction === "k2e" ? wallets[7].address : kAddress(wallets[7]), amount8: 100000000n };
}
function setup(direction = "k2e", cfg = config) {
  const vx = createVortex({ ethers, cfg });
  const claim = claimFor(direction), expiry = vx.expiryFor(direction);
  const sign = (i, changes = {}, signer = vx) => {
    const c = { ...claim, expiry, ...changes };
    const digest = direction === "k2e" ? signer.ethClaimDigest(c) : signer.koinosClaimDigest(c);
    const sig = wallets[i]._signingKey().signDigest(digest);
    return direction === "k2e" ? U.joinSignature(sig) : U.base64.encode(U.concat([new Uint8Array([31 + sig.recoveryParam]), sig.r, sig.s])).replace(/\+/g, "-").replace(/\//g, "_");
  };
  const rep = (signatures, changes = {}) => ({ version: 1, deployment: cfg.deployment, direction, depositNonce: "1", expiry: expiry.toString(),
    responses: signatures.map((signature, i) => ({ validatorId: `slot-${i}`, signature })), unavailable: [], ...changes });
  const members = new Set(wallets.slice(0, 5).map((w) => direction === "k2e" ? w.address : kAddress(w)));
  return { vx, claim, expiry, sign, rep, isValidator: async (s) => members.has(s) };
}
const json = (rep) => new Response(JSON.stringify(rep), { status: 200, headers: { "content-type": "application/json" } });

for (const direction of ["k2e", "e2k"]) {
  test(`${direction}: independently verified partial results combine through backup`, async () => {
    const f = setup(direction), calls = [], checked = [];
    const responses = [f.rep([f.sign(0), f.sign(1)]), f.rep([f.sign(1), f.sign(2), f.sign(3)])];
    const vx = createVortex({ ethers, cfg: config, fetch: async (url, opts) => {
      assert.equal(opts.credentials, "omit"); assert.equal(opts.redirect, "error");
      calls.push(url); return json(responses.shift());
    } });
    const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: vx.quorumFor(5), isValidator: async (s) => { checked.push(s); return f.isValidator(s); } });
    assert.equal(got.enough, true); assert.equal(got.signatures.length, 4); assert.equal(got.usedBackup, true);
    assert.equal(new Set(got.signers).size, 4); assert.equal(checked.length, 4);
    assert.equal(calls.length, 2);
    assert(calls[0].startsWith(config.collectors[0])); assert(calls[1].startsWith(config.collectors[1]));
    assert.equal(new URL(calls[0]).search, new URL(calls[1]).search);
    if (direction === "k2e") assert.deepEqual(got.signers, [...got.signers].sort((a,b) => a.toLowerCase().localeCompare(b.toLowerCase())));
  });
  test(`${direction}: three validators still require three distinct signatures`, async () => {
    const f = setup(direction);
    const vx = createVortex({ ethers, cfg: config, fetch: async () => json(f.rep([f.sign(0), f.sign(1), f.sign(1)])) });
    const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: vx.quorumFor(3), isValidator: f.isValidator });
    assert.equal(got.enough, false); assert.equal(got.signers.length, 2); assert.equal(got.outcome, "insufficient signatures");
  });
  test(`${direction}: wrong claim fields and outsider signatures never count`, async () => {
    const f = setup(direction);
    const wrong = [
      f.sign(0, { amount8: 2n }), f.sign(1, { depositNonce: 2n }), f.sign(2, { expiry: f.expiry + 1n }),
      f.sign(3, { token: direction === "k2e" ? wallets[4].address : kAddress(wallets[4]) }),
      f.sign(4, { recipient: direction === "k2e" ? wallets[4].address : kAddress(wallets[4]) }), f.sign(6),
    ];
    for (const altered of [
      { ...config, eth: { ...config.eth, bridge: wallets[4].address } },
      { ...config, eth: { ...config.eth, networkChainId: 2 } },
      { ...config, koinos: { ...config.koinos, bridgeChainId: 9 } },
    ]) {
      // Ethereum's network ID is intentionally not part of the existing Koinos digest; do not invent a new domain.
      if (direction === "e2k" && altered.eth.networkChainId === 2) continue;
      wrong.push(f.sign(0, {}, createVortex({ ethers, cfg: altered })));
    }
    const vx = createVortex({ ethers, cfg: config, fetch: async () => json(f.rep(wrong)) });
    const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, isValidator: f.isValidator });
    assert.equal(got.enough, false); assert.equal(got.signatures.length, 0);
  });
}

test("full primary outage uses backup once without a direct request", async () => {
  const f = setup(), calls = [];
  const vx = createVortex({ ethers, cfg: config, fetch: async (url) => {
    calls.push(url); if (url.startsWith(config.collectors[0])) throw new Error("private origin secret must not appear");
    return json(f.rep([f.sign(0), f.sign(1), f.sign(2), f.sign(3)]));
  } });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, isValidator: f.isValidator });
  assert.equal(got.enough, true); assert.equal(calls.length, 2); assert(got.usedBackup);
  assert(!got.problems.join().includes("secret"));
});

test("matching metadata and inflated counts cannot manufacture quorum", async () => {
  const f = setup();
  const vx = createVortex({ ethers, cfg: config, fetch: async () => json(f.rep([f.sign(0), f.sign(0), f.sign(0), f.sign(0)], { enough: true, quorum: 1, signatureCount: 99 })) });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, isValidator: f.isValidator });
  assert(!got.enough); assert.equal(got.signers.length, 1);
});

test("wrong metadata, slots and oversized streams are refused before verification", async () => {
  const f = setup();
  for (const body of [
    f.rep([f.sign(0)], { deployment: "other" }), f.rep([f.sign(0)], { expiry: (f.expiry+1n).toString() }),
    f.rep([f.sign(0)], { depositNonce: "2" }), f.rep([f.sign(0)], { direction: "e2k" }), f.rep([f.sign(0)], { version: 2 }),
    f.rep([f.sign(0)], { responses: [{ validatorId: "https://private.invalid", signature: f.sign(0) }] }),
    f.rep(Array(20).fill(f.sign(0))), f.rep([f.sign(0)], { unavailable: [{ validatorId: "slot-0", reason: "timeout" }] }),
    f.rep([f.sign(0)], { pad: "x".repeat(17000) }),
  ]) {
    let checks = 0;
    const vx = createVortex({ ethers, cfg: config, fetch: async () => json(body) });
    const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, isValidator: async () => { checks++; return true; } });
    assert(!got.enough); assert.equal(checks, 0); assert.equal(got.outcome, "collector unavailable");
    assert(!got.problems.join().includes("private.invalid"));
  }
});

test("distinct fixed outcomes and expired requests never prepare a claim", async () => {
  const f = setup();
  for (const [body, expected] of [[null, "collector unavailable"], [f.rep([], { unavailable: [{ validatorId: "slot", reason: "not ready" }] }), "validators not ready"], [f.rep([]), "insufficient signatures"]]) {
    const vx = createVortex({ ethers, cfg: config, fetch: async () => { if (!body) throw new Error("down"); return json(body); } });
    const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, isValidator: f.isValidator });
    assert(!got.enough); assert.equal(got.outcome, expected);
  }
  const vx = createVortex({ ethers, cfg: config, fetch: () => { throw new Error("must not request expired claim"); } });
  const expired = await vx.collect(f.claim, { expiry: 1, quorum: 4, isValidator: f.isValidator });
  assert.equal(expired.outcome, "expired"); assert(!expired.enough);
});

test("overall deadline bounds a stalled membership RPC", async () => {
  const f = setup();
  const vx = createVortex({ ethers, cfg: config, fetch: async () => json(f.rep([f.sign(0), f.sign(1), f.sign(2), f.sign(3)])) });
  const start = Date.now();
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, timeoutMs: 1000, operationTimeoutMs: 80, isValidator: () => new Promise(() => {}) });
  assert(!got.enough); assert.equal(got.outcome, "timeout"); assert(Date.now()-start < 500);
});

test("a stalled fetch is cancelled and backup is attempted within the deadline", async () => {
  const f = setup(), calls = [];
  let cancelled = false;
  const vx = createVortex({ ethers, cfg: config, fetch: (url, options) => {
    calls.push(url);
    if (url.startsWith(config.collectors[1])) return Promise.resolve(json(f.rep([f.sign(0), f.sign(1), f.sign(2), f.sign(3)])));
    options.signal.addEventListener("abort", () => { cancelled = true; });
    return new Promise(() => {});
  } });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 4, timeoutMs: 30, operationTimeoutMs: 500, isValidator: f.isValidator });
  assert(got.enough); assert(cancelled); assert.equal(calls.length, 2);
});

test("collector configuration excludes direct URLs and requires two HTTPS origins", () => {
  for (const bad of [
    { ...config, validators: ["https://private.invalid"] }, { ...config, collectors: [config.collectors[0]] },
    { ...config, collectors: [config.collectors[0], config.collectors[0]+"/"] },
    { ...config, collectors: ["http://public.example", config.collectors[1]] },
    { ...config, collectors: ["https://name:password@public.example", config.collectors[1]] },
    { ...config, collectors: ["https://public.example/path", config.collectors[1]] }, { ...config, deployment: "" },
  ]) assert.throws(() => createVortex({ ethers, cfg: bad }));
});

test("direct installations retain their existing endpoint protocol and verification", async () => {
  const f = setup(), bases = ["https://a.example", "https://b.example", "https://c.example"];
  const vx = createVortex({ ethers, cfg: { ...config, collectionMode: "direct", validators: bases }, fetch: async (url) => {
    const i = bases.findIndex((base) => url.startsWith(base)); assert(url.includes("/v2/claim/k2e/1?expiry=")); return json({ signature: f.sign(i) });
  } });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: vx.quorumFor(3), isValidator: f.isValidator });
  assert(got.enough); assert(!got.usedBackup);
});

test("noncanonical scalar and recovery variants never reach membership checks", async () => {
  const n = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
  for (const direction of ["k2e", "e2k"]) {
    const f = setup(direction), bad = [];
    const raw = direction === "k2e" ? U.arrayify(f.sign(0)) : U.base64.decode(f.sign(0).replace(/-/g,"+").replace(/_/g,"/"));
    const at = direction === "k2e" ? 0 : 1;
    for (const kind of ["zero-r", "zero-s", "high-s", "bad-recovery", "short"]) {
      let b = new Uint8Array(raw);
      if (kind === "zero-r") b.fill(0, at, at+32);
      if (kind === "zero-s") b.fill(0, at+32, at+64);
      if (kind === "high-s") b.set(U.arrayify(U.hexZeroPad("0x"+((n>>1n)+1n).toString(16),32)), at+32);
      if (kind === "bad-recovery") b[direction === "k2e" ? 64 : 0] = 0;
      if (kind === "short") b = b.slice(0,64);
      bad.push(direction === "k2e" ? U.hexlify(b) : U.base64.encode(b).replace(/\+/g,"-").replace(/\//g,"_"));
    }
    let checks = 0;
    const vx = createVortex({ethers,cfg:config,fetch:async()=>json(f.rep(bad))});
    const got = await vx.collect(f.claim,{expiry:f.expiry,quorum:4,isValidator:async()=>{checks++;return true;}});
    assert(!got.enough);assert.equal(checks,0);
  }
});

test("backup metadata cannot replace the primary expiry or invalidate its good partial result", async () => {
  const f=setup();let request=0;
  const vx=createVortex({ethers,cfg:config,fetch:async()=>json(++request===1?f.rep([f.sign(0),f.sign(1)]):f.rep([f.sign(2),f.sign(3)],{expiry:(f.expiry+1n).toString()}))});
  const got=await vx.collect(f.claim,{expiry:f.expiry,quorum:4,isValidator:f.isValidator});
  assert(!got.enough);assert.equal(got.signers.length,2);assert.equal(got.claim.expiry,f.expiry);
});

test("an expiry reached during collection never enables claim preparation", async () => {
  const f=setup("e2k"), expiry=BigInt(Date.now()+20);
  const vx=createVortex({ethers,cfg:config,fetch:async()=>{
    await new Promise((resolve)=>setTimeout(resolve,30));
    return json(f.rep([0,1,2,3].map((i)=>f.sign(i,{expiry})),{expiry:expiry.toString()}));
  }});
  const got=await vx.collect(f.claim,{expiry,quorum:4,isValidator:f.isValidator});
  assert(!got.enough);assert.equal(got.outcome,"expired");assert.equal(got.signatures.length,0);
});

for (const direction of ["k2e", "e2k"]) test(`${direction}: signers[i] signed signatures[i] when more than the quorum is verified`, async () => {
  const f = setup(direction), who = new Map([0, 1, 2, 3, 4].map((i) => [f.sign(i), direction === "k2e" ? wallets[i].address : kAddress(wallets[i])]));
  const vx = createVortex({ ethers, cfg: config, fetch: async () => json(f.rep([...who.keys()])) });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 3, isValidator: f.isValidator });
  assert(got.enough); assert.equal(got.signatures.length, 3); assert.equal(got.signers.length, 3);
  got.signatures.forEach((s, i) => assert.equal(who.get(s), got.signers[i]));
});

test("a failed membership read is not kept: the backup's copy of that signer is read again", async () => {
  const f = setup(), responses = [f.rep([f.sign(0), f.sign(1)]), f.rep([f.sign(0), f.sign(2)])], reads = [];
  const vx = createVortex({ ethers, cfg: config, fetch: async () => json(responses.shift()) });
  const got = await vx.collect(f.claim, { expiry: f.expiry, quorum: 3, isValidator: async (s) => {
    reads.push(s); if (s === wallets[0].address && reads.filter((x) => x === s).length === 1) throw new Error("rate limited");
    return f.isValidator(s);
  } });
  assert(got.enough); assert(got.usedBackup); assert.equal(reads.filter((s) => s === wallets[0].address).length, 2);
});

test("per answer only as many distinct signers as there are validators reach a membership read", async () => {
  const f = setup(), reads = [];
  const responses = [f.rep([5, 6, 7, 0, 1, 2].map((i) => f.sign(i))), f.rep([0, 1, 2].map((i) => f.sign(i)))];
  const vx = createVortex({ ethers, cfg: config, fetch: async () => json(responses.shift()) });
  const got = await vx.collect(f.claim, { expiry: f.expiry, getValidatorCount: async () => 3, isValidator: async (s) => { reads.push(s); return f.isValidator(s); } });
  assert(got.enough); assert(got.usedBackup); assert.equal(got.quorum, 3);
  assert.deepEqual(reads.slice(0, 3), [5, 6, 7].map((i) => wallets[i].address)); assert.equal(reads.length, 6);
});
