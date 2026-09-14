// Synthetic read-only RPC for operator UI integration tests. This is NOT an
// EVM node and does not execute contracts. It has no keys or write methods.
const http = require("node:http");
const { utils } = require("ethers");
const selectors = Object.fromEntries(["chainId()", "nonce()", "paused()", "getValidatorsLength()", "validators(uint256)"].map((s) => [utils.id(s).slice(0, 10), s]));
const server = http.createServer((req, res) => {
  if (req.method !== "POST") { res.writeHead(405).end(); return; }
  let body = "";
  req.on("data", (b) => { body += b; if (body.length > 8192) req.destroy(); });
  req.on("end", () => {
    try {
      const { id, method, params } = JSON.parse(body);
      let result;
      if (method === "eth_chainId") result = "0x7a69";
      else if (method === "eth_getBlockByNumber") result = { number: "0x10", hash: "0x" + "a".repeat(64) };
      else if (method === "eth_getCode") result = "0x6000";
      else if (method === "eth_call") {
        const data = params[0].data;
        const selector = selectors[data.slice(0, 10)];
        const value = { "chainId()": 2n, "nonce()": 4n, "paused()": 0n, "getValidatorsLength()": 3n, "validators(uint256)": BigInt("0x" + (data.slice(10) || "0")) + 1n }[selector];
        if (value === undefined) throw new Error("unsupported contract read");
        result = "0x" + value.toString(16).padStart(64, "0");
      } else throw new Error("only fixture read methods allowed");
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id, result }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: "unsupported fixture request" }));
    }
  });
});
server.listen(18545, "127.0.0.1", () => console.log("Synthetic read-only RPC fixture: http://127.0.0.1:18545 (not an EVM node)"));
