import { awaitTimeout } from "./timers"

export const waitTransation =  async (provider, transaction) => {
  let tx = await provider.getTransactionsById([ transaction.id ])
  if(!Object.keys(tx).length) {
    await awaitTimeout(100)
    return waitTransation(provider, transaction)
  }
  return tx
}