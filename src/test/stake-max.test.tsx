import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { parseEther } from "viem";
import { getMaxStakeQuote, useStakingContract } from "@/hooks/use-staking-contract";

const rpc = vi.hoisted(() => ({
  estimateGas: vi.fn(),
  getBalance: vi.fn(),
  getGasPrice: vi.fn(),
  switchChain: vi.fn(),
  writeContract: vi.fn(),
  simulate: vi.fn(),
  account: "0x1111111111111111111111111111111111111111" as const,
  pool: "0x2222222222222222222222222222222222222222" as const,
}));

vi.mock("@wagmi/core", async (importOriginal) => ({
  ...await importOriginal<typeof import("@wagmi/core")>(),
  estimateGas: rpc.estimateGas,
  getBalance: rpc.getBalance,
  getGasPrice: rpc.getGasPrice,
  switchChain: rpc.switchChain,
  writeContract: rpc.writeContract,
}));
vi.mock("@/config/reown", () => ({ blockdagTestnet: { id: 1043 }, wagmiAdapter: { wagmiConfig: {} } }));
vi.mock("@/hooks/use-wallet", () => ({ useWallet: () => ({ address: rpc.account, chainId: 1043 }) }));
vi.mock("@/hooks/use-wallet-network-validation", () => ({
  useWalletNetworkValidation: () => ({ readFresh: async () => ({ account: rpc.account, chainId: 1043 }) }),
}));
vi.mock("@/hooks/use-refresh-balances", () => ({ useRefreshBalances: () => ({ refreshWithIntervals: vi.fn() }) }));
vi.mock("@/lib/visibility", () => ({
  createVisibilityAttemptId: () => "test",
  trackVisibilityEvent: vi.fn(),
  getVisibilityErrorPayload: () => ({}),
}));
vi.mock("@/utils/contract-calls", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/utils/contract-calls")>(),
  simulateContractWithRetry: rpc.simulate,
}));

beforeEach(() => {
  vi.clearAllMocks();
  rpc.getBalance.mockResolvedValue({ value: parseEther("524.369083000000000001") });
  rpc.getGasPrice.mockResolvedValue(1_000_000_000n);
  rpc.estimateGas.mockResolvedValue(900_000n);
  rpc.simulate.mockImplementation(async (_config, params) => ({ request: params }));
  rpc.writeContract.mockRejectedValue(new Error("User rejected the request"));
});

it("reserves the buffered fee for the selected stake before rounding Max down", async () => {
  const minStake = parseEther("0.001");
  const quote = await getMaxStakeQuote(rpc.account, rpc.pool, minStake);
  expect(quote.networkFee).toBe(parseEther("0.00216"));
  expect(quote.amount).toBe(parseEther("524.3669"));
  expect(quote.amount + quote.networkFee).toBeLessThanOrEqual(quote.balance);
  expect(rpc.getBalance).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ blockTag: "pending" }));
  expect(rpc.estimateGas.mock.calls[0]?.[1].value).toBe(minStake);
});

it("passes the gas and fee used by the affordability check to the wallet", async () => {
  const { result } = renderHook(() => useStakingContract());
  await act(async () => {
    await expect(result.current.stake(rpc.pool, "524.3669")).rejects.toThrow("User rejected");
  });
  expect(rpc.writeContract.mock.calls[0]?.[1]).toMatchObject({
    gas: 1_080_000n,
    maxFeePerGas: 2_000_000_000n,
    value: parseEther("524.3669"),
  });
});
