import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CONTRACT_READ_TIMEOUT_MS } from '../utils/contract-calls';
import { resilientSWRConfig } from '../utils/swr-helpers';

describe('bounded loading and Phase 1 presentation', () => {
  it('bounds a contract read to ten seconds', () => {
    expect(CONTRACT_READ_TIMEOUT_MS).toBeLessThanOrEqual(10000);
  });
  it('stops background retries after two attempts', () => {
    vi.useFakeTimers();
    const revalidate = vi.fn();
    resilientSWRConfig.onErrorRetry(new Error('Error 503: unavailable'), '', {}, revalidate, {retryCount:3});
    vi.runAllTimers();
    expect(revalidate).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
  it('splits route code without removing the persistent layout', () => {
    const source=readFileSync('src/App.tsx','utf8');
    expect(source).toContain('lazy(');
    expect(readFileSync('src/components/layout/DashboardLayout.tsx','utf8')).toContain('Suspense');
    expect(source).toContain('DashboardLayout');
  });
  it('labels unavailable legacy history instead of inviting a withdrawal', () => {
    const source=readFileSync('src/pages/PlatformPages.tsx','utf8');
    expect(source).toContain('ENV.LEGACY_AVAILABLE');
    expect(source).toContain('no legacy staking history');
  });
});
