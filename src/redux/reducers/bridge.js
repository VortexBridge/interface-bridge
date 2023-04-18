import { SET_CHAIN_FROM, SET_CHAIN_TO, SET_BALANCE_FROM, SET_TOKEN_TO_BRIDGE } from "../constants"


// Constants
const initialState = {
  loading: false,
  timing: Date.now(),
  from: null,
  to: null,
  balance: 0,
  token: null
}

// Reducer
export default function chatReducer(state = initialState, action) {
  switch (action.type) {
  case SET_CHAIN_FROM:
    return { ...state, from: action.payload };
  case SET_CHAIN_TO:
    return { ...state, to: action.payload };
  case SET_BALANCE_FROM:
    return { ...state, balance: action.payload };
  case SET_TOKEN_TO_BRIDGE:
    return { ...state, token: action.payload };
  default:
    return state
  }
}
