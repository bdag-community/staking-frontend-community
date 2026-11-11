import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { EpochCountdown } from '@/components/portfolio/EpochCountdown';

afterEach(cleanup);
it('describes voting eligibility rather than promising a reward payout', () => {
  render(<EpochCountdown epoch={5} timeRemaining={40} />);
  expect(screen.getByText('Voting epoch')).toBeInTheDocument();
  expect(screen.getByText('Next epoch 6 in 0m 40s')).toBeInTheDocument();
  expect(screen.getByText(/Rewards accrue as your pool earns blocks/)).toBeInTheDocument();
  expect(screen.queryByText('Next Reward Distribution')).not.toBeInTheDocument();
});
it('shows waiting for chain confirmation instead of repeating zero', () => {
  render(<EpochCountdown epoch={5} timeRemaining={0} isAwaitingConfirmation />);
  expect(screen.getByText('Waiting for the next confirmed epoch')).toBeInTheDocument();
  expect(screen.queryByText(/in 0m 0s/)).not.toBeInTheDocument();
});
it('hides stale countdowns on errors', () => {
  render(<EpochCountdown epoch={5} timeRemaining={40} error="RPC unavailable" />);
  expect(screen.getByRole('status')).toHaveTextContent('Epoch clock unavailable');
  expect(screen.queryByText(/Next epoch 6 in/)).not.toBeInTheDocument();
});
it('indicates loading instead of displaying an invented epoch', () => {
  render(<EpochCountdown epoch={0} timeRemaining={0} isLoading />);
  expect(screen.getByRole('status')).toHaveTextContent('Reading the current epoch');
  expect(screen.queryByText(/Next epoch 1/)).not.toBeInTheDocument();
});
