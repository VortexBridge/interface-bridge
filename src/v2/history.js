// "My transfers": the transfers sent from this browser, so an unclaimed one is easy to find again (issue #55).
// Convenience only: kept in this browser, never trusted; the status of each transfer is always read from the chains.
const KEY = "vortex-v2-transfers";
const MAX = 50;

export function listTransfers() {
  try {
    const list = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? list.filter((t) => t && typeof t.tx == "string" && typeof t.from == "string" && typeof t.to == "string") : [];
  } catch (e) {
    return [];
  }
}

export function rememberTransfer({ tx, from, to }) {
  try {
    const list = listTransfers().filter((t) => t.tx != tx);
    list.unshift({ tx, from, to, time: Date.now() });
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (e) {
    // private window or blocked storage: the transaction id is still shown on the page
  }
}
