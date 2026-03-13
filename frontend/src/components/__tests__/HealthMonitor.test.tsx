/**
 * HealthMonitor Component Tests
 * Covers: no-loan state, header rendering, deposit display, health status
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HealthMonitor } from '../HealthMonitor';

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: 'ST1TESTADDR',
    userSession: {},
  }),
}));

// Mock useVault to return no active loan by default
vi.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    getUserDeposit: vi.fn().mockResolvedValue(null),
    getUserLoan: vi.fn().mockResolvedValue(null),
    getHealthFactor: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('../../hooks/useSmartPolling', () => ({
  useSmartPolling: vi.fn(),
}));

vi.mock('../../hooks/useStxPrice', () => ({
  useStxPrice: () => ({
    price: 1.50,
    lastUpdated: new Date(),
    isStale: false,
  }),
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
  CheckCircle: (props: any) => <span data-testid="check-icon" className={props.className}>Check</span>,
  XCircle: () => <span data-testid="x-icon">X</span>,
  TrendingDown: () => <span data-testid="trending-down">Trending</span>,
}));

describe('HealthMonitor Component', () => {
  it('renders the Health Monitor header', () => {
    render(<HealthMonitor />);
    expect(screen.getByText('Health Monitor')).toBeInTheDocument();
  });

  it('shows no active position message when no loan', () => {
    render(<HealthMonitor />);
    expect(screen.getByText('No Active Position')).toBeInTheDocument();
  });

  it('shows safe position message when no loan', () => {
    render(<HealthMonitor />);
    expect(screen.getByText(/don't have any active loans/)).toBeInTheDocument();
  });

  it('displays healthy status text when no loan', () => {
    render(<HealthMonitor />);
    expect(screen.getByText('Your position is healthy')).toBeInTheDocument();
  });

  it('shows check icon for healthy state', () => {
    render(<HealthMonitor />);
    expect(screen.getAllByTestId('check-icon').length).toBeGreaterThan(0);
  });
});
