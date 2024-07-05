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
const config = getDefaultConfig({
  appName: 'Koinos Bridge',
  projectId: 'c4f79cc821944d9680842e34466bfb',
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
