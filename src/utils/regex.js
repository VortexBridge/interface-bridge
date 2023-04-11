/* eslint-disable */
export const numberPattern = (value, targetCB) => {
  let validated = String(value)
    .replace(/[^\d.]|(?<=\..*)\./g, "")
    .substring(0, value.length);
  targetCB(validated);
};

export const regexBtcAddress = (value) => {
  const regexPattern = /^(?:[13]{1}[a-km-zA-HJ-NP-Z1-9]{26,33}|bc1[a-z0-9]{39,59})$/g
  return new RegExp(regexPattern).test(value)
}