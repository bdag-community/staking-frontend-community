import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { CredentialActionPanel } from '@/components/credentials/CredentialActionPanel';

it('does not send a claim when voting is ready but this wallet has nothing available', () => {
  const onClaim = vi.fn();
  render(<CredentialActionPanel stakingConfigured miningConfigured stakingReady miningReady
    stakingClaimable={false} miningClaimable={false} stakingEpoch={12n} miningEpoch={12n}
    registeredPools={[]} isPending={false} actionMessage=""
    stakingReason="No new staking receipt to claim." onClaim={onClaim} onDelegate={vi.fn()} />);
  const button = screen.getByRole('button', { name: 'Claim optional staking receipt' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClaim).not.toHaveBeenCalled();
  expect(screen.getByText('No new staking receipt to claim.')).toBeVisible();
});
