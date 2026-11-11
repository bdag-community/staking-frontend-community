import { useChainId, useConfig, useBalance } from "wagmi";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useCallback, useMemo } from "react";
import { formatNumber, truncatedHash } from "@/lib/utils";
import { disconnect as wagmiDisconnect } from "wagmi/actions";
import { formatUnits } from "viem";
import { toast } from "./use-toast";

export const useWallet = () => {
  const { address, isConnected, status } = useAppKitAccount();
  const { open } = useAppKit();
  const chainId = useChainId();
  const config = useConfig();

  const isConnecting = status === "connecting";
  const isReconnecting = status === "reconnecting";

  const disconnectWallet = useCallback(async () => {
    try {
      await wagmiDisconnect(config);
      toast({
        title: "Disconnected Successfully",
        description: "Your wallet has been disconnected.",
      });
    } catch (error) {
      console.error("Disconnect failed:", error);
    }
  }, [config]);

  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  const formattedBalance = useMemo(() => {
    if (!balanceData) return "";
    return `${formatNumber(
      formatUnits(balanceData.value, balanceData.decimals),
      2,
    )} ${balanceData.symbol}`;
  }, [balanceData]);

  const userBalance = useMemo(() => {
    if (!balanceData) return 0;
    return parseFloat(formatUnits(balanceData.value, balanceData.decimals));
  }, [balanceData]);

  const shortenAddress = useMemo(() => truncatedHash(address), [address]);

  return useMemo(
    () => ({
      // State
      address,
      shortenAddress,
      isConnected,
      isConnecting,
      isReconnecting,
      status,
      chainId,
      balanceData,
      formattedBalance,
      userBalance,

      // Actions
      open,
      disconnect: disconnectWallet,
      refresh: refetchBalance,
    }),
    [
      address,
      shortenAddress,
      isConnected,
      isConnecting,
      isReconnecting,
      status,
      chainId,
      balanceData,
      formattedBalance,
      userBalance,
      disconnectWallet,
      refetchBalance,
      open,
    ],
  );
};
