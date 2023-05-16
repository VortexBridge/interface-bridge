import { SET_SLIPPAGE, SET_DARKMODE, SET_NETWORK, SET_BRIDGE_DISCLAIMER } from "../constants"

// Actions
export const setSlippage = (slippage) => ({
  type: SET_SLIPPAGE,
  payload: slippage
})
export const setDarkMode = (darkMode) => ({
  type: SET_DARKMODE,
  payload: darkMode
})
export const setNetwork = (chain_id) => ({
  type: SET_NETWORK,
  payload: chain_id
})
export const setBridgeDisclaimer = (value) => ({
  type: SET_BRIDGE_DISCLAIMER,
  payload: value
})