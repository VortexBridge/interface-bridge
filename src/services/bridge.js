import { Request as JSONRequest } from "../helpers/request";

class Bridge extends JSONRequest {
  constructor() {
    super({ url: import.meta.env.VITE_NODE_BRIDGE || "https://proxy.vortexbridge.io" });
  }
  getKoinTx(_tx, _opId) {
    return this.getPrepared("/GetKoinosTransaction", { TransactionId: _tx, OpId: _opId })
  }
  getEthTx(_tx) {
    return this.getPrepared("/GetEthereumTransaction", { TransactionId: _tx })
  }
}

export default Bridge;
