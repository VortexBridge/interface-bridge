export const CHAINS_IDS = {
  MAINNET: "EiBZK_GGVP0H_fXVAM3j6EAuz3-B-l3ejxRSewi7qIBfSA==",
  TESTNET: "EiAAKqFi-puoXnuJTdn7qBGGJa8yd-dcS2P0ciODe4wupQ==",
  UNSUPPORTED: "UNSUPPORTED",
}

export const CHAIN_IDS_TO_NAMES = {
  [CHAINS_IDS.MAINNET]: "Koinos Mainnet",
  [CHAINS_IDS.TESTNET]: "Koinos Testnet",
}

export const CHAIN_INFO = {
  [CHAINS_IDS.MAINNET]: {
    docs: "",
    explorer: "",
    label: "",
    logoUrl: "",
    currency: {
      name: "Koin",
      symbol: "KOIN",
      decimals: 8,
    }
  },
  [CHAINS_IDS.TESTNET]: {
    docs: "",
    explorer: "",
    label: "",
    logoUrl: "",
    currency: {
      name: "tKoin",
      symbol: "TKOIN",
      decimals: 8,
    }
  },
}

export const BRIDGE_CHAINS = [
  {
    id: "koinos",
    name: "Koinos",
    bridgeAddress: "17XHjr7n2E4auykiHkfJMLGGovvaCadtQS",
    symbol: "KOIN",
    icon: "img/networks/koinos-icon-dark.png"
  },
  {
    id: "ethereum",
    bridgeAddress: "0x47940D3089Da6DC306678109c834718AEF23A201",
    symbol: "ETH",
    icon: "img/networks/eth-logo.png",
    name: "Ethereum"
  }
]

export const BRIDGE_ASSETS = {
  [CHAINS_IDS.TESTNET]: {
    "koin": {
      id: "koin",
      symbol: "tKOIN",
      name: "Koin",
      koinosDecimals: 8,
      ethDecimals: 8,
      ethereumAddress: "0xeA756978B2D8754b0f92CAc325880aa13AF38f88",
      koinosAddress: "19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ"
    },
    "weth": {
      id: "weth",
      symbol: "wETH",
      name: "Wrapped Ether",
      ethDecimals: 18,
      koinosDecimals: 8,
      ethereumAddress: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
      koinosAddress: "1KazZFUnZSLjeXq2QrifdnYqiBvA7RVF3G"
    }
  }, [CHAINS_IDS.MAINNET]: {
    "koin": {
      id: "koin",
      symbol: "tKOIN",
      name: "Koin",
      koinosDecimals: 8,
      ethDecimals: 8,
      ethereumAddress: "",
      koinosAddress: "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL"
    },
    "weth": {
      id: "weth",
      symbol: "wETH",
      name: "Wrapped Ether",
      ethDecimals: 18,
      koinosDecimals: 8,
      ethereumAddress: "",
      koinosAddress: ""
    }
  }

}