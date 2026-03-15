/**
 * LiquidationList Component Tests
 * Covers: empty state, loading, header, info banner, liquidation mechanics text
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiquidationList } from '../LiquidationList';

// Mock hooks
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: 'ST1TEST',
    userSession: {},
  }),
}));

vi.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    liquidate: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: (props: any) => <span data-testid="alert-icon" {...props}>Alert</span>,
  DollarSign: (props: any) => <span data-testid="dollar-icon" {...props}>Dollar</span>,
  TrendingDown: (props: any) => <span data-testid="trending-down" {...props}>Trending</span>,
  Zap: (props: any) => <span data-testid="zap-icon" {...props}>Zap</span>,
}));

vi.mock('../../config/contracts', () => ({
  PROTOCOL_CONSTANTS: {
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
    MIN_COLLATERAL_RATIO: 150,
    BLOCKS_PER_YEAR: 52560,
    BLOCK_TIME_MINUTES: 10,
  },
  getExplorerUrl: (txId?: string) => `https://explorer.hiro.so/txid/${txId}?chain=testnet`,
}));

describe('LiquidationList Component', () => {
  it('renders the header', () => {
    render(<LiquidationList />);
    expect(screen.getByText('Liquidation Opportunities')).toBeInTheDocument();
  });

  it('displays the info banner explaining liquidation', () => {
    render(<LiquidationList />);
    expect(screen.getByText('How Liquidation Works')).toBeInTheDocument();
  });

  it('mentions liquidation threshold in banner', () => {
    render(<LiquidationList />);
    expect(screen.getByText(/110%/)).toBeInTheDocument();
  });

  it('mentions liquidation bonus in banner', () => {
    render(<LiquidationList />);
    expect(screen.getByText(/5%/)).toBeInTheDocument();
  });

  it('shows empty state when no positions', () => {
    render(<LiquidationList />);
    expect(screen.getByText('No Liquidatable Positions Found')).toBeInTheDocument();
  });

  it('shows indexer integration note', () => {
    render(<LiquidationList />);
    expect(screen.getByText(/on-chain indexer/)).toBeInTheDocument();
  });

  it('shows 0 positions count', () => {
    render(<LiquidationList />);
    expect(screen.getByText(/0 positions available/)).toBeInTheDocument();
  });
});
