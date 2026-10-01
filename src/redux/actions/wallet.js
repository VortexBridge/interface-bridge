import { SET_WALLET, SET_PROVIDER, SET_SIGNER, SET_CONNECTED, SET_SOLANA_WALLET } from "../constants"

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

// the connected Solana wallet: { id, name, address } or null (its provider stays in helpers/solana.mjs)
export const setSolanaWallet = (data) => ({
  type: SET_SOLANA_WALLET,
  payload: data
})

export const setConnected = (data) => ({
  type: SET_CONNECTED,
  payload: data
})