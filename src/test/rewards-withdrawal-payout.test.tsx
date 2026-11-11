import { act, cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import RewardsPage from '@/pages/RewardsPage';

const state = vi.hoisted(() => ({ bondingEndsAt: 0, twoPools: false }));
vi.mock('@/hooks/use-wallet', () => ({ useWallet: () => ({ isConnected: true }) }));
vi.mock('@/hooks/use-staking-contract', () => ({ useStakingContract: () => ({ claim: vi.fn(), unstake: vi.fn(), isPending: false, isConfirming: false, pendingAction: null }) }));
vi.mock('@/hooks/use-epoch-status', () => ({ useEpochStatus: () => ({ epoch: 552838, timeRemaining: 100, loading: false }) }));
vi.mock('@/hooks/use-user-rewards', () => ({ useUserRewards: () => ({ formattedTotalPending: '0.8', poolRewards: [], isLoading: false }) }));
vi.mock('@/hooks/use-user-staked-pools', () => ({ useUserStakedPools: () => ({ stakedPools: [{ poolAddress: '0xA6ea67E189868FcEd08E1cBc99A821CAe0FfFe72', stakedAmount: '10' }, ...(state.twoPools ? [{ poolAddress: '0x0000000000000000000000000000000000000003', stakedAmount: '10' }] : [])], isLoading: false }) }));
vi.mock('@/hooks/use-unbonding-requests', () => ({ useUnbondingRequests: () => ({ unbondingRequests: [{ shares: 2000000000000000000n, amount: 5000000000000000000n, releaseTime: 500n, pool: '0xA6ea67E189868FcEd08E1cBc99A821CAe0FfFe72', isClaimed: false }, ...(state.twoPools ? [{ shares: 3000000000000000000n, amount: 7000000000000000000n, releaseTime: 500n, pool: '0x0000000000000000000000000000000000000003', isClaimed: false }] : [])], isLoading: false }) }));
vi.mock('@/hooks/use-chain-time', () => ({ useChainTime: () => ({ chainTime: 1000, isLoading: false }) }));
vi.mock('@/hooks/use-initial-bonding-period', () => ({ useInitialBondingPeriod: () => ({ bondingEndsAt: state.bondingEndsAt, isLoading: false }) }));
vi.mock('@/hooks/use-staking-periods', () => ({ useStakingPeriods: () => ({ formatted: { unbondingPlain: '90 minutes' } }) }));
beforeEach(() => { state.bondingEndsAt = 0; state.twoPools = false; });
afterEach(cleanup);

it('offers the full five-BDAG payout without subtracting two shares as if they were BDAG', () => {
  render(<TooltipProvider><RewardsPage /></TooltipProvider>);
  expect(screen.getByRole('button', { name: /claim available bdag \(5\)/i })).toBeEnabled();
});

it('does not offer that matured payout before the separate initial bond expires', () => {
  state.bondingEndsAt = 2000;
  render(<TooltipProvider><RewardsPage /></TooltipProvider>);
  expect(screen.queryByRole('button', { name: /claim available bdag/i })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /^claim$/i })).toBeDisabled();
});

it('reviews the full payout across pools because a claim settles all matured requests', () => {
  state.twoPools = true;
  render(<TooltipProvider><RewardsPage /></TooltipProvider>);
  act(() => screen.getAllByRole('button', { name: /^claim$/i })[0].click());
  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).getByText('12 BDAG')).toBeVisible();
  expect(dialog).toHaveTextContent(/all.*withdrawal requests/i);
});
