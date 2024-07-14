import React from "react";
import AppRouter from "./AppRouter";
import generateStore from "./redux/index";
import { Provider as ReactProvider } from "react-redux";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient, } from "@tanstack/react-query";

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
const config = getDefaultConfig({
  appName: 'Vortex Bridge',
  projectId: projectId,
  ssr: false,
  chains: [sepolia],
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
