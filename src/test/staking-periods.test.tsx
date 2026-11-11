import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { beforeEach, expect, it, vi } from 'vitest';
import { useStakingPeriods } from '@/hooks/use-staking-periods';
const m = vi.hoisted(() => ({ read: vi.fn(), legacy: false }));
vi.mock('@/config/env', () => ({ ENV: { get LEGACY_ONLY() { return m.legacy; }, CHAIN: { ID: '1043', RPC_URL: 'http://example.invalid', STAKING_CONTRACT_ADDRESS: '0x0000000000000000000000000000000000000001' } } }));
vi.mock('@/config/reown', () => ({ wagmiAdapter: { wagmiConfig: {} } }));
vi.mock('@/utils/contract-calls', () => ({ readContractWithRetry: m.read }));
const use = () => renderHook(useStakingPeriods, { wrapper: ({ children }) => <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig> });
beforeEach(() => { m.legacy = false; m.read.mockReset().mockImplementation(async (_, args) => ({ bondingPeriod: 10000n, unbondingPeriod: 6000n, epochDuration: 1800n, INITIAL_BONDING_PERIOD: 7200n, UNBONDING_PERIOD: 5400n, EPOCH_DURATION: 1800n })[args.functionName]); });
it('reads effective V2 policy overrides rather than the default-only aliases', async () => {
  const { result } = use();
  await waitFor(() => expect(result.current.unbondingPeriod).toBe(6000));
  expect(result.current.initialBondingPeriod).toBe(10000);
  expect(result.current.epochDuration).toBe(1800);
});
it('retains V1 getter compatibility on the isolated legacy network', async () => {
  m.legacy = true;
  const { result } = use();
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.unbondingPeriod).toBe(5400);
});
