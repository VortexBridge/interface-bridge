import { BRIDGE_CHAINS_NAMES } from "./chains";
const CHAIN = import.meta.env.VITE_CHAIN

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
          address: "15DJN4a8SgrbGhhGksSBASiSYjGnMU8dGL"
        },
        {
          chain: BRIDGE_CHAINS_NAMES.ETH,
          decimals: 8,
          address: "0xDb7a53f3dD59444841066E5d340A765bF62b3014"
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
  ]
}
export const BRIDGE_TOKENS = tokens[CHAIN || "TESTNET"]
