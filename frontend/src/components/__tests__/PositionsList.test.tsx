import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PositionsList } from '../PositionsList';
import { UserLoan } from '../../types/vault';

// Mock formatters and config
vi.mock('../../utils/formatters', () => ({
  formatSTX: (amount: number) => `${amount}.00`,
  formatTimestamp: (ts: number) => '2026-05-15',
}));

vi.mock('../../config/contracts', () => ({
  getExplorerUrl: () => 'https://explorer.hiro.so',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Shield: () => <div data-testid="icon-shield" />,
  AlertCircle: () => <div data-testid="icon-alert" />,
  CheckCircle: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  ExternalLink: () => <div data-testid="icon-link" />,
}));

describe('PositionsList Component - Badge Assignment', () => {
  const mockPositions: UserLoan[] = [
    {
      amount: BigInt(1000000),
      amountSTX: 1,
      interestRate: 500,
      interestRatePercent: 5,
      startBlock: 100,
      termEnd: 200,
      durationDays: 7,
      startTimestamp: 1625097600,
      collateralAmount: BigInt(1500000),
      collateralAmountSTX: 1.5,
      status: 'active',
    },
    {
      amount: BigInt(2000000),
      amountSTX: 2,
      interestRate: 500,
      interestRatePercent: 5,
      startBlock: 100,
      termEnd: 200,
      durationDays: 7,
      startTimestamp: 1625097600,
      collateralAmount: BigInt(3000000),
      collateralAmountSTX: 3,
      status: 'liquidated',
    },
    {
      amount: BigInt(3000000),
      amountSTX: 3,
      interestRate: 500,
      interestRatePercent: 5,
      startBlock: 100,
      termEnd: 200,
      durationDays: 7,
      startTimestamp: 1625097600,
      collateralAmount: BigInt(4500000),
      collateralAmountSTX: 4.5,
      status: 'repaid',
    },
  ];

  it('assigns the correct badge for an active position', () => {
    render(<PositionsList positions={[mockPositions[0]]} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(document.getElementById('badge-active')).toBeInTheDocument();
  });

  it('assigns the correct badge for a liquidated position', () => {
    render(<PositionsList positions={[mockPositions[1]]} />);
    expect(screen.getByText('Liquidated')).toBeInTheDocument();
    expect(document.getElementById('badge-liquidated')).toBeInTheDocument();
  });

  it('assigns the correct badge for a repaid position', () => {
    render(<PositionsList positions={[mockPositions[2]]} />);
    expect(screen.getByText('Closed')).toBeInTheDocument();
    expect(document.getElementById('badge-repaid')).toBeInTheDocument();
  });
});
