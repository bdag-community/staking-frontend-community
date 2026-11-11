import React from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { ENV } from "@/config/env";
import { useWallet } from "@/hooks/use-wallet";
import { ConnectButton } from "@/components/wallet/ConnectButton";

interface AdminRouteProps {
  children: React.ReactNode;
}

const adminWallets = String(ENV.ADMIN_WALLETS || "")
  .split(",")
  .map((wallet) => wallet.trim().toLowerCase())
  .filter(Boolean);

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { address, isConnected, isConnecting, isReconnecting } = useWallet();
  const isInitialLoading = isConnecting || (!isConnected && isReconnecting);
  const isAllowlistEnabled = adminWallets.length > 0;
  const isAllowed =
    !isAllowlistEnabled ||
    (address ? adminWallets.includes(address.toLowerCase()) : false);

  if (isInitialLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Checking wallet connection...
        </p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-primary" />
        <h1 className="text-xl font-semibold">Admin access required</h1>
        <p className="text-sm text-muted-foreground">
          Connect an authorized wallet to view the visibility dashboard.
        </p>
        <ConnectButton />
      </div>
    );
  }

  if (!isAllowed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive" />
        <h1 className="text-xl font-semibold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          This wallet is not allowed to view the visibility dashboard.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
