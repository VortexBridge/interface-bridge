import { get as _get } from "lodash";
import { BRIDGE_CHAINS_NAMES } from "./chains";

/**
 * ROUTES
 * vortex: koinos <-> evm, validators of vortex sign the transfer
 * wormhole: evm <-> evm through the wormhole token bridge (portal), guardians sign the transfer
 */
export const BRIDGE_ROUTES_TYPES = {
  VORTEX: "vortex",
  WORMHOLE: "wormhole",
}

// direct routes, every route works in both directions
const routes = [
  { type: BRIDGE_ROUTES_TYPES.VORTEX, chains: [BRIDGE_CHAINS_NAMES.KOIN, BRIDGE_CHAINS_NAMES.ETH] },
  { type: BRIDGE_ROUTES_TYPES.VORTEX, chains: [BRIDGE_CHAINS_NAMES.KOIN, BRIDGE_CHAINS_NAMES.SEP] },
  { type: BRIDGE_ROUTES_TYPES.WORMHOLE, chains: [BRIDGE_CHAINS_NAMES.ETH, BRIDGE_CHAINS_NAMES.BASE] },
]

// route type between two chains, null if there is no direct route
export const getBridgeRoute = (fromChain, toChain) => {
  let from = _get(fromChain, "id", null);
  let to = _get(toChain, "id", null);
  if (!from || !to || from == to) return null;
  let route = routes.find(r => r.chains.includes(from) && r.chains.includes(to));
  return route ? route.type : null;
}

// contract that moves the tokens on a chain, it is also the spender to approve
export const getBridgeContract = (route, chain) => {
  if (route == BRIDGE_ROUTES_TYPES.VORTEX) return _get(chain, "bridgeAddress", null);
  if (route == BRIDGE_ROUTES_TYPES.WORMHOLE) return _get(chain, "wormhole.tokenBridge", null);
  return null;
}
