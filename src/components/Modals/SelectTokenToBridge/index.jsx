/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { get as _get } from "lodash";
import { Modal, Box, Avatar, List, ListItem, ListItemAvatar, ListItemButton, ListItemText, Typography, useTheme } from "@mui/material";

// Actions
import { setModal, setModalData } from "../../../redux/actions/modals";
import { setTokenToBridge } from "../../../redux/actions/bridge";

// components
import ModalHeader from "../ModalHeader";

// constants
import { BRIDGE_TOKENS } from "../../../constants/tokens";

const ModalSelectTokenToBridge = () => {
  // hooks
  const dispatch = useDispatch();
  const theme = useTheme();

  // vars
  const [tokens, setTokens] = useState(null);

  // selectors
  const currentModal = useSelector((state) => state.modals.modal);
  const bridgeSelector = useSelector(state => state.bridge);

  // state
  const fromChain = _get(bridgeSelector, "from", null);
  const toChain = _get(bridgeSelector, "to", null);

  // actions
  const closeModal = () => {
    dispatch(setModalData(null));
    dispatch(setModal(null));
  };

  useEffect(() => {
    let _tokens = BRIDGE_TOKENS.filter(_token => {
      let _networks = _get(_token, "networks")
      let toNet = _networks.find(n => _get(n, "chain", false) == _get(toChain, 'id', true));
      let fromNet = _networks.find(n => _get(n, "chain", false) == _get(fromChain, 'id', true));
      return !!(toNet && fromNet)
    })
    setTokens(_tokens)

  }, [fromChain, toChain])

  const onSelect = (token) => {
    dispatch(setTokenToBridge(token))
    closeModal()
  }

  const findTokenSymbol = (token, fromChain) => {
    for (let network of token.networks) {
      if (network.chain === fromChain.id) {
        return _get(network, 'symbol', '');
      }
    }
    return '';
  };

  return (
    <Modal
      open={currentModal === "SelectTokenToBridge"}
      onClose={closeModal}
      sx={{ justifyContent: "center", display: "flex", maxHeight: "350px", marginY: "auto" }}
    >
      <Box
        sx={{
          minWidth: "sm",
          maxHeight: "900px",          
          width: "100%",
          maxWidth: "320px",
          marginY: "20px",
          bgcolor: "background.paper",
          borderRadius: "10px",
          overflowY: "auto"
        }}
      >
        <ModalHeader title={"Select Token"} closeFunction={closeModal} />
        <List>
          {
            Array.isArray(tokens) && tokens.length ?
              tokens.map((token, key) => (
                <ListItem sx={{ padding: 0, paddingLeft: 1, paddingRight: 1}} key={key}>
                  <ListItemButton sx={{ padding: 1.7 }} onClick={() => onSelect(token)} divider={tokens.length - 1 !== key}>
                    <ListItemAvatar>
                      <Avatar width="30px" height="30px" alt={_get(token, "name", "")} src={_get(token, "icon", "")} />
                    </ListItemAvatar>
                    <Box sx={{ textAlign: 'left' }}>
                      <ListItemText id={`${key}-symbol`} primary={findTokenSymbol(token, fromChain)} />
                      <ListItemText id={`${key}-name`} secondary={_get(token, "name", "")} />
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))
              : (
                <Box sx={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
                  <Typography>There are no tokens for these networks</Typography>
                </Box>
              )
          }
        </List>
      </Box>
    </Modal>
  );
};

export default ModalSelectTokenToBridge;
