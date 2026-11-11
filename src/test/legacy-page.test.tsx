import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LegacyPage } from "@/pages/PlatformPages";
const state = vi.hoisted(() => ({ release: 90n, apiError: new Error("Indexer unavailable"), requestError: null as string | null, pool: `0x${"1".repeat(40)}` }));
vi.mock("@/hooks/use-wallet", () => ({ useWallet: () => ({ address: `0x${"2".repeat(40)}`, isConnected: true }) }));
vi.mock("swr", () => ({ default: () => ({ data: null, error: state.apiError, mutate: vi.fn() }) }));
vi.mock("@/hooks/use-staking-contract", () => ({ useStakingContract: () => ({ isPending: false, transactionStatus: null, claim: vi.fn(), unstake: vi.fn() }) }));
vi.mock("@/hooks/use-unbonding-requests", () => ({ useUnbondingRequests: () => ({ unbondingRequests: [{ amount: 1000000000000000000n, pool: state.pool, releaseTime: state.release, isClaimed: false }], isLoading: false, error: state.requestError, refetch: vi.fn() }) }));
vi.mock("@/hooks/use-pool-addresses", () => ({ usePoolAddresses: () => ({ pools: [{ poolAddress: state.pool }], loading: false, error: null, hasMore: false }) }));
vi.mock("@/hooks/use-chain-time", () => ({ useChainTime: () => ({ chainTime: 100, error: null }) }));
vi.mock("@/hooks/use-initial-bonding-period", () => ({ useInitialBondingPeriod: () => ({ bondingEndsAt: 0, isLoading: false, error: null, refetch: vi.fn() }) }));
vi.mock("@/hooks/use-staking-periods", () => ({ useStakingPeriods: () => ({ formatted: { unbondingPlain: "3 weeks" }, isLoading: false, error: null }) }));
vi.mock("@/hooks/use-legacy-positions", () => ({ mergeLegacyPoolAddresses: () => [state.pool], useLegacyPositions: () => ({ positions: [{ pool: state.pool, shares: 1000000000000000000n, principal: 1000000000000000000n, liquidValue: 1000000000000000000n, blockNumber: 10n }], isLoading: false, error: null, refetch: vi.fn() }) }));
describe("legacy exit interface", () => {
  beforeEach(() => { cleanup(); state.release = 90n; state.requestError = null; });
  it("keeps direct-chain exits available when pool indexing fails, without a deposit action", () => {
    render(<MemoryRouter><LegacyPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Unstake chosen amount" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Claim BDAG" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^stake$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Pool discovery is incomplete");
  });
  it("disables claiming while a withdrawal is still unbonding", () => {
    state.release = 200n;
    render(<MemoryRouter><LegacyPage /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Claim BDAG" })).toBeDisabled();
  });
  it("does not show a missing contract read as no pending withdrawals", () => {
    state.requestError = "RPC offline";
    render(<MemoryRouter><LegacyPage /></MemoryRouter>);
    expect(screen.queryByRole("button", { name: "Claim BDAG" })).not.toBeInTheDocument();
    expect(screen.queryByText("No pending withdrawals on this network.")).not.toBeInTheDocument();
    expect(screen.getByText(/Withdrawal requests are unavailable/)).toBeInTheDocument();
  });
});
