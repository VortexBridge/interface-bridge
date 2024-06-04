import { CHAINS_IDS } from "./chains";

export const CONFIG_BASE =  {
  [CHAINS_IDS.MAINNET]: {
    contracts: {
      core: {
        address: "",
        launched: false
      },
      governance: {
        address: "",
        launched: false
      },
      staking: {
        address: "",
        launched: false
      },
      mana: {
        address: "",
        launched: false
      }
    },
    tokens: {
      send: {
        "name": "Koin",
        "symbol": "koin",
        "description": "Native token of Koinos.",
        "decimals": "8",
        "logoURI": "https://raw.githubusercontent.com/koinos/koinos-branding/master/assets/icons/koinos-icon-dark.png",
        "address": "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL",
        "token_website": "https://koinos.io",
        "coingecko_id": "",
        "coinmarketcap_id": ""
      },
      received: null
    }
  },
  [CHAINS_IDS.TESTNET]: {
    contracts: {
      core: {
        address: "17TAwcuJ4tHc9TmCbZ24nSMvY9bPxwQq5s",
        launched: true
      },
      governance: {
        address: "16UPCAcSqLpMfsaVLxMsDJtmLsGXyc1BRQ",
        launched: true
      },
      staking: {
        address: "18GFftZCZibxAgtHHUSSwVpzxWa7GYAAVr",
        launched: true
      },
      mana: {
        address: "1Es7uAWs72yE4Joeaur2QMuicaHdd5XFDG",
        launched: true
      }
    },
    tokens: {
      send: {
        "name": "tKoin",
        "symbol": "TKOIN",
        "description": "Native token of Koinos.",
        "decimals": "8",
        "logoURI": "https://raw.githubusercontent.com/koinos/koinos-branding/master/assets/icons/koinos-icon-dark.png",
        "address": "19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ",
        "token_website": "https://koinos.io",
        "coingecko_id": "",
        "coinmarketcap_id": ""
      },
      received: {
        "name": "Vortex",
        "symbol": "KNDX",
        "description": "The governance token of Vortex.",
        "decimals": "8",
        "logoURI": "https://avatars.githubusercontent.com/u/100445299?s=200&v=4",
        "address": "18HHisnBQDQ5GJTdaR2h6QPTY42RmZwCS",
        "token_website": "http://vortexbridge.io",
        "coingecko_id": "",
        "coinmarketcap_id": ""
      }
    }
  }
}
