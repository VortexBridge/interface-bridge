import { Contract, Provider, Signer, utils } from "koilib";
import { useContract } from "wagmi";
// bridge
import EthereumBridgeAbi from "./../assets/contracts/Ethereum-Bridge.json";
import KoinosBridgeAbi from "./../assets/contracts/Koinos-Bridge.json";
// variables
const provider = new Provider([ process.env.REACT_APP_RPC ]);
const signer = Signer.fromSeed("demo seed");

export let TokenContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: utils.tokenAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let EthereumBridgeContract = (address, _provider, _signer) => useContract({
  abi: EthereumBridgeAbi,
  id: address,
  provider: _provider ? _provider : null,
  signer: _signer ? _signer : null,
})

export let KoinosBridgeContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosBridgeAbi,
  provider: _provider,
  signer: _signer
})

// export let EthereumBridgeContractRead = (address, _provider, _signer) => useContract({
//   abi: abi,
//   address: address,
//   provider: _provider ? _provider : null,
//   signer: _signer ? _signer : null,
// })