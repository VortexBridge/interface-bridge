import React from "react";
import { Provider as ReactProvider } from "react-redux";
import "@rainbow-me/rainbowkit/styles.css"
import { getDefaultWallets, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { sepolia, configureChains, createClient, WagmiConfig } from "wagmi"
import { publicProvider } from "wagmi/providers/public"
import generateStore from "./redux/index";
import AppRouter from "./AppRouter";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import "@fontsource/roboto/900.css";
const store = generateStore();

const { chains, provider } = configureChains(
  [sepolia],
  [publicProvider()]
)

// walletconnect projectId (this is a test id, please replace with real one!)
const projectId = 'c4f79cc821944d9680842e34466bfb';

const { connectors } = getDefaultWallets({
  appName: "Koinos Bridge",
  projectId,
  chains,
})

const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
})

const App = () => (
  <ReactProvider store={store}>
    <WagmiConfig client={wagmiClient}>
      <RainbowKitProvider chains={chains}>
        <AppRouter />
      </RainbowKitProvider>
    </WagmiConfig>
  </ReactProvider>
);

export default App;
