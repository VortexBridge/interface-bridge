import { Request as JSONRequest } from "../helpers/request";

class Bridge extends JSONRequest {
  constructor() {
    super({ url: import.meta.env.VITE_NODE_BRIDGE || "https://proxy.vortexbridge.io" });
  }
  getKoinTx(_tx) {
    return this.getPrepared("/GetKoinosTransaction", { TransactionId: _tx })
  }
  getEthTx(_tx) {
    return this.getPrepared("/GetEthereumTransaction", { TransactionId: _tx })
  }
}

export default Bridge;
