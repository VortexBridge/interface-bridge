// Vortex bridge v2: the website's deposit, claim and status flows as plain functions (no React), so the lab runs
// exactly this code against the lab chains.
//
// What is signed and paid always comes from the chains: the user's OWN deposit (read from the block it is in), the
// partner token registered on the bridge, and the CURRENT validator set. The validator servers only return
// signatures, and every signature is checked in the browser before it is used (vortex-v2.mjs).
import { createVortex } from "./vortex-v2.mjs";

export const ETH_BRIDGE_ABI = [
  "function deposit(address token, uint256 amount, bytes25 recipient)",
  "function depositETH(bytes25 recipient) payable",
  "function claim((uint32 sourceChain, bytes32 sourceBridge, uint64 depositNonce, address token, address recipient, uint256 amount8, uint64 expiry) c, bytes[] signatures)",
  "function consumed(bytes32) view returns (bool)",
  "function isValidator(address) view returns (bool)",
  "function validatorsLength() view returns (uint256)",
  "function paused() view returns (bool)",
  "function weth() view returns (address)",
  "function tokens(address) view returns (uint8 kind, uint8 decimals, bool enabled, bytes25 koinosToken)",
  "function maxDeposit8(address) view returns (uint128)",
  "event Deposit(uint64 indexed nonce, address indexed token, address indexed from, bytes25 recipient, uint256 amount8, uint32 toChain)",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
];
export const KIND = { NONE: 0, LOCKED: 1, WRAPPED: 2 };

// cfg: { koinos: { bridge, bridgeChainId }, eth: { bridge, networkChainId, bridgeChainId }, validators: [urls] }
// koinosBridgeAbi / koinosTokenAbi: koilib ABIs (entry_point / read_only form)
// rpcTimeoutMs: every chain read gives up after this (a hanging node must never freeze the page; the page asks again)
export function createFlows({ ethers, koilib, fetch, cfg, koinosBridgeAbi, koinosTokenAbi, rpcTimeoutMs = 20000 }) {
  const vx = createVortex({ ethers, fetch, cfg });
  const U = ethers.utils;
  const eIface = new U.Interface(ETH_BRIDGE_ABI);
  const DEPOSIT_TOPIC = eIface.getEventTopic("Deposit");
  const kBridge = (provider, signer) => new koilib.Contract({ id: cfg.koinos.bridge, abi: koinosBridgeAbi, provider, signer });
  const eBridge = (runner) => new ethers.Contract(cfg.eth.bridge, ETH_BRIDGE_ABI, runner);
  const kRead = async (provider, method, args = {}) => (await kBridge(provider).functions[method](args)).result || {};
  const retryable = (m) => new Error(m);                                  // the page asks again later
  const permanent = (m) => Object.assign(new Error(m), { permanent: true });   // another try does not help
  const bounded = (fn) => (...args) => { let t;
    return Promise.race([fn(...args), new Promise((_, rej) => { t = setTimeout(() => rej(retryable("the node did not answer in time")), rpcTimeoutMs); })])
      .finally(() => clearTimeout(t)); };

  // ------------------------------------------------------------------ bridge state (read from the chains)
  async function ethTokenInfo(provider, token) {
    const b = eBridge(provider);
    const [t, max8, paused] = await Promise.all([b.tokens(token), b.maxDeposit8(token), b.paused()]);
    return { kind: t.kind, decimals: t.decimals, enabled: t.enabled, paused, maxDeposit8: max8.toBigInt(),
      partner: t.kind !== KIND.NONE ? U.base58.encode(t.koinosToken) : null };
  }
  async function koinosTokenInfo(provider, token) {
    const [t, p] = await Promise.all([kRead(provider, "get_token", { token }), kRead(provider, "is_paused")]);
    return { kind: t.kind || KIND.NONE, remoteDecimals: t.remoteDecimals || 0, enabled: !!t.enabled, paused: !!p.value,
      maxDeposit8: BigInt(t.maxDeposit8 || 0), partner: t.remoteToken ? U.getAddress(t.remoteToken) : null };
  }
  // (Koinos: a successful call with an empty result IS "false" — proto3 leaves out default values; errors throw)
  async function paused({ ethProvider, koinosProvider }) {
    const [e, k] = await Promise.all([eBridge(ethProvider).paused(), kRead(koinosProvider, "is_paused")]);
    if (typeof e !== "boolean") throw retryable("bridge state not readable");
    return { eth: e, koinos: k.value === true };
  }
  // the same rules as the contracts, checked before the wallet is asked
  function checkDeposit(info, amount8) {
    if (info.paused) throw new Error("the bridge is paused, please try again later");
    if (info.kind === KIND.NONE || !info.enabled) throw new Error("this token can not be bridged right now");
    if (amount8 > info.maxDeposit8) throw new Error(`the most per transfer is ${U.formatUnits(info.maxDeposit8.toString(), 8)}`);
  }

  // ------------------------------------------------------------------ deposits
  // Every check of the contracts, BEFORE the wallet is asked. The site runs it before an approval too.
  async function checkKoinosDeposit({ provider, token, amount8, recipient }) {
    const info = await koinosTokenInfo(provider, token);
    checkDeposit(info, BigInt(amount8));
    vx.fromAmount8(amount8, info.remoteDecimals);                       // must be payable exactly on Ethereum
    return vx.ethRecipient(recipient).toLowerCase();
  }
  // `beforeSend` (optional, all three sends): awaited as the LAST step before the wallet is asked — the site re-reads
  // both bridges' pause flags there, so nothing slow sits between that check and the wallet prompt.
  // Koinos -> Ethereum: ONE transaction = approve(bridge, exact amount) + deposit. Returns the transaction id.
  async function depositFromKoinos(args) {
    const { provider, signer, from, token, amount8 } = args;
    const to = await bounded(checkKoinosDeposit)(args);
    const tok = new koilib.Contract({ id: token, abi: koinosTokenAbi, provider, signer });
    const { operation: approve } = await tok.functions.approve({ owner: from, spender: cfg.koinos.bridge, value: amount8.toString() }, { onlyOperation: true });
    const { operation: deposit } = await kBridge(provider, signer).functions.deposit({ from, token, amount: amount8.toString(), recipient: to }, { onlyOperation: true });
    const tx = new koilib.Transaction({ provider, signer });
    await tx.pushOperation(approve);
    await tx.pushOperation(deposit);
    if (args.beforeSend) await args.beforeSend();
    await tx.send();
    return tx.transaction.id;
  }
  // Ethereum -> Koinos. `simulate`: also run the deposit as a call (only once the approval is in place)
  async function checkEthDeposit({ signer, token, amount, recipient, native = false, pageDecimals }, simulate = false) {
    const b = eBridge(signer);
    const t = native ? await b.weth() : token;
    const info = await ethTokenInfo(signer.provider, t);
    // the page parsed the typed amount with ITS token list's decimals; the bridge counts with the registered
    // ones — if they differ, the user would send 10^k times what they typed
    if (pageDecimals !== undefined && Number(pageDecimals) !== Number(info.decimals))
      throw new Error(`the page uses ${pageDecimals} decimals for this token, the bridge ${info.decimals} — refusing`);
    checkDeposit(info, vx.toAmount8(amount, info.decimals));            // exact in 8 decimals or refused
    const to = U.hexlify(vx.koinosRecipient(recipient));
    if (simulate && native) await b.callStatic.depositETH(to, { value: amount.toString() });
    if (simulate && !native) await b.callStatic.deposit(token, amount.toString(), to);
    return { to, info };
  }
  // is an approval needed? (wrapped tokens are burned by the bridge and native ETH is sent along: never)
  async function ethApprovalNeeded(provider, owner, token, amount) {
    const info = await ethTokenInfo(provider, token);
    if (info.kind === KIND.WRAPPED) return false;
    const allowance = await new ethers.Contract(token, ERC20_ABI, provider).allowance(owner, cfg.eth.bridge);
    return !allowance.eq(amount.toString());   // anything but EXACTLY the amount (a bigger leftover too) is replaced
  }
  // approve EXACTLY the amount, never unlimited, and only for a deposit that passes every check. Any other non-zero
  // leftover allowance (smaller OR bigger) is set to 0 first (USDT refuses to change one non-zero allowance into
  // another). Returns the last tx.
  async function ethApprove(args) {
    await bounded(checkEthDeposit)(args);
    const t = new ethers.Contract(args.token, ERC20_ABI, args.signer);
    const left = await bounded(async () => t.allowance(await args.signer.getAddress(), cfg.eth.bridge))();
    if (!left.isZero() && !left.eq(args.amount.toString())) {
      if (args.beforeSend) await args.beforeSend();
      await (await t.approve(cfg.eth.bridge, 0)).wait();
    }
    if (args.beforeSend) await args.beforeSend();
    return t.approve(cfg.eth.bridge, args.amount.toString());
  }
  // deposit (native ETH goes to the bridge's WETH). Simulated first: a deposit that would revert is never sent
  async function depositFromEth(args) {
    const { to } = await bounded(checkEthDeposit)(args, true);
    const b = eBridge(args.signer);
    if (args.beforeSend) await args.beforeSend();
    if (args.native) return b.depositETH(to, { value: args.amount.toString() });
    return b.deposit(args.token, args.amount.toString(), to);
  }

  // ------------------------------------------------------------------ the claim, from the user's own deposit
  // Koinos: the receipt of the transaction in the block that is on the main chain. null = not in a block (yet).
  // (A pending receipt, e.g. the one send() returns, can carry another deposit number: never used.)
  async function koinosReceipt(provider, txId) {
    if (!/^0x1220[0-9a-f]{64}$/.test(txId)) throw permanent("this is not a Koinos transaction id");
    const t = await provider.call("transaction_store.get_transactions_by_id", { transaction_ids: [txId] });
    const item0 = t && t.transactions && t.transactions[0];
    if (!item0) return null;
    if (!item0.transaction || item0.transaction.id !== txId) throw retryable("the node answered for another transaction");
    const head = await provider.call("chain.get_head_info", {});
    for (const id of item0.containing_blocks || []) {
      const item = ((await provider.call("block_store.get_blocks_by_id", { block_ids: [id], return_block: false, return_receipt: true })).block_items || [])[0];
      if (!item || item.block_id !== id || !item.receipt || item.receipt.id !== id || String(item.receipt.height) !== String(item.block_height)) continue;
      const main = ((await provider.call("block_store.get_blocks_by_height", { head_block_id: head.head_topology.id,
        ancestor_start_height: item.block_height, num_blocks: 1, return_block: false, return_receipt: false })).block_items || [])[0];
      if (!main || main.block_id !== id) continue;                       // block of a fork
      const r = (item.receipt.transaction_receipts || []).find((x) => x.id === txId);
      if (r) return r;
    }
    return null;
  }
  async function koinosDepositEvents(provider, txId) {
    const r = await koinosReceipt(provider, txId);
    if (r === null) return null;
    if (r.reverted) throw permanent("the transaction failed, nothing was sent");
    return (r.events || []).filter((e) => e.source === cfg.koinos.bridge && e.name === "bridge.deposit_event").map((e) => e.data);
  }
  // after send(): wait until the transaction is in a main-chain block and did not revert (bounded)
  async function waitKoinosTx(provider, txId, timeoutMs = 180000) {
    const t0 = Date.now();
    for (;;) {
      let r = null;
      try { r = await bounded(koinosReceipt)(provider, txId); } catch (e) { if (e.permanent) throw e; }
      if (r) { if (r.reverted) throw permanent("the transaction failed"); return r; }
      if (Date.now() - t0 > timeoutMs) throw retryable("the transaction is not confirmed yet, check it again in a few minutes");
      await new Promise((res) => setTimeout(res, 3000));
    }
  }
  // all deposits of a transaction (usually one), in order. null = not in a block yet
  async function claimsFromKoinosTx(provider, txId) {
    const events = await koinosDepositEvents(provider, txId);
    if (events === null) return null;
    if (events.length === 0) throw permanent("there is no bridge deposit in this transaction");
    const claims = [];
    for (const data of events) {
      const info = await koinosTokenInfo(provider, vx.readKoinosDeposit(data).token);
      if (!info.partner) throw permanent("the token of this deposit is not registered");
      claims.push(vx.claimFromKoinosDeposit(data, info.partner));
    }
    return claims;
  }
  // Ethereum: the receipt must be in the block the node has at that height (not an orphan). null = ask again later
  async function claimsFromEthTx(provider, txHash) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw permanent("this is not an Ethereum transaction hash");
    const r = await provider.getTransactionReceipt(txHash);
    if (!r || r.transactionHash.toLowerCase() !== txHash.toLowerCase()) return null;
    const block = await provider.getBlock(r.blockNumber);
    if (!block || block.hash !== r.blockHash) return null;
    if (r.status !== 1) throw permanent("the transaction failed, nothing was sent");
    const logs = r.logs.filter((l) => U.getAddress(l.address) === U.getAddress(cfg.eth.bridge) && l.topics[0] === DEPOSIT_TOPIC);
    if (logs.length === 0) throw permanent("there is no bridge deposit in this transaction");
    const claims = [];
    for (const log of logs) {
      const info = await ethTokenInfo(provider, eIface.parseLog(log).args.token);
      if (!info.partner) throw permanent("the token of this deposit is not registered");
      claims.push(vx.claimFromEthDeposit(log, info.partner));
    }
    return claims;
  }

  // ------------------------------------------------------------------ signatures (verified) + the claim call
  async function collectForEth(provider, claim) {
    const b = eBridge(provider);
    const quorum = vx.quorumFor((await bounded(() => b.validatorsLength())()).toNumber());
    return vx.collect(claim, { expiry: vx.expiryFor(claim.direction), quorum, isValidator: (a) => b.isValidator(a) });
  }
  async function collectForKoinos(provider, claim) {
    const n = (await bounded(kRead)(provider, "get_metadata")).nbValidators || 0;
    const isValidator = async (a) => { const r = await kRead(provider, "get_validators", { start: a, limit: 1 });
      return !!(r.addresses && r.addresses[0] === a); };
    return vx.collect(claim, { expiry: vx.expiryFor(claim.direction), quorum: vx.quorumFor(n), isValidator });
  }
  const collect = (providers, claim) => claim.direction === "k2e" ? collectForEth(providers.ethProvider, claim) : collectForKoinos(providers.koinosProvider, claim);

  // anyone may submit a claim, the tokens always go to the recipient of the deposit
  async function claimOnEth(signer, got) {
    const args = vx.ethClaimArgs(got.claim, got.signatures);
    const b = eBridge(signer);
    await bounded(() => b.callStatic.claim(...args))();                 // a claim that would revert is never sent
    return b.claim(...args);
  }
  async function claimOnKoinos(provider, signer, got) {
    const { operation } = await kBridge(provider, signer).functions.claim(vx.koinosClaimArgs(got.claim, got.signatures), { onlyOperation: true });
    const tx = new koilib.Transaction({ provider, signer });
    await tx.pushOperation(operation);
    await tx.send();
    return tx.transaction.id;
  }

  // ------------------------------------------------------------------ status: paid already?
  async function isClaimed(providers, claim) {
    if (claim.direction === "k2e") return eBridge(providers.ethProvider).consumed(vx.ethDepositId(claim.depositNonce));
    return !!(await kRead(providers.koinosProvider, "is_consumed", { depositId: vx.koinosDepositId(claim.depositNonce) })).value;
  }

  // reads are bounded; transactions are not (a wallet prompt may take as long as the user needs)
  return { vx, ethTokenInfo: bounded(ethTokenInfo), koinosTokenInfo: bounded(koinosTokenInfo), paused: bounded(paused),
    checkKoinosDeposit: bounded(checkKoinosDeposit), depositFromKoinos, checkEthDeposit: bounded(checkEthDeposit),
    ethApprovalNeeded: bounded(ethApprovalNeeded), ethApprove, depositFromEth, waitKoinosTx,
    claimsFromKoinosTx: bounded(claimsFromKoinosTx), claimsFromEthTx: bounded(claimsFromEthTx), collect,
    claimOnEth, claimOnKoinos, isClaimed: bounded(isClaimed) };
}
