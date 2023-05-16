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
  KOIN: "koinos",
}

export const BRIDGE_CHAINS = [
  {
    id: BRIDGE_CHAINS_NAMES.KOIN,
    name: "Koinos",
    bridgeAddress: "1KXRDqoGcvysTeoeZ3SePAHUZ99fW3cb2u",
    symbol: "KOIN",
    icon: "img/networks/koin_logo.png",
    explorer: "https://harbinger.koinosblocks.com/tx"
  },
  {
    id: BRIDGE_CHAINS_NAMES.ETH,
    bridgeAddress: "0x3cf2e6F03b126476E6BDb0305fA0C67AfE737D87",
    symbol: "ETH",
    name: "Ethereum",
    icon: "img/networks/eth_logo.png",
    explorer: "https://goerli.etherscan.io/tx"
  }
]