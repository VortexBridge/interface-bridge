import { BRIDGE_CHAINS_NAMES } from "./chains";

export const BRIDGE_TOKENS = [
  {
    id: "koin",
    symbol: "tKOIN",
    name: "Koin",
    icon: "https://raw.githubusercontent.com/koinos/koinos-branding/master/assets/icons/koinos-icon-dark.png",
    networks: [
      {
        chain: BRIDGE_CHAINS_NAMES.KOIN,
        decimals: 8,
        address: "19JntSm8pSNETT9aHTwAUHC5RMoaSmgZPJ"
      },
      {
        chain: BRIDGE_CHAINS_NAMES.ETH,
        decimals: 8,
        address: "0xeA756978B2D8754b0f92CAc325880aa13AF38f88"
      }
    ]
  },
  {
    id: "weth",
    symbol: "wETH",
    name: "Wrapped Ether",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Ethereum-icon-purple.svg/2048px-Ethereum-icon-purple.svg.png",
    networks: [
      {
        chain: BRIDGE_CHAINS_NAMES.KOIN,
        decimals: 8,
        address: "1KazZFUnZSLjeXq2QrifdnYqiBvA7RVF3G"
      },
      {
        chain: BRIDGE_CHAINS_NAMES.ETH,
        decimals: 18,
        address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
      }
    ]
  },
]
