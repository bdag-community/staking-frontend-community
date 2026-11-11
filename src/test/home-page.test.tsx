import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import HomePage from "@/pages/HomePage";
import { ENV } from "@/config/env";
const testEnv = vi.hoisted(() => ({
  LEGACY_ONLY: false,
  IS_TESTNET: true,
  NETWORK_LABEL: "DAO rehearsal devnet",
  CHAIN: { ID: "8008", EXPECTED_GENESIS_HASH: "0x123" },
}));
const state = vi.hoisted(() => ({ directory: { pools: [{ totalStaked: "20" }, { totalStaked: "5" }], loading: false, error: null as string | null, hasMore: false }, stats: { globalStats: { activePoolsCount: 1, totalPoolsCount: 2, avgApy: 12 }, error: null as string | null, isLoading: false } }));
vi.mock("@/config/env", () => ({ ENV: testEnv }));
vi.mock("@/hooks/use-reward-split", () => ({ useRewardSplit: () => ({ data: { miners: 70, stakers: 30 }, error: null }) }));
vi.mock("@/hooks/use-epoch-status", () => ({ useEpochStatus: () => ({ epochDuration: 60000, loading: false, error: null }) }));
vi.mock("@/hooks/use-pool-addresses", () => ({ usePoolAddresses: () => state.directory }));
vi.mock("@/hooks/use-global-stats", () => ({ useGlobalStats: () => state.stats }));
vi.mock("@/hooks/use-staking-periods", () => ({ useStakingPeriods: () => ({ formatted: { initialBondingPlain: "4 minutes", unbondingPlain: "3 minutes", epochPlain: "1 minute" }, isLoading: false, error: null }) }));
vi.mock("@/hooks/use-contract-version", () => ({ useContractVersion: () => ({ minStake: .001, address: "0x123", isLoading: false, error: null }) }));
describe("staking home", () => {
  beforeEach(() => { cleanup(); state.directory.error = null; state.directory.hasMore = false; state.stats.error = null; state.stats.globalStats.avgApy = 12; });
  it("cycles the three staking steps visually while keeping one meaningful accessible heading", () => {
    const { container } = render(<MemoryRouter><HomePage /></MemoryRouter>);
    const heading = screen.getByRole("heading", { level: 1, name: "Choose your pool / Stake your BDAG / Earn rewards" });
    expect(heading).not.toHaveAttribute("aria-live");
    const cycle = heading.querySelector(".staking-hero-title-cycle");
    expect(cycle).toHaveAttribute("aria-hidden", "true");
    expect([...heading.querySelectorAll(".staking-hero-title-phrase")].map((phrase) => phrase.textContent)).toEqual([
      "Choose your pool", "Stake your BDAG", "Earn rewards",
    ]);
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });
  it("includes every discovered pool in the total and explains variable returns", () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.getByText("25", { exact: false }).textContent).toContain("25");
    expect(screen.getByText("12%")).toBeInTheDocument();
    expect(screen.getByText(/Variable, not guaranteed/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Your portfolio" })).toHaveAttribute("href", "/portfolio");
    expect(screen.getByRole("link", { name: /View voting power/i })).toHaveAttribute("href", "/credentials");
    expect(screen.getByText(/Every eligible staking reward carries its full voting weight/)).toBeInTheDocument();
    expect(screen.getByText("3 minutes")).toBeInTheDocument();
  });
  it("presents the accelerated devnet schedule as a compact hero label", () => {
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    const label = screen.getByRole("status");
    expect(label).toHaveTextContent(`${ENV.NETWORK_LABEL} · test BDAG only`);
    expect(label).toHaveClass("status-badge-primary");
    expect(label.closest(".landing-hero-status")).not.toBeNull();
  });
  it("does not present an incomplete directory as the all-pool total", () => {
    state.directory.hasMore = true;
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.queryByText(/^25 /)).not.toBeInTheDocument();
    expect(screen.getByText(/An unavailable value is not zero/)).toHaveAttribute("role", "status");
  });
  it("does not turn a missing APY into zero percent", () => {
    state.stats.globalStats.avgApy = undefined as unknown as number;
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getByText(/Some network figures are unavailable/)).toHaveAttribute("role", "status");
  });
  it("hides failed stats even if cached values exist", () => {
    state.directory.error = "offline"; state.stats.error = "offline";
    render(<MemoryRouter><HomePage /></MemoryRouter>);
    expect(screen.queryByText("12%")).not.toBeInTheDocument();
    expect(screen.getByText(/Some network figures are unavailable/)).toHaveAttribute("role", "status");
  });
});
