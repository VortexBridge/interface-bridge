import { BRIDGE_CHAINS_NAMES } from "./chains";
const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"

/**
 * ICONS
 */
import ETH from "./../assets/images/tokens/eth.svg"
import KOIN from "./../assets/images/tokens/koin.svg"

/**
 * TOKENS
 */
let tokens = {
  ["MAINNET"]: [
    {
      id: "koin",
      symbol: "KOIN",
      name: "Koin",
      icon: KOIN,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          address: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju",
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 8,
          address: "0x6b176fB1D3c420DBFd3AA51De597f8d2e5752556"
        }
      ]
    },
    {
      id: "ETH",
      symbol: "ETH",
      name: "Ether",
      icon: ETH,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          address: "13bNUFNYBwPSWxZaq8JVZf2ZCLTjWphyQo"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 18,
          address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
        }
      ]
    },
  ],
  ["TESTNET"]: [
    {
      id: "koin",
      symbol: "KOIN",
      name: "Koin",
      icon: KOIN,
      networks: [
        {
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
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
          chain: BRIDGE_CHAINS_NAMES.SEP,
          decimals: 8,
          address: "0x574683432350e63263eB6F563d8A0c945ce47CB3",
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
      symbol: "ETH",
      name: "Ethereum",
      icon: ETH,
      networks: [
        {
          native: false,
          chain: BRIDGE_CHAINS_NAMES.KOIN,
          decimals: 8,
          address: "13bNUFNYBwPSWxZaq8JVZf2ZCLTjWphyQo",
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
          address: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
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
