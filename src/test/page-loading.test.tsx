import { readFileSync } from "node:fs";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NetworkReadGate } from "@/components/layout/NetworkReadGate";

const state = vi.hoisted(() => ({ data: undefined as boolean | undefined, error: undefined as Error | undefined, mutate: vi.fn() }));
vi.mock("swr", () => ({ default: () => state }));
vi.mock("@/config/env", () => ({ ENV: { NETWORK_LABEL: "BDAG Community Testnet", CHAIN: { RPC_URL: "https://example.invalid/rpc", EXPECTED_GENESIS_HASH: "0x123", ID: 1043 } } }));

afterEach(() => {
  cleanup();
  state.data = undefined;
  state.error = undefined;
  vi.clearAllMocks();
});

describe("staking page loading presentation", () => {
  it("shows a Development-style busy skeleton while network verification is pending", () => {
    render(<NetworkReadGate><button>Stake funds</button></NetworkReadGate>);
    const loader = screen.getByRole("status", { name: "Loading page" });
    expect(loader).toHaveAttribute("aria-busy", "true");
    expect(loader).toHaveAttribute("data-page-loading-skeleton");
    expect(loader).toHaveTextContent("Verifying BDAG Community Testnet before loading balances.");
    expect(screen.queryByRole("button", { name: "Stake funds" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Connecting to staking…" })).not.toBeInTheDocument();
  });

  it("keeps an explicit connection error and retry instead of a skeleton on failure", () => {
    state.error = new Error("RPC unavailable");
    render(<NetworkReadGate><button>Stake funds</button></NetworkReadGate>);
    expect(screen.getByRole("heading", { name: "Network connection unavailable" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry connection" })).toBeVisible();
    expect(screen.queryByRole("status", { name: "Loading page" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stake funds" })).not.toBeInTheDocument();
  });

  it("reveals the original page only after successful identity verification", () => {
    state.data = true;
    render(<NetworkReadGate><button>Stake funds</button></NetworkReadGate>);
    expect(screen.getByRole("button", { name: "Stake funds" })).toBeVisible();
    expect(screen.queryByRole("status", { name: "Loading page" })).not.toBeInTheDocument();
  });

  it("uses the same skeleton for lazy page navigation", () => {
    const layout = readFileSync("src/components/layout/DashboardLayout.tsx", "utf8");
    expect(layout).toMatch(/<Suspense fallback=\{<PageLoadingSkeleton/);
    expect(layout).not.toContain('fallback={<div role="status"');
  });
});
