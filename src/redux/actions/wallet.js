import { SET_WALLET, SET_PROVIDER, SET_SIGNER, SET_CONNECTED } from "../constants"

// Actions
export const setWallet = (data) => ({
  type: SET_WALLET,
  payload: data
})

export const setProvider = (data) => ({
  type: SET_PROVIDER,
  payload: data
})

export const setSigner = (data) => ({
  type: SET_SIGNER,
  payload: data
})

export const setConnected = (data) => ({
  type: SET_CONNECTED,
  payload: data
})