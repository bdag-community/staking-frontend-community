import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { RewardDistributionCard } from '@/components/portfolio/RewardDistributionCard';
import { ClaimRewardsDialog } from '@/components/portfolio/ClaimRewardsDialog';
import { RecentActivityTable } from '@/components/portfolio/RecentActivityTable';
import type { Transaction } from '@/utils/interface';

afterEach(cleanup);
const props = { timeRemaining: 100, epoch: 552838, totalStaked: '9.023967912953123071', totalPendingRewards: '0.8', isActionPending: false, isClaimLocked: false, latestReleaseTime: 1793569560, hasPendingUnbonding: false, claimableAmount: '1.007744842179856846', claimableStakeAmount: '0.000011883685245843', onUnstakeAll: vi.fn(), onUnstakeStake: vi.fn(), onClaimStake: vi.fn(), onClaimAll: vi.fn(), onStake: vi.fn() };

it('offers one combined claim instead of an invented rewards/principal split', () => {
  render(<TooltipProvider><RewardDistributionCard {...props} /></TooltipProvider>);
  expect(screen.getByRole('button', { name: /claim released bdag/i })).toBeEnabled();
  expect(screen.getAllByRole('button', { name: /claim/i })).toHaveLength(1);
});

it('keeps the combined claim disabled when either real contract gate is locked', () => {
  render(<TooltipProvider><RewardDistributionCard {...props} isClaimLocked /></TooltipProvider>);
  expect(screen.getByRole('button', { name: /claim released bdag/i })).toBeDisabled();
});

it('does not promise a principal/reward split that the receipt does not record', () => {
  render(<ClaimRewardsDialog isOpen onClose={vi.fn()} onConfirm={vi.fn()} totalClaimable="1.007744842179856846" />);
  expect(screen.getByRole('alertdialog')).toHaveTextContent(/principal and rewards/i);
  expect(screen.queryByText(/receipt separates principal and rewards/i)).not.toBeInTheDocument();
});

it('labels an indexed unstake payout as BDAG rather than shares', () => {
  const tx: Transaction = { id: 1, txHash: '0xbf7791bef1693b0b6256595e2f68eda9141136cabcd9404cd55e493ff4ff682e', blockNumber: 657643, timestamp: '2026-11-01T20:00:00Z', logIndex: 0, eventType: 'Unstaked', stakerAddress: '0x4D3fEa9Df8e5FC0944075267463AfE0c10083caB', poolAddress: '0xA6ea67E189868FcEd08E1cBc99A821CAe0FfFe72', amount: '1.007744842179856846', rawAmount: '1007744842179856846', createdAt: '2026-11-01T20:00:00Z', updatedAt: '2026-11-01T20:00:00Z' };
  render(<TooltipProvider><RecentActivityTable history={[tx]} isLoadingHistory={false} isInitialLoading={false} hasMore={false} onLoadMore={vi.fn()} /></TooltipProvider>);
  expect(screen.getByRole('cell', { name: /1\.01 BDAG/ })).toBeVisible();
  expect(screen.queryByText(/1\.01 shares/)).not.toBeInTheDocument();
});
