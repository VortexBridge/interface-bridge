import { get as _get } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
// components mui
import { Avatar, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Modal } from "@mui/material";
// Actions
import { setNetworkFrom, setNetworkTo } from "../../../redux/actions/bridge";
import { setModal, setModalData } from "../../../redux/actions/modals";
import { BRIDGE_CHAINS } from "../../../constants/chains.js"


// components
import ModalHeader from "../ModalHeader";

const ModalSelectBridgeNetwork = () => {
  // hooks
  const dispatch = useDispatch();
  // selectors
  const currentModal = useSelector((state) => state.modals.modal);
  const currentModalData = useSelector((state) => state.modals.data);
  const bridgeSelector = useSelector(state => state.bridge);
  const fromNetwork = _get(bridgeSelector, "from", null);
  const toNetwork = _get(bridgeSelector, "to", null);

  const onSelect = (network) => {

    const side = _get(currentModalData, "side", "")
    if (side == "from") {
      if(_get(network, "name", null) == _get(toNetwork, "name", null)) {
        dispatch(setNetworkTo(fromNetwork))
      }
      dispatch(setNetworkFrom(network))
    }
    if (side == "to") {
      if(_get(network, "name", null) == _get(fromNetwork, "name", null)) {
        dispatch(setNetworkFrom(toNetwork))
      }
      dispatch(setNetworkTo(network))
    }
    closeModal()
  }

  const closeModal = () => {
    dispatch(setModalData(null));
    dispatch(setModal(null));
  };

  return (
    <Modal open={currentModal === "SelectBridgeNetwork" && _get(currentModalData, "side", "") != ""} onClose={closeModal} sx={{ justifyContent: "center", display: "flex", alignItems: "center" }}>
      <List sx={{ minWidth: "sm", maxHeight: "900px", width: "100%", maxWidth: "420px", marginY: "20px", bgcolor: "background.paper", borderRadius: "10px", overflowY: "auto" }}>
        <ModalHeader title={_get(currentModalData, "side", "")} closeFunction={closeModal} />
        {BRIDGE_CHAINS.map((network, key) => (
          <ListItem sx={{ padding: 0 }} key={key}>
            <ListItemButton onClick={() => onSelect(network)} divider={network.length - 1 !== key}>
              <ListItemText id={key} primary={_get(network, "name", "")} />
              <ListItemAvatar>
                <Avatar width="30px" height="30px" alt={_get(network, "name", "")} src={_get(network, "icon", "")} />
              </ListItemAvatar>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Modal>
  );
};

export default ModalSelectBridgeNetwork;
