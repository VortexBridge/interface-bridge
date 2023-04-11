import { Contract, Provider, Signer, utils } from "koilib";
import { useContract } from "wagmi";
// contracts
import ProtocolAbi from "./../assets/contracts/core-abi.json";
import GovernanceAbi from "./../assets/contracts/governance-abi.json";
import StakingAbi from "./../assets/contracts/staking-abi.json";
// bridge
import EthereumBridgeAbi from "./../assets/contracts/Ethereum-Bridge.json";
import KoinosBridgeAbi from "./../assets/contracts/Koinos-Bridge.json";
// variables
const provider = new Provider([ process.env.REACT_APP_RPC ]);
const signer = Signer.fromSeed("demo seed");

export let ProtocolContract = (_provider, _signer) => new Contract({
  id: "17TAwcuJ4tHc9TmCbZ24nSMvY9bPxwQq5s",
  abi: ProtocolAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let StakingContract = (_provider, _signer) => new Contract({
  id: "18GFftZCZibxAgtHHUSSwVpzxWa7GYAAVr",
  abi: StakingAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

export let GovernanceContract = (_provider, _signer) => new Contract({
  id: "16UPCAcSqLpMfsaVLxMsDJtmLsGXyc1BRQ",
  abi: GovernanceAbi,
  provider: _provider ? _provider : provider,
  signer: _signer ? _signer : signer,
})

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