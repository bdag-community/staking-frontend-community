import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient } from "@tanstack/react-query";
import { defineChain, http } from "viem";
import { ENV } from "./env";
import { CONTRACT_READ_TIMEOUT_MS } from "@/utils/contract-calls";

export const blockdagTestnet = defineChain({
  id: Number(ENV.CHAIN.ID),
  name: ENV.CHAIN.NAME,
  nativeCurrency: {
    name: ENV.CHAIN.CURRENCY_NAME,
    symbol: ENV.CHAIN.CURRENCY_SYMBOL,
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ENV.CHAIN.RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "BlockDAG Explorer",
      url: ENV.CHAIN.BLOCK_EXPLORER_URL,
    },
  },
});

export const networks = [blockdagTestnet] as const;

export const metadata = {
  name: "BlockDAG Staking",
  description: "BlockDAG Staking Frontend",
  url:
    typeof window !== "undefined"
      ? window.location.origin
      : "https://blockdag.network",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

export const wagmiAdapter = new WagmiAdapter({
  networks: [...networks],
  transports: {
    [blockdagTestnet.id]: http(ENV.CHAIN.RPC_URL, {
      batch: { batchSize: 20, wait: 10 },
      retryCount: 0,
      retryDelay: 1500,
      timeout: CONTRACT_READ_TIMEOUT_MS,
    }),
  },
  projectId: ENV.REOWN_PROJECT_ID || "",
  ssr: true,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks: [...networks],
  metadata,
  projectId: ENV.REOWN_PROJECT_ID || "",
  features: {
    analytics: false,
    email: false,
  },
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
    "4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0", //trust wallet
  ],
  // includeWalletIds: [
  //   "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96", // MetaMask
  // ],
  enableWalletConnect: true,
  enableCoinbase: true,
  // Browsing the app must remain possible while disconnected. A wallet on a
  // different chain is handled by our write boundary after an explicit click;
  // AppKit must not open a switch-network screen during route loads.
  enableNetworkSwitch: false,
  allowUnsupportedChain: true,
  // Restore an already-authorized session without requesting permissions or
  // switching networks. New connections and every signing action still need
  // an explicit click. Disabling this actively disconnects sessions on reload.
  enableReconnect: true,
  // allWallets: "HIDE",

  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "hsl(47 100% 62%)",
    "--w3m-border-radius-master": "1px",
  },
});

export const queryClient = new QueryClient();
