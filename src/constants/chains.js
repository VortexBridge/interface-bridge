const CHAIN = import.meta.env.VITE_CHAIN

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
  TESTNET: "EiAAKqFi-puoXnuJTdn7qBGGJa8yd-dcS2P0ciODe4wupQ==",
  UNSUPPORTED: "UNSUPPORTED",
}

export const CHAIN_IDS_TO_NAMES = {
  [CHAINS_IDS.MAINNET]: "Mainnet",
  [CHAINS_IDS.TESTNET]: "Testnet",
  [CHAINS_IDS.UNSUPPORTED]: "UNSUPPORTED",
}

export const BRIDGE_CHAINS_NAMES = {
  ETH: "ethereum",
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
      bridgeAddress: "1KXRDqoGcvysTeoeZ3SePAHUZ99fW3cb2u",
      symbol: "KOIN",
      icon: KOIN,
      explorer: "https://harbinger.koinosblocks.com/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.BNB,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      bridgeAddress: "0x3cf2e6F03b126476E6BDb0305fA0C67AfE737D87",
      chainId: 2,
      symbol: "BSC",
      name: "Binance",
      icon: BNB,
      explorer: "https://goerli.etherscan.io/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.ETH,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      bridgeAddress: "0x3cf2e6F03b126476E6BDb0305fA0C67AfE737D87",
      chainId: 3,
      symbol: "ETH",
      name: "Ethereum",
      icon: ETH,
      explorer: "https://goerli.etherscan.io/tx"
    }
  ],
  ["TESTNET"]: [
    {
      id: BRIDGE_CHAINS_NAMES.KOIN,
      name: "Koinos",
      chainId: 1,
      chainType: BRIDGE_CHAINS_TYPES.KOIN,
      bridgeAddress: "1KXRDqoGcvysTeoeZ3SePAHUZ99fW3cb2u",
      symbol: "KOIN",
      icon: KOIN,
      explorer: "https://harbinger.koinosblocks.com/tx"
    },
    {
      id: BRIDGE_CHAINS_NAMES.BNB,
      chainType: BRIDGE_CHAINS_TYPES.EVM,
      bridgeAddress: "0x3cf2e6F03b126476E6BDb0305fA0C67AfE737D87",
      chainId: 2,
      symbol: "BSC",
      name: "Binance",
      icon: BNB,
      explorer: "https://testnet.bscscan.com/tx"
    }
  ]
}

export const BRIDGE_CHAINS = chains[CHAIN];