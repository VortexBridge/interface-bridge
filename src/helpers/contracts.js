import { Contract, Provider, Signer, utils } from "koilib";
import { erc20ABI } from "wagmi";
import { getContract } from "@wagmi/core";

// bridge
import EthereumBridgeAbi from "./../assets/contracts/Ethereum-Bridge.json";
import KoinosBridgeAbi from "./../assets/contracts/Koinos-Bridge.json";

// variables
const provider = new Provider([ process.env.REACT_APP_RPC ]);
const signer = Signer.fromSeed("demo seed");

export let EthereumTokenContract = (address, _provider) => getContract({
  address: address,
  abi: erc20ABI,
  signerOrProvider: _provider ? _provider : null
});

export let KoinosTokenContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: utils.tokenAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let EthereumBridgeContract = (address, _provider) => getContract({
  address: address,
  abi: EthereumBridgeAbi.abi,
  signerOrProvider: _provider ? _provider : null
});


export let KoinosBridgeContract = (address, _provider, _signer) => new Contract({
  id: address,
  abi: KoinosBridgeAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer
})

// export let EthereumBridgeContractRead = (address, _provider, _signer) => useContract({
//   abi: abi,
//   address: address,
//   provider: _provider ? _provider : null,
//   signer: _signer ? _signer : null,
// })