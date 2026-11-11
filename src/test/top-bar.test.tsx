import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ENV } from "@/config/env";
import { TopBar } from "@/components/layout/TopBar";

const testEnv = vi.hoisted(() => ({
  LEGACY_ONLY: false,
  NETWORK_LABEL: "DAO rehearsal devnet",
  CHAIN: { ID: "8008", BLOCK_EXPLORER_URL: "http://127.0.0.1/" },
}));
vi.mock("@/config/env", () => ({ ENV: testEnv }));

vi.mock("@/hooks/use-wallet", () => ({
  useWallet: () => ({
    isConnected: false,
    address: undefined,
    shortenAddress: "",
    disconnect: vi.fn(),
    open: vi.fn(),
    userBalance: 0,
  }),
}));
vi.mock("@/hooks/use-contract-version", () => ({
  useContractVersion: () => ({ version: "2", minStake: 0.001, isLoading: false, error: null }),
}));
vi.mock("@/hooks/use-total-staked", () => ({
  useTotalStaked: () => ({ totalStaked: 0, error: null, isLoading: false }),
}));
vi.mock("@/components/wallet/ConnectButton", () => ({ ConnectButton: () => <button>Connect wallet</button> }));
vi.mock("@/components/ui/sidebar", () => ({ SidebarTrigger: () => <button>Open navigation</button> }));

const scheduleLabel = `${ENV.NETWORK_LABEL} · accelerated epoch schedule`;
const logoSource = readFileSync(resolve(process.cwd(), "public/logo.svg"), "utf8");

describe("staking top bar", () => {
  it("uses the BDAG Staking wordmark without a duplicate community label", () => {
    render(<MemoryRouter initialEntries={["/"]}><TopBar /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "BDAG Staking home" })).toBeInTheDocument();
    expect(screen.queryByText("Community Staking")).not.toBeInTheDocument();
    expect(screen.getByAltText("BDAG Staking")).toHaveAttribute("src", "/logo.svg");
  });

  it("uses a renderer-independent subtitle aligned to the Community wordmark", () => {
    expect(logoSource).toMatch(/<g id="brand-subtitle"[^>]+aria-label="STAKING"/);
    expect(logoSource).toMatch(/data-reference="community-logo:subtitle"/);
    expect(logoSource).toMatch(/data-left="412\.7"/);
    expect(logoSource).toMatch(/data-baseline="493\.7"/);
    expect(logoSource).toMatch(/data-cap-height="37\.1"/);
    expect(logoSource).not.toMatch(/<text\b|brand-subtitle\{/);
    expect(logoSource).toMatch(/\.st1\{enable-background:new/);
  });

  it("leaves the landing-page schedule label to the hero", () => {
    render(<MemoryRouter initialEntries={["/"]}><TopBar /></MemoryRouter>);
    expect(screen.queryByText(scheduleLabel)).not.toBeInTheDocument();
  });

  it("leaves the inner-route schedule label to each page hero", () => {
    render(<MemoryRouter initialEntries={["/portfolio"]}><TopBar /></MemoryRouter>);
    expect(screen.queryByText(scheduleLabel)).not.toBeInTheDocument();
  });
});
