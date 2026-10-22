// Vortex bridge v2 for this site: the flows (flows.mjs) with the bridges of the selected network and the validators.
import { ethers } from "ethers";
import * as koilib from "koilib";
import KoinosBridgeAbi from "../assets/contracts/Koinos-Bridge-v2.json";
import KoinosTokenAbi from "../assets/contracts/Koinos-Token.json";
import { BRIDGE_CHAINS, BRIDGE_CHAINS_TYPES, KOINOS_RPC } from "../constants/chains";
import { collectionConfig } from "./collection-config.mjs";
import { createFlows } from "./flows.mjs";
import { createJsonReader } from "./json-reader.mjs";

export { KIND } from "./flows.mjs";

export const VORTEX_KOINOS = BRIDGE_CHAINS.find((c) => c.chainType == BRIDGE_CHAINS_TYPES.KOIN) || null;
export const VORTEX_EVM = BRIDGE_CHAINS.find((c) => c.chainType == BRIDGE_CHAINS_TYPES.EVM && c.bridgeAddress) || null;

export const collection = collectionConfig(import.meta.env);

const configured = !!(VORTEX_KOINOS && VORTEX_EVM && collection.ready && ethers.utils.isAddress(VORTEX_EVM.bridgeAddress)
  && VORTEX_EVM.bridgeAddress != ethers.constants.AddressZero);

// null while the bridge is not set up for this network: the pages then show the Vortex route as under maintenance
export const vortex = configured ? createFlows({
  ethers, koilib, fetch: (...args) => fetch(...args), koinosBridgeAbi: KoinosBridgeAbi, koinosTokenAbi: KoinosTokenAbi,
  cfg: {
    koinos: { bridge: VORTEX_KOINOS.bridgeAddress, bridgeChainId: VORTEX_KOINOS.chainId },
    eth: { bridge: VORTEX_EVM.bridgeAddress, networkChainId: VORTEX_EVM.evmChainId, bridgeChainId: VORTEX_EVM.chainId },
    ...collection.cfg,
  },
}) : null;

// Koinos reads need no wallet
export const koinosReader = createJsonReader(koilib.Provider, KOINOS_RPC);
