const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"

/**
 * ICONS
 */
import BASE from "./../assets/images/networks/base.svg"
import BNB from "./../assets/images/networks/bnb.svg"
import ETH from "./../assets/images/networks/ethereum.svg"
import KOIN from "./../assets/images/networks/koinos.svg"

/**
 * INFO
 */
export const CHAINS_IDS = {
  MAINNET: "EiBZK_GGVP0H_fXVAM3j6EAuz3-B-l3ejxRSewi7qIBfSA==",
  TESTNET: "EiBncD4pKRIQWco_WRqo5Q-xnXR7JuO3PtZv983mKdKHSQ==",
  UNSUPPORTED: "UNSUPPORTED",
}

export const CHAIN_IDS_TO_NAMES = {
  [CHAINS_IDS.MAINNET]: "Mainnet",
  [CHAINS_IDS.TESTNET]: "Testnet",
  [CHAINS_IDS.UNSUPPORTED]: "UNSUPPORTED",
}

export const BRIDGE_CHAINS_NAMES = {
  ETH: "ethereum",
  SEP: "sepolia",
  BNB: "binance",
  BASE: "base",
  KOIN: "koinos",
}

export const BRIDGE_CHAINS_TYPES = {
  EVM: "evm",
  KOIN: "koinos",
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
      bridgeAddress: "0x2F2f36A88DD5ff8d53Ba2505b2DbC0C153d910Ab",
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
      bridgeAddress: "0xeB6b19A289dF8e5e4A356ff28Dbc2415B0A15214",
      chainId: 3,
      evmChainId: 11155111,
      symbol: "ETH",
      name: "Sepolia",
      icon: ETH,
      explorer: "https://sepolia.etherscan.io/tx"
    },
  ]
}

export const BRIDGE_CHAINS = chains[CHAIN];