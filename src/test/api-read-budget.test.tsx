import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import useNetworkRequest from '@/hooks/use-api';

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); });

it('allows a paced 13-second balance read to finish without launching a duplicate retry', async () => {
  const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    const timer = window.setTimeout(() => resolve(new Response(JSON.stringify({ success: true, data: { totalStaked: '9.023967912953123071' } }))), 13000);
    options.signal?.addEventListener('abort', () => { window.clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
  }));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(useNetworkRequest);
  const read = result.current({ endpoint: '/staker/totalStaked/tester', method: 'GET' });
  await vi.advanceTimersByTimeAsync(17000);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await read).toMatchObject({ success: true, data: { totalStaked: '9.023967912953123071' } });
});

it('keeps the existing eight-second write deadline and never retries a write', async () => {
  const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
    options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  vi.stubGlobal('fetch', fetcher);
  const { result } = renderHook(useNetworkRequest);
  const write = result.current({ endpoint: '/pools/register', method: 'POST', body: { test: true } });
  await vi.advanceTimersByTimeAsync(8500);
  expect(await write).toMatchObject({ success: false });
  expect(fetcher).toHaveBeenCalledTimes(1);
});
