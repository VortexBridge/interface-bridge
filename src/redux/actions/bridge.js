import { SET_BALANCE_FROM, SET_CHAIN_FROM, SET_CHAIN_TO } from "../constants"

// Actions
export const setNetworkFrom = (data) => ({
  type: SET_CHAIN_FROM,
  payload: data
})

export const setNetworkTo = (data) => ({
  type: SET_CHAIN_TO,
  payload: data
})

export const setBalanceFrom = (data) => ({
  type: SET_BALANCE_FROM,
  payload: data
})