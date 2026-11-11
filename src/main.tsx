import { createRoot } from "react-dom/client";
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider } from '@tanstack/react-query';
import { NetworkReadGate } from "@/components/layout/NetworkReadGate";
import App from "./App.tsx";
import "./index.css";
import { wagmiAdapter, queryClient } from "@/config/reown";

import ErrorBoundary from "@/components/layout/ErrorBoundary";
import { restoreStakingReturnRoute } from "@/lib/staking-return-route";

restoreStakingReturnRoute();
createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={wagmiAdapter.wagmiConfig}>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <NetworkReadGate><App /></NetworkReadGate>
      </ErrorBoundary>
    </QueryClientProvider>
  </WagmiProvider>
);
