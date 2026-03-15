/**
 * Dashboard Component Tests
 * Task 3.1 - Tests rendering, stats display, conditional sections, and error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../Dashboard';

// Mock all child components to isolate Dashboard logic
vi.mock('../StatsCard', () => ({
  StatsCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stats-card-${label}`}>{label}: {value}</div>
  ),
}));

vi.mock('../WalletConnect', () => ({
  WalletConnect: () => <div data-testid="wallet-connect">WalletConnect</div>,
}));

vi.mock('../DepositCard', () => ({
  DepositCard: () => <div data-testid="deposit-card">DepositCard</div>,
}));

vi.mock('../BorrowCard', () => ({
  BorrowCard: () => <div data-testid="borrow-card">BorrowCard</div>,
}));

vi.mock('../RepayCard', () => ({
  RepayCard: () => <div data-testid="repay-card">RepayCard</div>,
}));

vi.mock('../HealthMonitor', () => ({
  HealthMonitor: () => <div data-testid="health-monitor">HealthMonitor</div>,
}));

vi.mock('../TransactionHistory', () => ({
  TransactionHistory: () => <div data-testid="tx-history">TransactionHistory</div>,
}));

vi.mock('../NetworkIndicator', () => ({
  NetworkIndicator: () => <div data-testid="network-indicator">Network</div>,
}));

vi.mock('../LoadingCard', () => ({
  LoadingStats: () => <div data-testid="loading-stats">Loading...</div>,
}));

vi.mock('../ErrorState', () => ({
  ErrorState: ({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) => (
    <div data-testid="error-state">
      <span>{title}</span>
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock hooks
const mockUseAuth = vi.fn();
const mockUseVault = vi.fn();
const mockUseProtocolStats = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../hooks/useVault', () => ({
  useVault: () => mockUseVault(),
}));

vi.mock('../../hooks/useProtocolStats', () => ({
  useProtocolStats: () => mockUseProtocolStats(),
}));

vi.mock('../../hooks/useStxPrice', () => ({
  useStxPrice: () => ({
    price: 1.5,
    isLoading: false,
    error: null,
    isStale: false,
    lastUpdated: new Date(),
    refresh: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSmartPolling', () => ({
  useSmartPolling: vi.fn(),
}));

vi.mock('../../utils/formatters', () => ({
  formatSTX: (amount: number) => amount.toFixed(2),
}));

vi.mock('../../config/contracts', () => ({
  ACTIVE_NETWORK: 'testnet',
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span>TrendingUp</span>,
  DollarSign: () => <span>DollarSign</span>,
  Activity: () => <span>Activity</span>,
  Users: () => <span>Users</span>,
  Layers: () => <span>Layers</span>,
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: disconnected wallet
    mockUseAuth.mockReturnValue({
      address: null,
      balanceSTX: 0,
      userSession: {},
    });

    mockUseVault.mockReturnValue({
      getUserDeposit: vi.fn().mockResolvedValue(null),
      getUserLoan: vi.fn().mockResolvedValue(null),
      getHealthFactor: vi.fn().mockResolvedValue(null),
    });

    mockUseProtocolStats.mockReturnValue({
      stats: {
        totalDeposits: 100000,
        totalBorrowed: 50000,
        totalRepaid: 10000,
        activeLoans: 5,
        totalLiquidations: 2,
      },
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: vi.fn(),
    });
  });

  describe('Header', () => {
    it('renders the app logo', () => {
      render(<Dashboard />);
      expect(screen.getByAltText('BitFlow Lend')).toBeInTheDocument();
    });

    it('renders the protocol overview section', () => {
      render(<Dashboard />);
      expect(screen.getByText('Protocol Overview')).toBeInTheDocument();
    });

    it('renders the wallet connect component', () => {
      render(<Dashboard />);
      const walletConnects = screen.getAllByTestId('wallet-connect');
      expect(walletConnects.length).toBeGreaterThanOrEqual(1);
    });

    it('renders the network indicator', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('network-indicator')).toBeInTheDocument();
    });
  });

  describe('Protocol Stats (disconnected)', () => {
    it('displays protocol stats when data is loaded', () => {
      render(<Dashboard />);
      expect(screen.getByText('Protocol Overview')).toBeInTheDocument();
    });

    it('displays total value locked', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('stats-card-Total Value Locked')).toBeInTheDocument();
    });

    it('displays total borrowed', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('stats-card-Total Borrowed')).toBeInTheDocument();
    });

    it('displays utilization rate', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('stats-card-Utilization Rate')).toBeInTheDocument();
    });

    it('displays active loans', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('stats-card-Active Loans')).toBeInTheDocument();
    });

    it('shows loading state when stats are loading', () => {
      mockUseProtocolStats.mockReturnValue({
        stats: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
        refresh: vi.fn(),
      });
      render(<Dashboard />);
      expect(screen.getByTestId('loading-stats')).toBeInTheDocument();
    });

    it('shows error state when stats fail to load', () => {
      mockUseProtocolStats.mockReturnValue({
        stats: null,
        isLoading: false,
        error: 'Network error',
        lastUpdated: null,
        refresh: vi.fn(),
      });
      render(<Dashboard />);
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    it('calculates utilization rate correctly', () => {
      render(<Dashboard />);
      // TVL=100000, Borrowed=50000 => utilization = 50.0%
      expect(screen.getByTestId('stats-card-Utilization Rate')).toHaveTextContent('50.0%');
    });
  });

  describe('Disconnected State', () => {
    it('shows welcome section when wallet is not connected', () => {
      render(<Dashboard />);
      expect(screen.getByText(/Welcome to/)).toBeInTheDocument();
      expect(screen.getByText(/BitFlow/)).toBeInTheDocument();
    });

    it('does not show user portfolio when disconnected', () => {
      render(<Dashboard />);
      expect(screen.queryByText('Your Portfolio')).not.toBeInTheDocument();
    });

    it('does not show action cards when disconnected', () => {
      render(<Dashboard />);
      expect(screen.queryByTestId('deposit-card')).not.toBeInTheDocument();
      expect(screen.queryByTestId('borrow-card')).not.toBeInTheDocument();
    });

    it('does not show transaction history when disconnected', () => {
      render(<Dashboard />);
      expect(screen.queryByTestId('tx-history')).not.toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        balanceSTX: 1000,
        userSession: {},
      });
    });

    it('shows user portfolio when connected', () => {
      render(<Dashboard />);
      expect(screen.getByText('Your Portfolio')).toBeInTheDocument();
    });

    it('displays deposit card', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('deposit-card')).toBeInTheDocument();
    });

    it('displays borrow card', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('borrow-card')).toBeInTheDocument();
    });

    it('displays repay card', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('repay-card')).toBeInTheDocument();
    });

    it('displays health monitor', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('health-monitor')).toBeInTheDocument();
    });

    it('displays transaction history', () => {
      render(<Dashboard />);
      expect(screen.getByTestId('tx-history')).toBeInTheDocument();
    });

    it('does not show welcome section when connected', () => {
      render(<Dashboard />);
      expect(screen.queryByText(/Welcome to/)).not.toBeInTheDocument();
    });

    it('shows total deposited in portfolio', () => {
      render(<Dashboard />);
      expect(screen.getByText('Total Deposited')).toBeInTheDocument();
    });

    it('shows active loan in portfolio', () => {
      render(<Dashboard />);
      expect(screen.getByText('Active Loan')).toBeInTheDocument();
    });

    it('shows health factor in portfolio', () => {
      render(<Dashboard />);
      expect(screen.getByText('Health Factor')).toBeInTheDocument();
    });

    it('displays refresh data button', () => {
      render(<Dashboard />);
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });
  });

  describe('Footer', () => {
    it('renders copyright text', () => {
      render(<Dashboard />);
      expect(screen.getByText(/2026 BitFlow Lend/)).toBeInTheDocument();
    });

    it('renders navigation links', () => {
      render(<Dashboard />);
      expect(screen.getByText('Docs')).toBeInTheDocument();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Discord')).toBeInTheDocument();
      expect(screen.getByText('Twitter')).toBeInTheDocument();
    });
  });

  describe('Refresh Stats', () => {
    it('calls refresh function when stats button is clicked', () => {
      const refreshFn = vi.fn();
      mockUseProtocolStats.mockReturnValue({
        stats: { totalDeposits: 100, totalBorrowed: 50, totalRepaid: 10, activeLoans: 1 },
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        refresh: refreshFn,
      });

      render(<Dashboard />);
      const refreshBtn = screen.getByText('Refresh Stats');
      fireEvent.click(refreshBtn);
      expect(refreshFn).toHaveBeenCalledOnce();
    });
  });

  describe('Zero TVL Edge Case', () => {
    it('handles zero TVL without division errors', () => {
      mockUseProtocolStats.mockReturnValue({
        stats: { totalDeposits: 0, totalBorrowed: 0, totalRepaid: 0, activeLoans: 0, totalLiquidations: 0 },
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
        refresh: vi.fn(),
      });

      render(<Dashboard />);
      // Utilization rate should be 0.0% when TVL is 0
      expect(screen.getByTestId('stats-card-Utilization Rate')).toHaveTextContent('0.0%');
    });
  });
});
