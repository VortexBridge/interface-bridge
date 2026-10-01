// Solana leg of the Wormhole routes (Solana <-> Ethereum, vKOIN). Loaded only when a Solana route is used
// (`await import("../helpers/solana.mjs")`; the lab imports this same file in Node), so the rest of the site does not carry the Solana libraries.
// Wormhole's own SDK builds every instruction, the wallet (Phantom / Solflare / Backpack) signs, and the Wormhole
// programs on Solana / the token bridge on Ethereum verify the guardians' signatures. Nothing here is trusted for that.
import "./buffer-shim.mjs";
import { Buffer } from "buffer";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { UniversalAddress, deserialize } from "@wormhole-foundation/sdk-definitions";
import { SolanaTokenBridge } from "@wormhole-foundation/sdk-solana-tokenbridge";
import { SolanaWormholeCore } from "@wormhole-foundation/sdk-solana-core";
import { ethers } from "ethers";

// A Solana wallet only signs; reads go to an rpc. The public mainnet rpc refuses browsers, this default accepts them
// (free, no key) but keeps only about a day of transaction history: an older Solana -> Ethereum transfer needs an rpc
// with history (VITE_SOL_RPC) — or any Wormhole redeem page (anyone may redeem; the tokens go to the vaa's recipient).
const SOLANA_RPC = import.meta.env?.VITE_SOL_RPC || "https://solana-rpc.publicnode.com";

let connection = null;
export const getSolanaConnection = () => connection || (connection = new Connection(SOLANA_RPC, "confirmed"));
export const setSolanaRpc = (url) => { connection = new Connection(url, "confirmed"); };

// chain = the Solana entry of BRIDGE_CHAINS
const contracts = (chain) => ({ tokenBridge: chain?.wormhole?.tokenBridge ?? null, coreBridge: chain?.wormhole?.core ?? null });
const tokenBridge = (chain) => new SolanaTokenBridge("Mainnet", "Solana", getSolanaConnection(), contracts(chain));
const coreBridge = (chain) => new SolanaWormholeCore("Mainnet", "Solana", getSolanaConnection(), contracts(chain));

// the address the token bridge publishes its messages from (its "emitter")
export const tokenBridgeEmitter = (chain) =>
  ethers.utils.hexlify(PublicKey.findProgramAddressSync([Buffer.from("emitter")], new PublicKey(contracts(chain).tokenBridge))[0].toBytes());

/**
 * WALLET
 */
// wallets that inject the api of Phantom: connect(), publicKey, signTransaction(), signAllTransactions()
export const getSolanaWallets = () => {
  if (typeof window == "undefined") return [];
  return [
    { id: "phantom", name: "Phantom", provider: window.phantom?.solana ?? null },
    { id: "solflare", name: "Solflare", provider: window.solflare ?? null },
    { id: "backpack", name: "Backpack", provider: window.backpack ?? null },
  ].filter(w => w.provider && typeof w.provider.connect == "function" && typeof w.provider.signTransaction == "function");
};

let wallet = null; // { id, name, provider, address }

export const connectSolanaWallet = async (id) => {
  let found = getSolanaWallets().find(w => w.id == id);
  if (!found) throw new Error("wallet not found");
  let result = await found.provider.connect();
  let publicKey = result?.publicKey || found.provider.publicKey;
  if (!publicKey) throw new Error("the wallet did not share an address");
  wallet = { id, name: found.name, provider: found.provider, address: new PublicKey(publicKey.toString()).toBase58() };
  return { id, name: found.name, address: wallet.address };
};

// the wallet can switch accounts or disconnect on its own: follow it (cb gets { id, name, address } or null)
export const onSolanaWalletChange = (cb) => {
  let w = wallet;
  if (!w || typeof w.provider.on != "function") return () => {};
  let changed = (publicKey) => {
    if (wallet !== w) return;
    if (!publicKey) { wallet = null; cb(null); return; }
    wallet = { ...w, address: new PublicKey(publicKey.toString()).toBase58() };
    w = wallet;
    cb({ id: w.id, name: w.name, address: w.address });
  };
  let gone = () => { if (wallet === w) { wallet = null; cb(null); } };
  w.provider.on("accountChanged", changed);
  w.provider.on("disconnect", gone);
  return () => {
    if (typeof w.provider.removeListener == "function") {
      w.provider.removeListener("accountChanged", changed);
      w.provider.removeListener("disconnect", gone);
    }
  };
};

export const disconnectSolanaWallet = async () => {
  try { if (wallet && typeof wallet.provider.disconnect == "function") await wallet.provider.disconnect(); } catch (e) { /* nothing to do */ }
  wallet = null;
};

// the wallet as connected — and still on the same account (a switch in the extension must not go unnoticed)
const requireWallet = (address) => {
  if (!wallet) throw new Error("connect a Solana wallet first");
  let current = wallet.provider.publicKey ? new PublicKey(wallet.provider.publicKey.toString()).toBase58() : wallet.address;
  if (current != wallet.address || (address && wallet.address != address)) throw new Error("the Solana wallet switched accounts: connect it again");
  return wallet;
};

/**
 * ADDRESSES
 */
// a wallet address (a point on the curve); a token account or program address is refused
export const isSolanaAddress = (address) => {
  try {
    return PublicKey.isOnCurve(new PublicKey(address).toBytes());
  } catch (e) {
    return false;
  }
};

// a Wormhole transfer to Solana goes to the recipient's token account for the mint (the associated token account),
// never to the wallet itself: 32 bytes as hex for transferTokens on Ethereum
export const solanaRecipient32 = (mint, owner) => {
  if (!isSolanaAddress(owner)) throw new Error("recipient is not a Solana wallet address");
  return ethers.utils.hexlify(getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner)).toBytes());
};

export const solanaAddressOf32 = (hex32) => new PublicKey(ethers.utils.arrayify(hex32)).toBase58();

// the recipient of a transfer to Solana must be a WALLET: an address on the curve that is either not on chain yet or a
// plain system account. A program or a token account is on the curve too — tokens sent "to" it (its token account for
// the mint) could never be moved again.
const SYSTEM_PROGRAM = "11111111111111111111111111111111";
export const checkSolanaWallet = async (address) => {
  if (!isSolanaAddress(address)) throw new Error("the recipient is not a Solana wallet address");
  let info = await getSolanaConnection().getAccountInfo(new PublicKey(address));
  if (info && (info.executable || info.owner.toBase58() != SYSTEM_PROGRAM))
    throw new Error("the recipient is a program or a token account, not a wallet — enter the wallet address");
  return true;
};

export const solanaTokenBalance = async (mint, owner) => {
  let account = getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(owner));
  let balance = await getSolanaConnection().getTokenAccountBalance(account).catch(() => null);
  return balance ? String(balance.value?.amount ?? "0") : "0";
};

// a Solana transaction id (base58 signature)
export const isSolanaTxId = (id) => /^[1-9A-HJ-NP-Za-km-z]{80,90}$/.test(String(id));

/**
 * SIGN + SEND
 */
// The wallet signs first (it may add its own instructions), then the one-time accounts the SDK created (a Wormhole
// message / signature set) add their signatures. One wallet prompt for all transactions when the wallet supports it.
const signAndSend = async (unsignedTxs, onPrompt, onSent) => {
  let w = requireWallet();
  let conn = getSolanaConnection();
  let payer = new PublicKey(w.address);
  let { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  let items = unsignedTxs.map(u => ({ tx: u?.transaction?.transaction ?? null, signers: u?.transaction?.signers || [], parallel: !!u?.parallelizable }));
  for (let item of items) {
    if (!item.tx || typeof item.tx.partialSign != "function") throw new Error("unexpected transaction type");
    item.tx.recentBlockhash = blockhash;
    item.tx.feePayer = payer;
  }
  if (onPrompt) onPrompt();
  let signed = typeof w.provider.signAllTransactions == "function"
    ? await w.provider.signAllTransactions(items.map(i => i.tx))
    : await items.reduce(async (acc, i) => [...(await acc), await w.provider.signTransaction(i.tx)], Promise.resolve([]));
  for (let n = 0; n < items.length; n++) if (items[n].signers.length) signed[n].partialSign(...items[n].signers);
  // in order; transactions the SDK marks as independent (the signature checks of a redeem) go out together, so all of
  // them are in well before the shared blockhash expires. A stop midway is safe: a new REDEEM skips finished steps.
  let signatures = [];
  try {
    for (let n = 0; n < items.length;) {
      let group = [n];
      while (items[n].parallel && group.length < 8 && n + group.length < items.length && items[n + group.length].parallel) group.push(n + group.length);
      let sent = [];
      for (let k of group) {
        // the id of a signed transaction is its fee payer's signature: known BEFORE it is sent, so a lost answer from
        // the node can never make it look unsent
        let expected = ethers.utils.base58.encode(signed[k].signature);
        if (onSent) onSent(expected, k);
        let signature = await conn.sendRawTransaction(signed[k].serialize(), { preflightCommitment: "confirmed" });
        if (signature != expected) throw new Error("the node returned another transaction id");
        sent.push(signature);
      }
      for (let signature of sent) {
        let result = await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
        if (result?.value?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(result.value.err)}`);
        signatures.push(signature);
      }
      n += group.length;
    }
  } catch (e) {
    if (/block ?height exceeded|expired|blockhash not found/i.test(String(e?.message || e))) throw new Error("the Solana transactions expired before all were confirmed — press the button again, finished steps are skipped");
    throw e;
  }
  return signatures;
};

/**
 * SOLANA -> ETHEREUM
 */
// burns the wrapped token on Solana and publishes the Wormhole message. Returns { signature, messageAccount }: the
// transaction id and the account the core bridge wrote the message into. onSubmitted(signature) runs as soon as the
// transaction is sent: if its confirmation then fails, the error carries `submitted` — it may still land, so it must
// be looked up (Redeem page), never sent again.
export const sendFromSolana = async ({ chain, mint, amount, recipientEvm, onPrompt, onSubmitted }) => {
  let w = requireWallet();
  if (!ethers.utils.isAddress(recipientEvm) || ethers.utils.getAddress(recipientEvm) == ethers.constants.AddressZero) throw new Error("recipient is not an evm address");
  let to = { chain: "Ethereum", address: new UniversalAddress(ethers.utils.hexZeroPad(ethers.utils.getAddress(recipientEvm), 32), "hex") };
  let unsigned = [];
  for await (let tx of tokenBridge(chain).transfer(new PublicKey(w.address), to, new PublicKey(mint), BigInt(amount))) unsigned.push(tx);
  // the SDK's one extra signer of the transfer is the fresh account the core bridge writes the message into
  let extra = unsigned[unsigned.length - 1]?.transaction?.signers || [];
  if (unsigned.length != 1 || extra.length != 1) throw new Error("unexpected transfer transaction");
  let messageAccount = extra[0].publicKey.toBase58();
  let submitted = null;
  try {
    let signatures = await signAndSend(unsigned, onPrompt, (signature) => { submitted = signature; if (onSubmitted) onSubmitted(signature); });
    return { signature: signatures[signatures.length - 1], messageAccount };
  } catch (e) {
    if (!submitted) throw e;
    let err = new Error(`sent, but not confirmed yet (${String(e?.message || e).slice(0, 80)}) — do NOT send it again: it is under Redeem, "your transfers"`);
    err.submitted = submitted;
    throw err;
  }
};


// the token-bridge messages a Solana transaction published, read from the chain itself (the message accounts):
// [{ sequence, payload }] — the Redeem page requires the signed vaa to carry exactly these bytes
export const solanaTransferMessages = async (chain, txid) => {
  let emitter = tokenBridgeEmitter(chain).toLowerCase();
  let messages = await coreBridge(chain).parseMessages(txid);
  return messages
    .filter(m => ethers.utils.hexlify(m.emitterAddress.toUint8Array()).toLowerCase() == emitter)
    .map(m => ({ sequence: m.sequence.toString(), payload: ethers.utils.hexlify(m.payload), emitter }));
};

/**
 * ETHEREUM -> SOLANA
 */
const transferVaa = (vaaHex) => deserialize("TokenBridge:Transfer", ethers.utils.arrayify(vaaHex));

export const isCompletedOnSolana = async (chain, vaaHex) => !!(await tokenBridge(chain).isTransferCompleted(transferVaa(vaaHex)));

// creates the recipient's token account if needed, posts the signed vaa (the Wormhole program checks the guardians'
// signatures) and completes the transfer. Anyone may redeem; the tokens go to the token account named in the vaa.
// One wallet prompt signs all of them (one blockhash). If they expire before all are confirmed, the redeem resumes once
// by itself with a fresh blockhash: the SDK skips what is done (token account, posted vaa), so only the rest is signed.
export const redeemOnSolana = async ({ chain, vaaHex, onPrompt }) => {
  let w = requireWallet();
  let vaa = transferVaa(vaaHex);
  let bridge = tokenBridge(chain);
  for (let attempt = 1; ; attempt++) {
    if (await bridge.isTransferCompleted(vaa)) return { already: attempt == 1, signature: null };
    let unsigned = [];
    for await (let tx of bridge.redeem(new PublicKey(w.address), vaa)) unsigned.push(tx);
    try {
      let signatures = await signAndSend(unsigned, onPrompt);
      return { already: false, signature: signatures[signatures.length - 1] };
    } catch (e) {
      if (attempt >= 2 || !/expired before all were confirmed/.test(String(e?.message || e))) throw e;
    }
  }
};
