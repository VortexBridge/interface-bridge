import { BRIDGE_CHAINS_NAMES } from "./chains";
const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"

/**
 * ICONS
 */
import ETH from "./../assets/images/tokens/eth.svg"
import KOIN from "./../assets/images/tokens/koin.svg"
import USDT from "./../assets/images/tokens/usdt.svg"
import USDC from "./../assets/images/tokens/usdc.svg"

/**
 * TOKENS
 */
let tokens = {
  ["MAINNET"]: [
    {
      id: "koin",
      name: "Koinos",
      icon: KOIN,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          symbol: "KOIN",
          allowance: true,
          native: false,
          address: "19GYjDBVXU7keLbYvMLazsGQn3GTWHjHkK",
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 8,
          symbol: "vKOIN",
          allowance: true,
          native: false,
          address: "0xa50ad3a559A10f384a5bB2e27516f63E0B937b1A"
        }
      ]
    },
    {
      id: "ETH",
      name: "Ethereum",
      icon: ETH,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          symbol: "vETH",
          allowance: true,
          native: false,
          address: "1Tf1QKv3gVYLjq34yURSHw5ErTYbFjqTG"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 18,
          symbol: "ETH",
          allowance: true,
          native: true,
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
        }
      ]
    },
    {
      id: "USDT",
      name: "Tether",
      icon: USDT,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          symbol: "vUSDT",
          allowance: true,
          native: false,
          address: "12VoHz41a4HtfiyhTWbg9RXqGMRbYk6pXh"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 18,
          symbol: "USDT",
          allowance: true,
          native: true,
          address: "0xdac17f958d2ee523a2206206994597c13d831ec7"
        }
      ]
    },
    {
      id: "USDC",
      name: "USD Coin",
      icon: USDC,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          symbol: "vUSDC",
          allowance: true,
          native: false,
          address: "1N8iYrYEJdCVK1rhbqv3qZUzHcpoeKmFnj"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 18,
          symbol: "USDC",
          allowance: true,
          native: false,
          address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
        }
      ]
    },
  ],
  ["TESTNET"]: [
    {
      id: "koin",
      name: "Koinos",
      icon: KOIN,
      networks: [
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          symbol: "KOIN",
          allowance: false,
          address: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.SEP}`,
            //   name: "Vortex",
            //   description: "Relayer to koin deployed by vortex",
            //   address: "x",
            //   payment: "0"
            // }
          ]
        },
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.SEP,
          decimals: 8,
          symbol: "vKOIN",
          allowance: true,
          address: "0x7A348BD7461593C66CB6876BDE70B96CC8393605",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.KOIN}`,
            //   name: "Vortex",
            //   description: "Relayer to sepolia deployed by vortex",
            //   address: "x",
            //   payment: "500000000"
            // }
          ]
        }
      ]
    },
    {
      id: "ethereum",
      name: "Ethereum",
      icon: ETH,
      networks: [
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          allowance: true,
          symbol: "vETH",
          address: "14Ha3UZnrjyXE5F9mvEfS28QhaNY1ehWXw",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.SEP}`,
            //   name: "Vortex",
            //   description: "Relayer to koin deployed by vortex",
            //   address: "x",
            //   payment: "0"
            // }
          ]
        },
        {
          native: true,
          chain: BRIDGE_CHAINS_NAMES.SEP,
          decimals: 8,
          allowance: false,
          symbol: "ETH",
          address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.KOIN}`,
            //   name: "Vortex",
            //   description: "Relayer to sepolia deployed by vortex",
            //   address: "x",
            //   payment: "500000000"
            // }
          ]
        }
      ]
    },
    {
      id: "usdt",
      name: "Tether",
      icon: USDT,
      networks: [
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          allowance: true,
          symbol: "vUSDT",
          address: "19DDFiZuf66XhxVBveZ2CPbMpb8wyiA6ja",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.SEP}`,
            //   name: "Vortex",
            //   description: "Relayer to koin deployed by vortex",
            //   address: "x",
            //   payment: "0"
            // }
          ]
        },
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.SEP,
          decimals: 6,
          allowance: true,
          symbol: "USDT",
          address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
          relayers: [
            // {
            //   id: `vortex-${BRIDGE_CHAINS_NAMES.KOIN}`,
            //   name: "Vortex",
            //   description: "Relayer to sepolia deployed by vortex",
            //   address: "x",
            //   payment: "500000000"
            // }
          ]
        }
      ]
    }
  ]
}
export const BRIDGE_TOKENS = tokens[CHAIN || "TESTNET"]
