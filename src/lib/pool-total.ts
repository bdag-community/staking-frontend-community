import { formatEther, parseEther } from "viem";
export function totalPoolPrincipal(pools: { totalStaked?: string }[]): string | null {
  try {
    let total = 0n;
    for (const pool of pools) {
      if (typeof pool.totalStaked !== "string" || !/^\d+(\.\d{1,18})?$/.test(pool.totalStaked)) return null;
      total += parseEther(pool.totalStaked);
    }
    return formatEther(total);
  } catch { return null; }
}
