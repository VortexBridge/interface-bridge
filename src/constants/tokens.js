import { BRIDGE_CHAINS_NAMES } from "./chains";
const CHAIN = import.meta.env.VITE_CHAIN || "TESTNET"

/**
 * ICONS
 */
import ETH from "./../assets/images/tokens/eth.svg"
import KOIN from "./../assets/images/tokens/koin.svg"
import USDT from "./../assets/images/tokens/usdt.svg"

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
          address: "1FaSvLjQJsCJKq5ybmGsMMQs8RQYyVv8ju",
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 8,
          symbol: "wKOIN",
          address: "0x6b176fB1D3c420DBFd3AA51De597f8d2e5752556"
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
          symbol: "wETH",
          address: "13bNUFNYBwPSWxZaq8JVZf2ZCLTjWphyQo"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 18,
          symbol: "ETH",
          address: "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
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
          symbol: "wKOIN",
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
          symbol: "wETH",
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
          symbol: "wUSDT",
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
