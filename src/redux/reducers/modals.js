import { SET_MODAL, SET_MODAL_DATA } from "../constants"

// Constants
const initialState = {
  modal: null,
  data: null
}

// Reducer
export default function chatReducer(state = initialState, action) {
  switch (action.type) {
  case SET_MODAL:
    return { ...state, modal: action.payload };
  case SET_MODAL_DATA:
    return { ...state, data: action.payload };
  default:
    return state
  }
}
