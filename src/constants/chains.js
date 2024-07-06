const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"

/**
 * ICONS
 */
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
      bridgeAddress: "1Fp3iNkmGKMPVdTpC7i3rttBBXVi7CDoX7",
      symbol: "KOIN",
      icon: KOIN,
      explorer: "https://koinosblocks.com/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.ETH,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      bridgeAddress: "0x3cf2e6F03b126476E6BDb0305fA0C67AfE737D87",
      chainId: 3,
      symbol: "ETH",
      name: "Ethereum",
      icon: ETH,
      explorer: "https://etherscan.io/tx"
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
      bridgeAddress: "0x57DDB84022fa635bf7534DBC2e05F73DE865d89B",
      chainId: 2,
      symbol: "ETH",
      name: "Sepolia",
      icon: ETH,
      explorer: "https://sepolia.etherscan.io/tx"
    },
  ]
}

export const BRIDGE_CHAINS = chains[CHAIN];