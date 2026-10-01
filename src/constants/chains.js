const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"
// LAB = the local demo against the private lab chains (lab/demo/up.sh). The addresses come in at build time; a real
// deployment never sets VITE_CHAIN=LAB.
export const LAB_CONFIG = CHAIN == "LAB" ? JSON.parse(import.meta.env.VITE_LAB_CONFIG || "null") : null
// The Koinos node for every read and for preparing wallet transactions: the configured one, else the public node of the
// selected network (one place, so a MAINNET build can never prepare transactions on testnet). LAB sets it explicitly.
export const KOINOS_RPC = import.meta.env.VITE_KOINOS_RPC || (CHAIN == "MAINNET" ? "https://api.koinos.io" : "https://harbinger-api.koinos.io")

/**
 * ICONS
 */
import BASE from "./../assets/images/networks/base.svg"
import BNB from "./../assets/images/networks/bnb.svg"
import ETH from "./../assets/images/networks/ethereum.svg"
import KOIN from "./../assets/images/networks/koinos.svg"
import SOL from "./../assets/images/networks/solana.svg"

/**
 * INFO
 */
export const CHAINS_IDS = {
  MAINNET: "EiBZK_GGVP0H_fXVAM3j6EAuz3-B-l3ejxRSewi7qIBfSA==",
  TESTNET: "EiBncD4pKRIQWco_WRqo5Q-xnXR7JuO3PtZv983mKdKHSQ==",
  ...(LAB_CONFIG ? { LAB: LAB_CONFIG.koinos.chainId } : {}),
  UNSUPPORTED: "UNSUPPORTED",
}

export const CHAIN_IDS_TO_NAMES = {
  [CHAINS_IDS.MAINNET]: "Mainnet",
  [CHAINS_IDS.TESTNET]: "Testnet",
  ...(LAB_CONFIG ? { [LAB_CONFIG.koinos.chainId]: "Lab" } : {}),
  [CHAINS_IDS.UNSUPPORTED]: "UNSUPPORTED",
}

export const BRIDGE_CHAINS_NAMES = {
  ETH: "ethereum",
  SEP: "sepolia",
  BNB: "binance",
  BASE: "base",
  SOL: "solana",
  KOIN: "koinos",
}

export const BRIDGE_CHAINS_TYPES = {
  EVM: "evm",
  KOIN: "koinos",
  SOLANA: "solana",
}

let chains = {
  ["MAINNET"]: [
    {
      id: BRIDGE_CHAINS_NAMES.KOIN,
      name: "Koinos",
      chainId: 1,
      chainType: BRIDGE_CHAINS_TYPES.KOIN,
      bridgeAddress: "1aqHtNRDkiAZeFtuM8fRFuurcje6eHqF8",
      symbol: "KOIN",
      icon: KOIN,
      explorer: "https://koinosblocks.com/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.ETH,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      // the Vortex v2 bridge, set at the cutover (runbook). Until then the Vortex route shows maintenance
      bridgeAddress: "0x0000000000000000000000000000000000000000",
      chainId: 2,
      evmChainId: 1,
      // wormhole token bridge (portal), chainId is the wormhole chain id
      wormhole: {
        chainId: 2,
        tokenBridge: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
      },
      symbol: "ETH",
      name: "Ethereum",
      icon: ETH,
      explorer: "https://etherscan.io/tx"
    },
    {
      // only reachable through wormhole, vortex has no bridge contract here
      id: BRIDGE_CHAINS_NAMES.BASE,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      evmChainId: 8453,
      wormhole: {
        chainId: 30,
        tokenBridge: "0x8d2de8d2f73F1F4cAB472AC9A881C9b123C79627",
      },
      symbol: "ETH",
      name: "Base",
      icon: BASE,
      explorer: "https://basescan.org/tx"
    },
    {
      // only reachable through wormhole, vortex has no bridge contract here. The Solana code is loaded on demand
      // (helpers/solana.mjs); the ids are the programs of wormhole's token bridge and core bridge on Solana
      id: BRIDGE_CHAINS_NAMES.SOL,
      chainType: BRIDGE_CHAINS_TYPES.SOLANA,
      wormhole: {
        chainId: 1,
        tokenBridge: "wormDTUJ6AWPNvk59vGQbDvGJmqbDTdgWgAqcLBCgUb",
        core: "worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth",
      },
      symbol: "SOL",
      name: "Solana",
      icon: SOL,
      explorer: "https://solscan.io/tx"
    }
  ],
  ["TESTNET"]: [
    {
      id: BRIDGE_CHAINS_NAMES.KOIN,
      name: "Koinos",
      chainId: 1,
      chainType: BRIDGE_CHAINS_TYPES.KOIN,
      bridgeAddress: "19hcqMM8fKDvddEdc7QbQYyxxYtbtvzUdR",
      symbol: "KOIN",
      icon: KOIN,
      explorer: "https://harbinger.koinosblocks.com/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.SEP,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      // the Vortex v2 test bridge, set when it is deployed
      bridgeAddress: "0x0000000000000000000000000000000000000000",
      chainId: 3,
      evmChainId: 11155111,
      symbol: "ETH",
      name: "Sepolia",
      icon: ETH,
      explorer: "https://sepolia.etherscan.io/tx"
    },
  ],
  ["LAB"]: LAB_CONFIG ? [
    {
      id: BRIDGE_CHAINS_NAMES.KOIN,
      name: "Koinos (lab)",
      chainId: 1,
      chainType: BRIDGE_CHAINS_TYPES.KOIN,
      bridgeAddress: LAB_CONFIG.koinos.bridge,
      symbol: "KOIN",
      icon: KOIN,
      explorer: ""
    },
    {
      id: BRIDGE_CHAINS_NAMES.ETH,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      bridgeAddress: LAB_CONFIG.eth.bridge,
      chainId: 2,
      evmChainId: 31337,
      symbol: "ETH",
      name: "Ethereum (lab)",
      icon: ETH,
      explorer: ""
    },
  ] : [],
}

export const BRIDGE_CHAINS = chains[CHAIN];