import { SET_ASSET_ONE, SET_ASSET_TWO, SET_POSITIONS } from "../constants"

// Actions
export const setAssetOne = (data) => ({
  type: SET_ASSET_ONE,
  payload: data
})

export const setAssetTwo = (data) => ({
  type: SET_ASSET_TWO,
  payload: data
})

export const setPositions = (data) => ({
  type: SET_POSITIONS,
  payload: data
})
