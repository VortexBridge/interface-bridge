// Two-step transfers through Ethereum (Base or Solana <-> Ethereum <-> Koinos): which final network a first step was
// sent for, so the Redeem page can offer the second step once the first one is redeemed. Convenience only, kept in
// this browser and never trusted: the second step is an ordinary transfer the user checks and signs again.
const KEY = "vortex-v2-journeys";
const MAX = 50;

const valid = (j) => j && typeof j.tx == "string" && typeof j.via == "string" && typeof j.to == "string" && typeof j.token == "string";

export function listJourneys() {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter(valid) : [];
  } catch (e) {
    return [];
  }
}

// tx = the first step's transaction; via = the middle network (Ethereum); to = the final network; token = token id;
// amount = what the user typed (a suggestion for step 2, the page re-checks it against the balance)
export function rememberJourney({ tx, via, to, token, amount }) {
  try {
    const list = listJourneys().filter((j) => j.tx != tx);
    list.unshift({ tx, via, to, token, amount: String(amount || ""), time: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (e) {
    // private window or blocked storage: step 2 can still be started by hand
  }
}

export function journeyOf(tx) {
  return listJourneys().find((j) => j.tx == tx) || null;
}

export function forgetJourney(tx) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(listJourneys().filter((j) => j.tx != tx)));
  } catch (e) {
    // nothing to do
  }
}
