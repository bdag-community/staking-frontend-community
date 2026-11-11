import { act, cleanup, render, screen } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NetworkReadGate } from "@/components/layout/NetworkReadGate";

const mocks = vi.hoisted(() => ({ getBlock: vi.fn(), getChainId: vi.fn() }));
vi.mock("viem", () => ({ createPublicClient: () => mocks, http: vi.fn() }));
vi.mock("@/config/env", () => ({ ENV: { NETWORK_LABEL: "Testnet", CHAIN: { ID: 1043, RPC_URL: "https://rpc.invalid", EXPECTED_GENESIS_HASH: "0x" + "ab".repeat(32) } } }));
const showGate = () => render(<SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}><NetworkReadGate><div>Verified staking controls</div></NetworkReadGate></SWRConfig>);
beforeEach(() => { vi.useFakeTimers(); mocks.getBlock.mockReset(); mocks.getChainId.mockReset(); mocks.getChainId.mockResolvedValue(1043); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("recovers a temporary public RPC failure automatically before showing controls", async () => {
  mocks.getBlock.mockRejectedValueOnce(new Error("Network request failed")).mockResolvedValue({ hash: "0x" + "ab".repeat(32) });
  showGate();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(screen.queryByText("Verified staking controls")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("could not verify");
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(screen.getByText("Verified staking controls")).toBeInTheDocument();
});

it("does not automatically retry a confirmed wrong chain or show controls", async () => {
  mocks.getBlock.mockResolvedValue({ hash: "0x" + "ab".repeat(32) });
  mocks.getChainId.mockResolvedValue(1);
  showGate();
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(mocks.getChainId).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Verified staking controls")).not.toBeInTheDocument();
});

it("stops automatic public RPC retries after two attempts", async () => {
  mocks.getBlock.mockRejectedValue(new Error("RPC timeout"));
  showGate();
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(mocks.getBlock).toHaveBeenCalledTimes(3);
  expect(screen.queryByText("Verified staking controls")).not.toBeInTheDocument();
});
