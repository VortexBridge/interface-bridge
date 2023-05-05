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
    bridgeAddress: "17XHjr7n2E4auykiHkfJMLGGovvaCadtQS",
    symbol: "KOIN",
    icon: "img/networks/koinos-icon-dark.png"
  },
  {
    id: BRIDGE_CHAINS_NAMES.ETH,
    bridgeAddress: "0x47940D3089Da6DC306678109c834718AEF23A201",
    symbol: "ETH",
    name: "Ethereum",
    icon: "img/networks/eth-logo.png",
  }
]