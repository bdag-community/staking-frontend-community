import useSWR from "swr";
import { readContract } from "@wagmi/core";
import { parseAbi } from "viem";
import { ENV } from "@/config/env";
import { wagmiAdapter } from "@/config/reown";
const abi = parseAbi(["function minerSplit() view returns(uint256)", "function stakerSplit() view returns(uint256)"]);
export function useRewardSplit() {
  return useSWR(["reward-split", ENV.CHAIN.RPC_URL, ENV.CHAIN.STAKING_CONTRACT_ADDRESS], async () => {
    const [miners, stakers] = await Promise.all((["minerSplit", "stakerSplit"] as const).map(functionName => readContract(wagmiAdapter.wagmiConfig, { address: ENV.CHAIN.STAKING_CONTRACT_ADDRESS, abi, functionName } as unknown as Parameters<typeof readContract>[1])));
    if (typeof miners !== "bigint" || typeof stakers !== "bigint" || miners + stakers !== 100n) throw new Error("Reward split unavailable");
    return { miners: Number(miners), stakers: Number(stakers) };
  }, { refreshInterval: 30000, shouldRetryOnError: false });
}
