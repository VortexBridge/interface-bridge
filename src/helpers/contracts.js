import { Contract, Provider, Signer, utils } from "koilib";
import { ethers } from "ethers";
import { FormatTypes } from "ethers/lib/utils";

// bridge
import KoinosTokenAbi from "./../assets/contracts/Koinos-Token.json";
import KoinosBridgeAbi from "./../assets/contracts/Koinos-Bridge.json";
import EvmTokenAbiBase from "./../assets/contracts/Evm-Token.json";
import EvmBridgeAbiBase from "./../assets/contracts/Evm-Bridge.json";


// abi evm
const EvmTokenAbi = new ethers.utils.Interface(EvmTokenAbiBase)
const EvmBridgeAbi = new ethers.utils.Interface(EvmBridgeAbiBase.abi);

// variables
const provider = new Provider(import.meta.env.KOINOS_RPC);
const signer = Signer.fromSeed("demo seed");

export let EvmTokenContract = (address, signer) => new ethers.Contract(
  address,
  EvmTokenAbi.format(FormatTypes.full),
  signer
)

export let KoinosTokenContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosTokenAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let EvmBridgeContract = (address, signer) => new ethers.Contract(
  address,
  EvmBridgeAbi.format(FormatTypes.full),
  signer
)

export let KoinosBridgeContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosBridgeAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer
})

