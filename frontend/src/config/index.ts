import { http, createConfig } from "wagmi";
import { sepolia, arbitrumSepolia } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

const WALLET_CONNECT_PROJECT_ID = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || "";

export const wagmiConfig = createConfig({
  chains: [sepolia, arbitrumSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: WALLET_CONNECT_PROJECT_ID }),
  ],
  transports: {
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
});

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export const REFRESH_INTERVAL = 10000;

export const ZEC_PRICE_USD = 50;
