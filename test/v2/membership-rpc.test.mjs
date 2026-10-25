import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { membershipRpc } from "../../src/v2/membership-rpc.mjs";
import { createVortex } from "../../src/v2/vortex-v2.mjs";
import { ethers } from "ethers";

async function server(t, handler) {
  const s = http.createServer(async (req, res) => {
    let body = ""; for await (const b of req) body += b;
    handler(JSON.parse(body), res);
  });
  await new Promise(r => s.listen(0, "127.0.0.1", r));
  t.after(() => { s.closeAllConnections(); s.close(); });
  return `http://127.0.0.1:${s.address().port}`;
}
const reply = (r, value) => r.end(JSON.stringify({ jsonrpc:"2.0",id:1,result:value }));
const word = n => ethers.utils.hexZeroPad(ethers.utils.hexlify(n),32);
const reader = url => ({ connection: { url } });

for (const mode of ["ethereum", "koinos"]) test(`${mode}: deadline aborts an actual stalled HTTP response`, async t => {
  let started, closed;
  const began = new Promise(r => started=r), ended = new Promise(r => closed=r);
  const url = await server(t, (req,res) => {
    if (req.method === "eth_chainId") return reply(res,"0x1");
    if (mode === "koinos") assert.equal(req.method,"chain.read_contract");
    started();res.on("close",closed); // no answer until the real client closes the request
  });
  const rpc = membershipRpc(fetch), ctrl = new AbortController();
  const p = mode === "ethereum" ? rpc.ethCall(reader(url),1,"0x0","0x0",ctrl.signal) : rpc.koinosRead({rpcNodes:[url],currentNodeId:0},{contract_id:"fixture"},ctrl.signal);
  const rejected = assert.rejects(p);
  await began;ctrl.abort();await rejected;
  await Promise.race([ended,new Promise((_,rej)=>setTimeout(()=>rej(Error("HTTP request still alive after abort")),500))]);
});

test("Ethereum fallback retains configured quorum and rejects wrong-chain readers", async t => {
  const urls = [];
  for (const [chain,value] of [[1,3],[1,3],[2,9]]) urls.push(await server(t,(req,res)=>reply(res,req.method==="eth_chainId"?"0x"+chain:word(value))));
  const rpc=membershipRpc(fetch), provider={quorum:2,providerConfigs:urls.map(url=>({provider:reader(url),weight:1}))};
  assert.equal(await rpc.ethCall(provider,1,"0x0","0x0",new AbortController().signal),word(3));
  provider.quorum=3;
  await assert.rejects(rpc.ethCall(provider,1,"0x0","0x0",new AbortController().signal));
});

test("collection count read shares the overall deadline and cancels its real RPC", async t => {
  let closed, started=false;
  const ended=new Promise(r=>closed=r);
  const url=await server(t,(req,res)=>{
    if(req.method==="eth_chainId")return reply(res,"0x1");
    started=true;res.on("close",closed);
  });
  const cfg={koinos:{bridge:"19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK",bridgeChainId:1},eth:{bridge:"0x0000000000000000000000000000000000000001",bridgeChainId:2,networkChainId:1},collectionMode:"collector",deployment:"fixture",collectors:["https://primary.example","https://backup.example"]};
  const vx=createVortex({ethers,cfg,fetch:()=>{throw Error("must not reach a collector without the count");}}),rpc=membershipRpc(fetch);
  const start=Date.now();
  await assert.rejects(vx.collect({direction:"k2e",depositNonce:1n,token:cfg.eth.bridge,recipient:"0x0000000000000000000000000000000000000002",amount8:1n},{expiry:vx.expiryFor("k2e"),operationTimeoutMs:250,timeoutMs:1000,isValidator:async()=>true,getValidatorCount:({signal})=>rpc.ethCall(reader(url),1,cfg.eth.bridge,"0x0",signal)}));
  assert(started);assert(Date.now()-start<800);
  await Promise.race([ended,new Promise((_,rej)=>setTimeout(()=>rej(Error("count RPC not cancelled")),500))]);
});
