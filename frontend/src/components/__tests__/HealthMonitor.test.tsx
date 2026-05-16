/**
 * HealthMonitor Component Tests
 * Covers: no-loan state, header rendering, deposit display, health status
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthMonitor } from '../HealthMonitor';

const { mockOracleSanityState, mockVaultState } = vi.hoisted(() => ({
  mockOracleSanityState: { current: { warning: false, deviation: 0 } },
  mockVaultState: { 
    deposit: null, 
    loan: null, 
    healthFactor: null 
  },
}));

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: 'ST1TESTADDR',
    userSession: {},
  }),
}));

// Mock useVault
vi.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    getUserDeposit: vi.fn().mockResolvedValue(mockVaultState.deposit),
    getUserLoan: vi.fn().mockResolvedValue(mockVaultState.loan),
    getHealthFactor: vi.fn().mockResolvedValue(mockVaultState.healthFactor),
  }),
}));

vi.mock('../../hooks/useSmartPolling', () => ({
  useSmartPolling: (fn: () => void) => fn(), // Execute immediately for testing
}));

vi.mock('../../hooks/useStxPrice', () => ({
  useStxPrice: () => ({
    price: 1.50,
    lastUpdated: new Date(),
    isStale: false,
  }),
}));

vi.mock('../../hooks/useOracleSanityCheck', () => ({
  useOracleSanityCheck: () => mockOracleSanityState.current,
}));

vi.mock('../../utils/formatters', () => ({
  formatSTX: (v: number) => v.toFixed(2),
}));

vi.mock('../../utils/calculations', () => ({
  getHealthStatus: (hf: number) => {
    if (hf >= 150) return 'healthy';
    if (hf >= 110) return 'warning';
    return 'critical';
  },
}));

vi.mock('../../config/contracts', () => ({
  PROTOCOL_CONSTANTS: {
    MIN_COLLATERAL_RATIO: 150,
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
    BLOCKS_PER_YEAR: 52560,
    BLOCK_TIME_MINUTES: 10,
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  CheckCircle: (props: { className?: string }) => <span data-testid="check-icon" className={props.className}>Check</span>,
  XCircle: () => <span data-testid="x-icon">X</span>,
  TrendingDown: () => <span data-testid="trending-down">Trending</span>,
}));

describe('HealthMonitor Component', () => {
  it('renders the Health Monitor header', () => {
    render(<HealthMonitor />);
    expect(screen.getByText('Health Monitor')).toBeInTheDocument();
  });

  it('shows no active position message when no loan', () => {
    mockVaultState.loan = null;
    render(<HealthMonitor />);
    expect(screen.getByText('No Active Position')).toBeInTheDocument();
  });

  it('shows the health factor display when a loan is active', async () => {
    mockVaultState.loan = {
      amountSTX: 100,
      collateralAmountSTX: 150,
      status: 'active',
      termEnd: 1000,
      interestRatePercent: 5,
      startTimestamp: Date.now() / 1000,
    };
    mockVaultState.healthFactor = {
      healthFactorPercent: 150,
      collateralValueUSD: 225,
      debtValueUSD: 150,
      stxPriceUSD: 1.5,
    };

    render(<HealthMonitor />);
    
    // Check if the specialized HealthFactorDisplay is rendered
    expect(screen.getByTestId('hf-display-healthy')).toBeInTheDocument();
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('shows the oracle sanity warning banner when the price diverges', () => {
    mockOracleSanityState.current = {
      warning: true,
      deviation: 0.12,
    };

    render(<HealthMonitor />);

    expect(screen.getByText('Oracle Price Sanity Warning')).toBeInTheDocument();
    expect(screen.getByText(/12.0%/)).toBeInTheDocument();
  });
});
