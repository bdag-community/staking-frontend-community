import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkNotice } from "@/components/layout/NetworkNotice";

const state = vi.hoisted(() => ({
  connected: true,
  chainId: 1043,
  genesisHash: undefined as string | undefined,
  isGenesisValid: false,
  isGenesisChecking: false,
  genesisError: null as string | null,
  retry: vi.fn(),
}));
vi.mock("@/hooks/use-wallet", () => ({ useWallet: () => ({ isConnected: state.connected }) }));
vi.mock("@/hooks/use-wallet-network-validation", () => ({ useWalletNetworkValidation: () => ({ ...state, retry: state.retry }) }));
vi.mock("@/config/env", () => ({ ENV: { NETWORK_LABEL: "BDAG Community Testnet", CHAIN: { ID: 1043, RPC_URL: "https://testnet-staking.bdag.co/rpc", EXPECTED_GENESIS_HASH: "0x" + "ab".repeat(32) } } }));

describe("wallet network notice", () => {
  beforeEach(() => {
    cleanup();
    Object.assign(state, { connected: true, chainId: 1043, genesisHash: undefined, isGenesisValid: false, isGenesisChecking: false, genesisError: null });
    state.retry.mockReset();
  });
  it("offers a read-only retry for an unavailable RPC instead of calling it the wrong network", () => {
    state.genesisError = "RPC busy";
    render(<NetworkNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Unable to verify");
    expect(screen.getByRole("status")).toHaveTextContent("Signing remains disabled");
    expect(screen.queryByText(/does not match/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry network check" }));
    expect(state.retry).toHaveBeenCalledOnce();
  });
  it("does not call a missing connector or pending read a mismatch", () => {
    state.isGenesisChecking = true;
    render(<NetworkNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Checking");
    expect(screen.queryByText(/does not match/)).not.toBeInTheDocument();
  });
  it("treats an empty genesis response as unavailable", () => {
    render(<NetworkNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("Unable to verify");
  });
  it("still identifies a known wrong chain or genesis", () => {
    state.chainId = 1;
    render(<NetworkNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("does not match");
    cleanup(); state.chainId = 1043; state.genesisHash = "0x" + "cd".repeat(32);
    render(<NetworkNotice />);
    expect(screen.getByRole("status")).toHaveTextContent("does not match");
  });
  it("hides only for a verified wallet or a disconnected wallet", () => {
    state.isGenesisValid = true;
    render(<NetworkNotice />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    cleanup(); state.connected = false; state.isGenesisValid = false;
    render(<NetworkNotice />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
