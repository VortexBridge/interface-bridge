import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { ethers } from "ethers";
import * as koilib from "koilib";
import { createFlows } from "../flows.mjs";

const abi = JSON.parse(fs.readFileSync(new URL("../../assets/contracts/Koinos-Bridge-v2.json", import.meta.url)));
const cfg = { koinos: { bridge: "19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK", bridgeChainId: 1 },
  eth: { bridge: "0x0000000000000000000000000000000000000001", networkChainId: 1, bridgeChainId: 2 }, validators: [] };
// any use (a read, a wallet prompt) of this object fails the refusal checks below
const untouchable = new Proxy({}, { get: () => { throw new Error("must not be used"); } });

test("Ethereum deposits, approvals and claims refuse a wallet on another network before anything else", async () => {
  const flows = createFlows({ ethers, koilib, cfg, koinosBridgeAbi: abi, koinosReader: untouchable });
  let asked = 0;
  const signer = { getChainId: async () => { asked++; return 5; } };
  const args = { signer, token: cfg.eth.bridge, amount: 100000000n, recipient: "x", pageDecimals: 8 };
  for (const run of [() => flows.checkEthDeposit(args), () => flows.ethApprove(args), () => flows.depositFromEth(args), () => flows.claimOnEth(signer, untouchable)])
    await assert.rejects(run(), (e) => e.permanent === true && /another network/.test(e.message));
  assert.equal(asked, 4);
});

test("Koinos claims refuse too few or (almost) expired signatures before any read or wallet prompt", async () => {
  const flows = createFlows({ ethers, koilib, cfg, koinosBridgeAbi: abi });
  const claim = (ms) => ({ direction: "e2k", depositNonce: 1n, token: cfg.koinos.bridge, recipient: cfg.koinos.bridge, amount8: 1n, expiry: BigInt(Date.now() + ms) });
  for (const [got, why] of [
    [{ enough: false, quorum: 3, signatures: ["a", "b"], claim: claim(3600000) }, /not enough/],
    [{ enough: true, quorum: 3, signatures: ["a", "b"], claim: claim(3600000) }, /not enough/],
    [{ enough: true, signatures: ["a", "b", "c"], claim: claim(3600000) }, /not enough/],
    [{ enough: true, quorum: 3, signatures: ["a", "b", "c"], claim: claim(30000) }, /expired/],
    [{ enough: true, quorum: 3, signatures: ["a", "b", "c"], claim: claim(-1000) }, /expired/],
  ]) {
    await assert.rejects(flows.checkKoinosClaim(untouchable, got), why);
    await assert.rejects(flows.claimOnKoinos(untouchable, untouchable, got), why);
  }
});
