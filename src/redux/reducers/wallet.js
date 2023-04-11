import { SET_WALLET, SET_PROVIDER, SET_SIGNER, SET_CONNECTED } from "../constants"


// Constants
const initialState = {
  wallet: null,
  provider: null,
  signer: null,
  connected: false
}

// Reducer
export default function chatReducer(state = initialState, action) {
  switch (action.type) {
  case SET_WALLET:
    return { ...state, wallet: action.payload };
  case SET_PROVIDER:
    return { ...state, provider: action.payload };
  case SET_SIGNER:
    return { ...state, signer: action.payload };
  case SET_CONNECTED:
    return { ...state, connected: action.payload };
  default:
    return state
  }
}
