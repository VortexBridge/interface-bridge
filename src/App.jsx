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


let testsepl = sepolia;
testsepl.rpcUrls.default.http[0] = "https://rpc.sepolia.dev"
testsepl.rpcUrls.public.http[0] = "https://rpc.sepolia.dev"

const { chains, provider } = configureChains(
  [testsepl],
  [publicProvider()]
)

const { connectors } = getDefaultWallets({
  appName: "Koinos Bridge",
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
