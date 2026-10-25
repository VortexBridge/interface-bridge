import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import { ethers } from "ethers";
import * as koilib from "koilib";
import { createFlows, ETH_BRIDGE_ABI } from "../../src/v2/flows.mjs";
import { createVortex } from "../../src/v2/vortex-v2.mjs";
const abi=JSON.parse(fs.readFileSync(new URL("../../src/assets/contracts/Koinos-Bridge-v2.json",import.meta.url)));
const U=ethers.utils;
const wallets=Array.from({length:8},(_,i)=>new ethers.Wallet(U.hexZeroPad(U.hexlify(i+1),32)));
const kAddress=w=>{const b=U.concat(["0x00",U.ripemd160(U.sha256(U.computePublicKey(w.publicKey,true)))]);return U.base58.encode(U.concat([b,U.hexDataSlice(U.sha256(U.sha256(b)),0,4)]));};
const cfg={koinos:{bridge:kAddress(wallets[5]),bridgeChainId:1},eth:{bridge:wallets[5].address,networkChainId:1,bridgeChainId:2},collectionMode:"collector",deployment:"fixture",collectors:["https://primary.example","https://backup.example"]};

for(const direction of ["k2e","e2k"])for(const stall of [false,true,"count"])test(`${direction}: actual flows read current membership${stall==="count"?" and cancel a stalled count read":stall?" and abort stalled RPCs":" and combine verified backup signatures"}`,async t=>{
 const native=createVortex({ethers,cfg}),ei=new U.Interface(ETH_BRIDGE_ABI),kc=new koilib.Contract({id:cfg.koinos.bridge,abi});
 let countReads=0,memberReads=0,closed=0,collectors=0;
 const s=http.createServer(async(req,res)=>{
  let raw="";for await(const b of req)raw+=b;const rpc=JSON.parse(raw);
  const reply=result=>res.end(JSON.stringify({jsonrpc:"2.0",id:rpc.id,result}));
  try{
   if(rpc.method==="eth_chainId")return reply("0x1");
   if(direction==="k2e"){
    assert.equal(rpc.method,"eth_call");assert.equal(rpc.params[0].to.toLowerCase(),cfg.eth.bridge.toLowerCase());
    const call=ei.parseTransaction({data:rpc.params[0].data});
    if(call.name==="validatorsLength"){countReads++;if(stall==="count"){res.on("close",()=>closed++);return;}return reply(ei.encodeFunctionResult(call.name,[5]));}
    assert.equal(call.name,"isValidator");memberReads++;
    if(stall){res.on("close",()=>closed++);return;}
    return reply(ei.encodeFunctionResult(call.name,[wallets.slice(0,5).some(w=>w.address===call.args[0])]));
   }
   assert.equal(rpc.method,"chain.read_contract");
   const call=await kc.decodeOperation({call_contract:rpc.params});
   let result;
   if(call.name==="get_metadata"){countReads++;if(stall==="count"){res.on("close",()=>closed++);return;}result={nbValidators:5};}
   else{assert.equal(call.name,"get_validators");assert.equal(call.args.limit,1);memberReads++;
    if(stall){res.on("close",()=>closed++);return;}
    result={addresses:wallets.slice(0,5).some(w=>kAddress(w)===call.args.start)?[call.args.start]:[]};}
   return reply({result:koilib.utils.encodeBase64url(await kc.serializer.serialize(result,abi.methods[call.name].return))});
  }catch(e){res.statusCode=500;res.end();throw e;}
 });
 await new Promise(r=>s.listen(0,"127.0.0.1",r));t.after(()=>{s.closeAllConnections();s.close();});
 const url=`http://127.0.0.1:${s.address().port}`;
 const ep=new ethers.providers.JsonRpcProvider(url,1),kp=new koilib.Provider([url]);await ep.ready;
 const claim={direction,depositNonce:1n,token:direction==="k2e"?wallets[6].address:kAddress(wallets[6]),recipient:direction==="k2e"?wallets[7].address:kAddress(wallets[7]),amount8:100000000n};
 const fetchFn=(url,options)=>{
  if(!url.startsWith("https://"))return fetch(url,options);
  collectors++;const expiry=BigInt(new URL(url).searchParams.get("expiry"));
  const c={...claim,expiry},digest=direction==="k2e"?native.ethClaimDigest(c):native.koinosClaimDigest(c);
  const candidates=(collectors===1?[0,1]:[1,2,3]).map((n,i)=>{
   const sig=wallets[n]._signingKey().signDigest(digest);
   return {validatorId:"slot-"+i,signature:direction==="k2e"?U.joinSignature(sig):U.base64.encode(U.concat([new Uint8Array([31+sig.recoveryParam]),sig.r,sig.s])).replace(/\+/g,"-").replace(/\//g,"_")};
  });
  return Promise.resolve(new Response(JSON.stringify({version:1,deployment:cfg.deployment,direction,depositNonce:"1",expiry:String(expiry),responses:candidates,unavailable:[]})));
 };
 const flows=createFlows({ethers,koilib,fetch:fetchFn,cfg,koinosBridgeAbi:abi,rpcTimeoutMs:stall?400:2000});
 if(stall==="count"){
  await assert.rejects(flows.collect({ethProvider:ep,koinosProvider:kp},claim));
  const end=Date.now()+700;while(closed!==1&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert.equal(countReads,1);assert.equal(collectors,0);assert.equal(memberReads,0);assert.equal(closed,1);return;
 }
 const got=await flows.collect({ethProvider:ep,koinosProvider:kp},claim);
 assert.equal(countReads,1);assert(memberReads>=2);
 if(stall){assert(!got.enough);assert.equal(got.outcome,"timeout");
  const end=Date.now()+700;while(closed<memberReads&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
  assert.equal(closed,memberReads,"all actual stalled membership connections must close");
 }else{assert(got.enough);assert(got.usedBackup);assert.equal(got.signatures.length,4);assert.equal(collectors,2);assert.equal(memberReads,4);}
});
