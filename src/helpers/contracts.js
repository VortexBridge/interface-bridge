import { Contract } from "koilib";
import { ethers } from "ethers";
import { FormatTypes } from "ethers/lib/utils";

// tokens (the bridge contracts are in src/v2)
import KoinosTokenAbi from "./../assets/contracts/Koinos-Token.json";
import EvmTokenAbiBase from "./../assets/contracts/Evm-Token.json";


// abi evm
const EvmTokenAbi = new ethers.utils.Interface(EvmTokenAbiBase)

export let EvmTokenContract = (address, signer) => new ethers.Contract(
  address,
  EvmTokenAbi.format(FormatTypes.full),
  signer
)

// reads need no signer; a transaction is only signed by the wallet of the user (no built-in key)
export let KoinosTokenContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosTokenAbi,
  provider: _provider,
  signer: _signer,
})
