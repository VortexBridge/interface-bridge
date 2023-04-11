import { TokenContract } from "./../helpers/contracts"

export const loadTokenData = async (address) => {
  const contract = await TokenContract(address)
  if(contract ) {
    let token = {
      decimals: await contract.functions.decimals(),
      name: await contract.functions.name(),
      symbol: await contract.functions.symbol(),
      address: address,
    }
    token.decimals = token.decimals.result.value
    token.name = token.name.result.value
    token.symbol = token.symbol.result.value
    token.logoURI = ""
    return token;
  }
}