import test from "node:test";
import assert from "node:assert/strict";
import { contractQuorum, makeQuorumSnapshot, signaturesMeetQuorum } from "./bridgeQuorum.mjs";

test("matches the reviewed contract formula", () => {
  assert.deepEqual([1, 2, 2, 3, 3, 4, 5, 5, 6], [1, 2, 3, 4, 5, 6, 7, 8, 9].map(contractQuorum));
});

test("requires two distinct members for a fresh three-member snapshot", () => {
  const snapshot = makeQuorumSnapshot({ family: "evm", contract: "bridge", members: ["0xA", "0xB", "0xC"], fetchedAt: 1000 });
  assert.equal(signaturesMeetQuorum({ validators: ["0xa", "0xB"], signatures: ["sig-a", "sig-b"] }, snapshot, 2000), true);
  assert.equal(signaturesMeetQuorum({ validators: ["0xa", "0xA"], signatures: ["sig-a", "sig-a2"] }, snapshot, 2000), false);
  assert.equal(signaturesMeetQuorum({ validators: ["0xa", "0xD"], signatures: ["sig-a", "sig-d"] }, snapshot, 2000), false);
});

test("stale or malformed snapshots never enable redemption", () => {
  const snapshot = makeQuorumSnapshot({ family: "koinos", contract: "bridge", members: ["one", "two", "three"], fetchedAt: 1000 });
  assert.equal(signaturesMeetQuorum({ validators: ["one", "two"], signatures: ["a", "b"] }, snapshot, 32001), false);
  assert.equal(makeQuorumSnapshot({ family: "evm", contract: "", members: ["0xa"] }), null);
  assert.equal(contractQuorum(0), null);
});
