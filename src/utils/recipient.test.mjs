import assert from "node:assert/strict";
import { test } from "node:test";
import { ethers } from "ethers";
import { createVortex } from "../v2/vortex-v2.mjs";
import { recipientError } from "./recipient.mjs";

const koinos = "1BoatSLRHtKNngkdXEeobR76b53LETtpyT";
const eth = "0x52908400098527886E0F7030069857D2E4169EE7";
const bridge = "0x0000000000000000000000000000000000000001";
const kBridge = "1BitcoinEaterAddressDontSendf59kuE";
const vx = createVortex({ ethers, cfg: { koinos: { bridge: kBridge, bridgeChainId: 1 }, eth: { bridge, networkChainId: 1, bridgeChainId: 2 }, validators: [] } });

test("valid Ethereum forms match the flow's recipient rules", () => {
  for (const address of [eth, eth.toLowerCase(), "0x0000000000000000000000000000000000000002"]) {
    assert.equal(recipientError(address, "evm", bridge), "");
    assert.doesNotThrow(() => vx.ethRecipient(address));
  }
});
test("malformed, checksum, zero and bridge destinations fail before a wallet prompt", () => {
  for (const address of ["not-an-address", "0x1234", eth.replace("EE7", "Ee7"), ethers.constants.AddressZero, bridge, " " + eth, koinos]) {
    assert.notEqual(recipientError(address, "evm", bridge), "", address);
    assert.throws(() => vx.ethRecipient(address));
  }
});
test("Koinos checks encoding, length, version, checksum, zero payload and bridge", () => {
  assert.equal(recipientError(koinos, "koinos", kBridge), "");
  assert.doesNotThrow(() => vx.koinosRecipient(koinos));
  const zeroPayload = new Uint8Array(21);
  const checksum = ethers.utils.arrayify(ethers.utils.sha256(ethers.utils.sha256(zeroPayload))).slice(0, 4);
  const zero = ethers.utils.base58.encode(new Uint8Array([...zeroPayload, ...checksum]));
  for (const address of ["not-an-address", koinos.slice(0, -1) + "U", koinos + "1", zero, kBridge, eth]) {
    assert.notEqual(recipientError(address, "koinos", kBridge), "", address);
    assert.throws(() => vx.koinosRecipient(address));
  }
});
test("editing starts without an error and changing the chain revalidates", () => {
  assert.equal(recipientError("", "evm", bridge), "");
  assert.equal(recipientError("", "koinos", kBridge), "");
  assert.notEqual(recipientError(eth, "koinos", kBridge), "");
  assert.equal(recipientError(eth, "evm", bridge), "");
});
