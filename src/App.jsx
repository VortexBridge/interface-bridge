import React from "react";
import AppRouter from "./AppRouter";
import generateStore from "./redux/index";
import { Provider as ReactProvider } from "react-redux";
import { RainbowKitProvider, connectorsForWallets } from "@rainbow-me/rainbowkit";
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, base, sepolia, hardhat } from 'wagmi/chains';
import { QueryClientProvider, QueryClient, } from "@tanstack/react-query";
import {
  injectedWallet,
  rainbowWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

// css
import "@rainbow-me/rainbowkit/styles.css"
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";

// configs
const store = generateStore();
let testnet = import.meta.env.VITE_CHAIN || "TESTNET";
if(testnet == "TESTNET") testnet = "true";
const projectId = (testnet == "true") ? '55003640cab75f712d7a880ec2798cb9' : 'c64ca949713c7b3ef89702e71583fb97';
const connectors = testnet == "LAB" ? connectorsForWallets(
  [{ groupName: "Lab demo", wallets: [injectedWallet] }],
  { appName: "Vortex Bridge (lab)", projectId: "lab-demo-no-walletconnect" },
) : connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [injectedWallet, rainbowWallet, metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  { appName: "Vortex Bridge", projectId },
);
// only the evm networks of BRIDGE_CHAINS, a wallet on any other network must stay unsupported
const config = createConfig(testnet == "LAB" ? {
  // the local demo (lab/demo/up.sh): the lab's Ethereum node (chain id 31337) behind the demo gateway
  chains: [hardhat],
  transports: { [hardhat.id]: http(import.meta.env.VITE_ETH_RPC) },
  connectors,
  ssr: false,
} : testnet == "true" ? {
  chains: [sepolia],
  transports: {
    // not VITE_ETH_RPC, it is a mainnet node. Without a url viem uses the public rpc of the chain
    [sepolia.id]: http(import.meta.env.VITE_SEP_RPC || undefined),
  },
  connectors,
  ssr: false,
} : {
  chains: [mainnet, base],
  transports: {
    [mainnet.id]: http(import.meta.env.VITE_ETH_RPC || "https://eth.drpc.org"),
    [base.id]: http(import.meta.env.VITE_BASE_RPC || "https://mainnet.base.org"),
  },
  connectors,
  ssr: false,
});
const queryClient = new QueryClient();

const App = () => (
  <ReactProvider store={store}>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <AppRouter />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </ReactProvider>
);

export default App;
