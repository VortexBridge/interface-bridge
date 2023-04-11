import { SET_SLIPPAGE, SET_DARKMODE, SET_NETWORK, SET_MANA_FOUNTAIN } from "../constants"

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
export const setManaFountain = (manafountain) => ({
  type: SET_MANA_FOUNTAIN,
  payload: manafountain
})