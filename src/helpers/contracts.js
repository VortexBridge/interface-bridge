import { Contract, Provider, Signer, utils } from "koilib";
import { erc20ABI } from "wagmi";
import { getContract } from "@wagmi/core";

// bridge
import KoinosTokenAbi from "./../assets/contracts/Koinos-Token.json";
import KoinosBridgeAbi from "./../assets/contracts/Koinos-Bridge.json";
import EvmTokenAbi from "./../assets/contracts/Evm-Token.json";
import EvmBridgeAbi from "./../assets/contracts/Evm-Bridge.json";

// variables
const provider = new Provider(import.meta.env.KOINOS_RPC);
const signer = Signer.fromSeed("demo seed");

export let EvmTokenContract = (address, _provider) => getContract({
  address: address,
  abi: EvmTokenAbi,
  signerOrProvider: _provider ? _provider : null
});

export let KoinosTokenContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosTokenAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let EvmBridgeContract = (address, _provider) => getContract({
  address: address,
  abi: EvmBridgeAbi.abi,
  signerOrProvider: _provider ? _provider : null
});


export let KoinosBridgeContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosBridgeAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer
})

