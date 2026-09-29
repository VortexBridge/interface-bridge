import { ethers } from "ethers";

// wormhole token bridge (portal), only the functions the ui needs
const TokenBridgeAbi = [
  "function transferTokens(address token, uint256 amount, uint16 recipientChain, bytes32 recipient, uint256 arbiterFee, uint32 nonce) payable returns (uint64 sequence)",
  "function completeTransfer(bytes encodedVm)",
  "function isTransferCompleted(bytes32 hash) view returns (bool)",
  "function wormhole() view returns (address)",
]

// wormhole core, the token bridge publishes its messages here
const CoreAbi = [
  "function messageFee() view returns (uint256)",
  "event LogMessagePublished(address indexed sender, uint64 sequence, uint32 nonce, bytes payload, uint8 consistencyLevel)",
]
const CoreInterface = new ethers.utils.Interface(CoreAbi)

// signed messages (vaa) of the guardians, a public api. It is not trusted: the token bridge verifies the signatures
const WORMHOLE_API = import.meta.env?.VITE_WORMHOLE_API || "https://api.wormholescan.io"

export let WormholeTokenBridgeContract = (address, signer) => new ethers.Contract(
  address,
  TokenBridgeAbi,
  signer
)

export let WormholeCoreContract = (address, provider) => new ethers.Contract(
  address,
  CoreAbi,
  provider
)

// wormhole addresses are 32 bytes, an evm address is left padded with zeros
// throws if it is not an evm address, the tokens of a transfer to a wrong recipient are lost
export const toWormholeAddress = (address) => {
  if (!ethers.utils.isAddress(address)) throw new Error("recipient is not an evm address");
  let _address = ethers.utils.getAddress(address);
  if (_address == ethers.constants.AddressZero) throw new Error("recipient is the zero address");
  return ethers.utils.hexZeroPad(_address, 32);
}

// explorer of wormhole, it shows the state of a transfer by the hash of its source transaction
export const wormholescanTx = (hash) => `https://wormholescan.io/#/tx/${encodeURIComponent(String(hash))}?network=Mainnet`

// the nonce only groups messages of one transaction, any uint32 works
export const wormholeNonce = () => Math.floor(Math.random() * 0xffffffff)

// message the token bridge published in a transaction: { sequence, payload }, null if there is none
// the log must come from the core contract and its sender must be the token bridge, any contract can emit a look-alike
export const getWormholeMessage = (receipt, coreAddress, tokenBridgeAddress) => {
  let topic = CoreInterface.getEventTopic("LogMessagePublished");
  for (let log of (receipt?.logs || [])) {
    if (log.address.toLowerCase() != coreAddress.toLowerCase()) continue;
    if (log.topics[0] != topic) continue;
    let event = CoreInterface.parseLog(log);
    if (event.args.sender.toLowerCase() != tokenBridgeAddress.toLowerCase()) continue;
    return { sequence: event.args.sequence.toString(), payload: ethers.utils.hexlify(event.args.payload) };
  }
  return null;
}

// signed vaa as hex, null while the guardians did not sign yet (they wait for the finality of the from chain)
export const fetchSignedVaa = async (wormholeChainId, emitterAddress, sequence) => {
  let emitter = ethers.utils.hexZeroPad(ethers.utils.getAddress(emitterAddress), 32).substring(2).toLowerCase();
  let response = await fetch(`${WORMHOLE_API}/v1/signed_vaa/${wormholeChainId}/${emitter}/${sequence}`);
  if (response.status == 404) return null;
  if (!response.ok) throw new Error(`wormhole api ${response.status}`);
  let data = await response.json();
  // only a 404 means "not signed yet", an answer without a vaa is an error of the api
  if (!data || typeof data.vaaBytes != "string" || data.vaaBytes == "") throw new Error("wormhole api: no vaa in the answer");
  return ethers.utils.hexlify(ethers.utils.base64.decode(data.vaaBytes));
}

// token transfer of a vaa. header: version(1) guardianSet(4) signatures(1 + 66 each), then the body the guardians sign
// body: timestamp(4) nonce(4) emitterChain(2) emitterAddress(32) sequence(8) consistency(1) payload
// payload 1: id(1) amount(32) tokenAddress(32) tokenChain(2) to(32) toChain(2) fee(32)
// throws for anything that is not a plain token transfer (payload 1, exactly 133 bytes), a transfer with payload (3) is longer
export const parseTransferVaa = (vaa) => {
  let bytes = ethers.utils.arrayify(vaa);
  if (bytes.length < 6 || bytes[0] != 1) throw new Error("unknown vaa version");
  let signatures = bytes[5];
  if (signatures == 0) throw new Error("vaa without signatures");
  let body = bytes.slice(6 + 66 * signatures);
  if (body.length != 51 + 133) throw new Error("vaa is not a plain token transfer");
  let payload = body.slice(51);
  if (payload[0] != 1) throw new Error("vaa is not a plain token transfer");
  let uint = (data) => ethers.BigNumber.from(data);
  return {
    // the token bridge marks a transfer as completed with this hash
    hash: ethers.utils.keccak256(ethers.utils.keccak256(body)),
    signatures,
    // the bytes the token bridge published, the same bytes are in the log of the source transaction
    payload: ethers.utils.hexlify(payload),
    emitterChain: uint(body.slice(8, 10)).toNumber(),
    emitterAddress: ethers.utils.hexlify(body.slice(10, 42)),
    sequence: uint(body.slice(42, 50)).toString(),
    payloadType: payload[0],
    // wormhole sends amounts with 8 decimals at most
    amount: uint(payload.slice(1, 33)).toString(),
    tokenAddress: ethers.utils.hexlify(payload.slice(33, 65)),
    tokenChain: uint(payload.slice(65, 67)).toNumber(),
    to: ethers.utils.hexlify(payload.slice(67, 99)),
    toChain: uint(payload.slice(99, 101)).toNumber(),
    fee: uint(payload.slice(101, 133)).toString(),
  }
}

// evm address of a 32 bytes wormhole address, null if the first 12 bytes are not zero (it is not an evm address)
export const fromWormholeAddress = (address) => {
  if (!/^0x0{24}[0-9a-fA-F]{40}$/.test(address)) return null;
  return ethers.utils.getAddress("0x" + address.substring(26));
}
