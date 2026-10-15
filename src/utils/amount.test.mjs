import assert from "node:assert/strict";
import { test } from "node:test";
import { parseTokenAmount, limitDecimals, tokenAmountError } from "./amount.js";

test("malformed amounts cannot become a different positive transfer", () => {
  for (const value of ["-1", "+1", "1e3", "1E-3", "abc", "1,000", "1,5", "1..2", "1.2.3", " 1", "1 ", "1\n", "Infinity", "NaN"]) {
    assert.notEqual(tokenAmountError(value, 8), "", value);
    assert.equal(parseTokenAmount(value, 8), null, value);
  }
});

test("normal decimal editing and the smallest transferable unit remain supported", () => {
  for (const [value, expected] of [["", "0"], [".", "0"], ["0", "0"], ["0.", "0"], ["1.", "100000000"], [".5", "50000000"], ["001.25", "125000000"], ["0.00000001", "1"], ["1.12345678", "112345678"]]) {
    assert.equal(tokenAmountError(value, 8), "", value);
    assert.equal(parseTokenAmount(value, 8), expected, value);
  }
});

test("excess precision is rejected, including trailing zeroes, without rounding or carrying", () => {
  for (const value of ["0.000000001", "1.123456789", "1.999999995", "1.000000000"]) {
    assert.equal(tokenAmountError(value, 8), "Use at most 8 decimal places.");
    assert.equal(parseTokenAmount(value, 8), null, value);
  }
});

test("changing to a six-decimal destination invalidates an eight-decimal edit", () => {
  assert.equal(tokenAmountError("1.12345678", 8), "");
  assert.equal(tokenAmountError("1.12345678", 6), "Use at most 6 decimal places.");
  assert.equal(parseTokenAmount("1.12345678", 6), null);
  assert.equal(tokenAmountError("1.123456", 6), "");
  // Validation uses the route precision; units still use the source token's decimals.
  assert.equal(parseTokenAmount("1.123456", 18), "1123456000000000000");
});

test("MAX and HALF may explicitly floor computed amounts to the route precision", () => {
  assert.equal(limitDecimals("1.123456789012345678", 8), "1.12345678");
  assert.equal(limitDecimals("0.000000005", 8), "0.00000000");
  assert.equal(limitDecimals("2", 8), "2");
  assert.equal(limitDecimals("2.5", 0), "2.");
  assert.equal(parseTokenAmount(limitDecimals("1.123456789012345678", 6), 6), "1123456");
});
