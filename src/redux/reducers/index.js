import { combineReducers } from "redux";
// reducers
import modals from "./modals";
import wallet from "./wallet";
import settings from "./settings";
import bridge from "./bridge"

export default combineReducers({
  modals: modals,
  wallet: wallet,  
  settings: settings,
  bridge: bridge
});
