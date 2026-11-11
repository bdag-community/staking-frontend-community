import React from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";

interface ConnectButtonProps {
  className?: string;
  size?: "default" | "sm" | "lg" | "xl" | "icon";
}

export const ConnectButton: React.FC<ConnectButtonProps> = ({
  className,
  size = "default",
}) => {
  const { open, isConnecting } = useWallet();

  return (
    <Button
      onClick={() => open()}
      disabled={isConnecting}
      variant="glow"
      size={size}
      className={`${className ?? ""}`}
    >
      <Wallet className="w-4 h-4 mr-2" />
      <span className="hidden sm:inline">
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </span>
      <span className="sm:hidden">
        {isConnecting ? "..." : "Connect"}
      </span>
    </Button>
  );
};
