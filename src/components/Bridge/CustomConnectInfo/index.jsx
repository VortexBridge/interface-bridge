import { get as _get } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { setModal } from "../../../redux/actions/modals";
import { Button } from '@mui/material'
import { CHAIN_IDS_TO_NAMES } from "./../../../constants/chains"
// utils
import { shortedAddress } from "./../../../utils/display";

// the purpose of this is to not re-load the rainbowkit connection in re-renders
// the CustomEthConnectButton causes re-rendering issues for this network status/connection because rainbowkit
// this is just used to display the network status and the wallet address, not the connect button

// props: walletAddress, optional actions

const CustomConnectInfo = (props) => {
  // Dispatch to call actions
  const dispatch = useDispatch();

  // selectors
  const bridgeSelector = useSelector(state => state.bridge);
  const settingsSelector = useSelector(state => state.settings);
  // state
  const chain = _get(bridgeSelector, "from", null);
  const networkChain = _get(settingsSelector, "network", null);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", gap: 12 }}>
        <Button
          style={{ display: "flex", alignItems: "center" }}
          type="button"
        >
          {chain !== null ?
            <div
              style={{
                background: chain.icon,
                width: 12,
                height: 12,
                borderRadius: 999,
                overflow: "hidden",
                marginRight: 4,
              }}
            >
              {chain.icon && (
                <img
                  alt={chain.name ?? "Chain icon"}
                  src={chain.icon}
                  style={{ width: 12, height: 12 }}
                />
              )}
            </div>
            : null}
          {CHAIN_IDS_TO_NAMES[networkChain] ? CHAIN_IDS_TO_NAMES[networkChain] : CHAIN_IDS_TO_NAMES["UNSUPPORTED"]}
        </Button>

        <Button type="button" onClick={() => dispatch(setModal("Disconnect"))}>
          {shortedAddress(props.walletAddress)}
        </Button>
      </div>
      {props.actions}
    </div>
  )
}

export default CustomConnectInfo;