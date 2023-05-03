/* eslint-disable */
import { get as _get } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { setModal } from "../../../redux/actions/modals";
import { Button } from '@mui/material'
import { CHAIN_IDS_TO_NAMES } from "./../../../constants/chains"
// utils
import { shortedAddress } from "./../../../utils/display";

const CustomKoinConnectButton = () => {
  // Dispatch to call actions
  const dispatch = useDispatch();

  // selectors
  const walletSelector = useSelector(state => state.wallet);
  const bridgeSelector = useSelector(state => state.bridge);
  const settingsSelector = useSelector(state => state.settings);
  // state
  const fromChain = _get(bridgeSelector, "from", null);
  const networkChain = _get(settingsSelector, "network", null);

  if(!_get(walletSelector, "wallet", null)) {
    return (
      <Button variant="contained" sx={{ boxShadow: "0", width: "100%", borderRadius: "10px" }} onClick={() => dispatch(setModal("Connect"))}>
        Connect
      </Button>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", gap: 12 }}>
        <Button
          style={{ display: "flex", alignItems: "center" }}
          type="button"
        >
          {fromChain !== null ?
            <div
              style={{
                background: fromChain.icon,
                width: 12,
                height: 12,
                borderRadius: 999,
                overflow: "hidden",
                marginRight: 4,
              }}
            >
              {fromChain.icon && (
                <img
                  alt={fromChain.name ?? "Chain icon"}
                  src={fromChain.icon}
                  style={{ width: 12, height: 12 }}
                />
              )}
            </div>
            : null}
          { CHAIN_IDS_TO_NAMES[networkChain] ? CHAIN_IDS_TO_NAMES[networkChain] : CHAIN_IDS_TO_NAMES["UNSUPPORTED"] }
        </Button>

        <Button type="button" onClick={() => dispatch(setModal("Connect"))}>
          {shortedAddress(_get(walletSelector, "wallet[0].address", ""))}
        </Button>
      </div>
    </div>
  )
}

export default CustomKoinConnectButton;