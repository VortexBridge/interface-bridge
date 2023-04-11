import { SET_MODAL, SET_MODAL_DATA } from "../constants"

// Actions
export const setModal = (modal) => ({
  type: SET_MODAL,
  payload: modal
})

// Actions
export const setModalData = (data) => ({
  type: SET_MODAL_DATA,
  payload: data
})
