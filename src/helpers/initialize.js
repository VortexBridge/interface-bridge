import { get as _get } from "lodash";
import { CHAINS_IDS } from "./../constants/chains"
import { CONFIG_BASE } from "./../constants/configs"

// contracts
import { ProtocolContract } from "./contracts";

// helpers
import LS from "./storage";

// request
import TokensService from "./../services/tokens";

export const InitializeTokens = async (chain_id) => {
  let result = {
    loading: false,
    base_tokens: [],
    custom_tokens: []
  }
  if(chain_id == "UNSUPPORTED") {
    return result;
  }
  try {
    let tokensService = new TokensService();

    let tokensResult = {};
    switch (chain_id) {
    case CHAINS_IDS.MAINNET:
      tokensResult = await tokensService.getMainnet()  
      break;
    case CHAINS_IDS.TESTNET:
      tokensResult = await tokensService.getTestnetv4()  
      break;
    default:
      break;
    }

    let tokensFinal = _get(tokensResult, "tokens", []);

    let custom_tokens = JSON.parse(LS.getItemDevice("custom_tokens"));
    let _custom_tokens = [];
    if(custom_tokens) {
      // remove duplicate tokens from storage if added to token list;
      for (let index = 0; index < custom_tokens.length; index++) {
        const _token = custom_tokens[index];
        let tokenExist = tokensFinal.find(t => t.address == _token.address);
        if(!tokenExist) {
          _custom_tokens.push(_token);
        }
      }
      if(custom_tokens.length != _custom_tokens.length) {
        LS.custom_tokens(_custom_tokens);
      }
  
    }
    result = {
      loading: false,
      base_tokens: tokensFinal,
      custom_tokens: _custom_tokens
    }
  } catch (error) {
    console.log(error)
  }
  return result;
}

export const InitializeSwaps = async (chain_id) => {
  let result = {
    loading: false,
    timing: Date.now(),
    configs: {
      discounts: [],
      feeOn: false,
      feeTo: ""
    },
    send: null,
    received: null
  }
  if(chain_id == "UNSUPPORTED") {
    return result;
  }

  let ContractProtocol = ProtocolContract();
  let functions = ContractProtocol.functions;
  try {
    let _configs = await functions.get_configs();
    let _results = _get(_configs, "result.value", {});
    let _discounts = _get(_results, "discounts", []).map(d => ({ feeDiscount: _get(d, "feeDiscount", 800), tokenAmount: _get(d, "tokenAmount", "0") }))

    // result
    let send = CONFIG_BASE[chain_id].tokens.send;
    let received = CONFIG_BASE[chain_id].tokens.received;
    result = {
      loading: false,
      timing: Date.now(),
      configs: {
        discounts: _discounts,
        feeOn: _get(_results, "feeOn", false),
        feeTo: _get(_results, "feeTo", "")
      },
      send: send,
      received: received
    }
  } catch (error) {
    console.log(error)
  }
  return result;
}