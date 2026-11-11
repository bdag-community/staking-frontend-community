import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import useSWR, { SWRConfig } from 'swr';
import { afterEach, expect, it, vi } from 'vitest';
import { useRefreshBalances } from '@/hooks/use-refresh-balances';

const wallet = '0x4D3fEa9Df8e5FC0944075267463AfE0c10083caB';
const otherWallet = '0x606a00000000000000000000000000000000558a';
const mocks = vi.hoisted(() => ({ refreshWallet: vi.fn() }));
vi.mock('@/hooks/use-wallet', () => ({ useWallet: () => ({ address: '0x4D3fEa9Df8e5FC0944075267463AfE0c10083caB', refresh: mocks.refreshWallet }) }));
afterEach(cleanup);

it('refreshes versioned withdrawals and frozen bonds after a transaction without reloading another wallet', async () => {
  let claimed = false;
  const otherRead = vi.fn(async () => ['other wallet request']);
  const wrapper = ({ children }: { children: React.ReactNode }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
  const { result } = renderHook(() => {
    const current = useSWR(['unbondingRequests', 'current', '0x1000000000000000000000000000000000000020', wallet], async () => claimed ? [] : ['V2 request']);
    const legacy = useSWR(['unbondingRequests', 'v1', '0x08Bd519F611556dC148e7BfFE8d6f078F23a8EF7', wallet], async () => claimed ? [] : ['Legacy request']);
    const bond = useSWR(['initialBondingPeriod', 'https://testnet-staking.bdag.co/rpc', '0x1000000000000000000000000000000000000020', wallet], async () => claimed ? 2000 : 1000);
    const other = useSWR(['unbondingRequests', 'current', '0x1000000000000000000000000000000000000020', otherWallet], otherRead);
    return { current: current.data, legacy: legacy.data, bond: bond.data, other: other.data, refresh: useRefreshBalances().refresh };
  }, { wrapper });
  await waitFor(() => expect(result.current.current).toEqual(['V2 request']));
  await waitFor(() => expect(result.current.other).toEqual(['other wallet request']));
  claimed = true;
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.current).toEqual([]));
  expect(result.current.legacy).toEqual([]);
  expect(result.current.bond).toBe(2000);
  expect(otherRead).toHaveBeenCalledTimes(1);
});
