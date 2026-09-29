import { get as _get } from "lodash"
import { useAccount, useSwitchChain } from "wagmi"
import { BRIDGE_CHAINS_TYPES } from "../constants/chains"

/**
 * Network the wallet has to be on to sign for a chain of BRIDGE_CHAINS.
 * wagmi knows more than one evm chain, so a connected wallet is not enough:
 * the same address of a contract is another contract (or nothing) on another chain.
 */
export function useEvmNetwork(chain) {
  const account = useAccount()
  const { switchChainAsync } = useSwitchChain()

  const expected = _get(chain, "evmChainId", null)
  const isEvm = _get(chain, "chainType", "") == BRIDGE_CHAINS_TYPES.EVM
  const wrongNetwork = isEvm && expected != null && _get(account, "isConnected", false) && _get(account, "chainId", null) != expected

  const switchNetwork = () => switchChainAsync({ chainId: expected })

  return { expected, wrongNetwork, switchNetwork }
}

// last check before a transaction is signed, the signer tells the network of the wallet at this moment
export async function isSignerOnNetwork(signer, expected) {
  if (expected == null) return true
  if (!signer || !signer.provider) return false
  try {
    // "any" network, the provider of the hook is pinned to the network it was created with
    const chainId = await signer.provider.send("eth_chainId", [])
    return parseInt(chainId, 16) == expected
  } catch (e) {
    return false
  }
}
