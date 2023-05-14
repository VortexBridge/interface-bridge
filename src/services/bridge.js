import { Request as JSONRequest } from "../helpers/request";

class Bridge extends JSONRequest {
  constructor() {
    super({ url: process.env.REACT_APP_NODE_BRIDGE });
  }
  getKoinTx(_tx) {
    return this.getPrepared("/GetKoinosTransaction", { TransactionId: _tx })
  }
  getEthTx(_tx) {
    return this.getPrepared("/GetEthereumTransaction", { TransactionId: _tx })
  }
}

export default Bridge;
