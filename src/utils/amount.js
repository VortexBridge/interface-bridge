import { ethers } from "ethers";

// Keep invalid edits visible instead of turning e.g. "-1" into "1" or "1e3" into "13".
export const tokenAmountError = (value, decimals) => {
  const text = String(value);
  const parts = text.split(".");
  if (/[^0-9.]/.test(text) || parts.length > 2) return "Enter an amount using only digits and a decimal point.";
  if ((parts[1] || "").length > decimals) return `Use at most ${decimals} decimal places.`;
  return "";
};

// units of a token as string: "0" for an empty input, null if the value is not a plain number with the decimals of the token
// do not use parseUnits of koilib for an input of the user: it rounds a longer fraction and carries wrong,
// "1.999999995" with 8 decimals gives 1100000000 (11 tokens), and "1e3" or "abc" do not throw
export const parseTokenAmount = (value, decimals) => {
  try {
    let _value = String(value);
    if (_value == "" || _value == ".") return "0";
    if (tokenAmountError(_value, decimals)) return null;
    if (_value.startsWith(".")) _value = "0" + _value;
    return ethers.utils.parseUnits(_value, decimals).toString();
  } catch (e) {
    return null;
  }
}

// cut the fraction of an input to the decimals of the token, the amount on the screen is the amount that is sent
export const limitDecimals = (value, decimals) => {
  let [integer, fraction] = String(value).split(".");
  if (fraction === undefined) return integer;
  return `${integer}.${fraction.substring(0, decimals)}`;
}
