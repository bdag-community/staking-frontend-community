import { act, cleanup, renderHook } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useEpochStatus } from '@/hooks/use-epoch-status';

const mocks = vi.hoisted(() => ({ request: vi.fn(), refresh: vi.fn(), refreshWithIntervals: vi.fn() }));
vi.mock('@/hooks/use-api', () => ({ default: () => mocks.request }));
vi.mock('@/hooks/use-refresh-balances', () => ({ useRefreshBalances: () => ({ refresh: mocks.refresh, refreshWithIntervals: mocks.refreshWithIntervals }) }));
const cache = () => {
  const store = new Map();
  return ({ children }: { children: React.ReactNode }) => <SWRConfig value={{ provider: () => store, dedupingInterval: 0, shouldRetryOnError: false }}>{children}</SWRConfig>;
};
const snapshot = (epoch = 5, deadline = 1360000) => ({ currentEpoch: epoch, nextEpochStartTime: deadline, timeToNextEpoch: 45000, genesisTime: 1000000, epochDuration: 60000 });
const flush = async () => { await act(async () => { await Promise.resolve(); await Promise.resolve(); }); };
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(1320000);
  mocks.request.mockReset(); mocks.refresh.mockReset(); mocks.refreshWithIntervals.mockReset();
  mocks.request.mockResolvedValue({ success: true, data: snapshot(), message: 'OK' });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it('uses the absolute deadline and never restarts from a stale relative duration', async () => {
  const { result } = renderHook(useEpochStatus, { wrapper: cache() }); await flush();
  expect(result.current.timeRemaining).toBe(40);
  await act(async () => { vi.advanceTimersByTime(10000); });
  expect(result.current.timeRemaining).toBe(30);
  await act(async () => { await result.current.refetch(); });
  expect(result.current.timeRemaining).toBe(30);
});

it('preserves an expired absolute deadline when a page remounts with cached data', async () => {
  const wrapper = cache();
  const first = renderHook(useEpochStatus, { wrapper }); await flush();
  first.unmount();
  vi.setSystemTime(1370000);
  const second = renderHook(useEpochStatus, { wrapper }); await flush();
  expect(second.result.current.timeRemaining).toBe(0);
  expect(second.result.current.isAwaitingConfirmation).toBe(true);
});

it('waits for a confirmed epoch at zero instead of inventing another countdown', async () => {
  const { result } = renderHook(useEpochStatus, { wrapper: cache() }); await flush();
  await act(async () => { vi.advanceTimersByTime(70000); }); await flush();
  expect(result.current.timeRemaining).toBe(0);
  expect(result.current.isAwaitingConfirmation).toBe(true);
  expect(mocks.refresh).not.toHaveBeenCalled();
  expect(mocks.refreshWithIntervals).not.toHaveBeenCalled();
});

it('catches up after a throttled tab tick and does not increase time on a backwards local clock', async () => {
  const { result } = renderHook(useEpochStatus, { wrapper: cache() }); await flush();
  vi.setSystemTime(1355000);
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(result.current.timeRemaining).toBe(4);
  vi.setSystemTime(1330000);
  await act(async () => { vi.advanceTimersByTime(1000); });
  expect(result.current.timeRemaining).toBeLessThanOrEqual(4);
});

it('refreshes balances once per observed rollover across multiple consumers', async () => {
  const wrapper = cache();
  const first = renderHook(useEpochStatus, { wrapper });
  const second = renderHook(useEpochStatus, { wrapper }); await flush();
  mocks.request.mockResolvedValue({ success: true, data: snapshot(6, 1420000), message: 'OK' });
  await act(async () => { await first.result.current.refetch(); }); await flush();
  expect(second.result.current.epoch).toBe(6);
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  expect(mocks.refreshWithIntervals).not.toHaveBeenCalled();
});

it('hides countdown after a failed refresh instead of presenting stale data as current', async () => {
  const { result } = renderHook(useEpochStatus, { wrapper: cache() }); await flush();
  mocks.request.mockResolvedValue({ success: false, message: 'Epoch unavailable' });
  await act(async () => { await result.current.refetch(); }); await flush();
  expect(result.current.error).toBe('Epoch unavailable');
  expect(result.current.timeRemaining).toBe(0);
  expect(result.current.isAwaitingConfirmation).toBe(false);
});
