import { Request as JSONRequest } from "../helpers/request";

class Tokens extends JSONRequest {
  constructor() {
    super({ url: process.env.REACT_APP_TOKEN_API });
  }
  getMainnet() {
    return this.getPrepared("/mainnet.json", { timestamp: new Date().getTime() })
  }
  getTestnetv4() {
    return this.getPrepared("/testnetv4.json", { timestamp: new Date().getTime() })
  }
}

export default Tokens;
