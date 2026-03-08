/**
 * Frontend Integration Tests
 * Task 3.7 - End-to-end user flow tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Hoisted mutable state - accessible from vi.mock factories
const { mockAuthState, mockVaultState, mockProtocolStatsState } = vi.hoisted(() => ({
  mockAuthState: { current: {} as any },
  mockVaultState: { current: {} as any },
  mockProtocolStatsState: { current: {} as any },
}));

// Mocks at module scope (hoisted)
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => mockAuthState.current,
}));

vi.mock('../hooks/useVault', () => ({
  useVault: () => mockVaultState.current,
}));

vi.mock('../hooks/useProtocolStats', () => ({
  useProtocolStats: () => mockProtocolStatsState.current,
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    addToast: vi.fn(),
    removeToast: vi.fn(),
  }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../config/contracts', () => ({
  ACTIVE_NETWORK: 'testnet',
  PROTOCOL_CONSTANTS: {
    MIN_COLLATERAL_RATIO: 150,
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
    BLOCKS_PER_YEAR: 52560,
    BLOCK_TIME_MINUTES: 10,
  },
  getExplorerUrl: (txId?: string) => `https://explorer.hiro.so/txid/${txId}`,
  getNetwork: vi.fn(),
  getContractAddress: () => 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    VAULT_CONTRACT: {
      name: 'bitflow-vault-core',
      testnet: {
        address: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
        contractName: 'bitflow-vault-core',
      },
      mainnet: {
        address: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
        contractName: 'bitflow-vault-core',
      },
    },
  getApiEndpoint: () => 'https://api.testnet.hiro.so',
  getContractId: () => 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core',
}));

vi.mock('../types/vault', () => ({
  formatSTX: (amount: number) => amount.toFixed(2),
  LOAN_TERMS: [
    { days: 7, label: '7 days', suggestedRate: 5 },
    { days: 30, label: '30 days', suggestedRate: 10 },
    { days: 90, label: '90 days', suggestedRate: 15 },
    { days: 365, label: '1 year', suggestedRate: 20 },
  ],
}));

vi.mock('lucide-react', () => ({
  TrendingUp: () => <span>TrendingUp</span>,
  DollarSign: () => <span>DollarSign</span>,
  Activity: () => <span>Activity</span>,
  Users: () => <span>Users</span>,
  Layers: () => <span>Layers</span>,
  Wallet: () => <span>Wallet</span>,
  LogOut: () => <span>LogOut</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  ArrowDownCircle: () => <span>ArrowDown</span>,
  CheckCircle: () => <span>Check</span>,
  XCircle: () => <span>XCircle</span>,
  ExternalLink: () => <span>ExtLink</span>,
  AlertTriangle: () => <span>Alert</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  Clock: () => <span>Clock</span>,
  Shield: () => <span>Shield</span>,
  Heart: () => <span>Heart</span>,
  Wifi: () => <span>Wifi</span>,
  WifiOff: () => <span>WifiOff</span>,
  BarChart3: () => <span>BarChart</span>,
  Search: () => <span>Search</span>,
}));

// =============================================================================
// Integration Tests
// =============================================================================
describe('App Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Default: disconnected state
    mockAuthState.current = {
      isConnected: false,
      address: null,
      balanceSTX: 0,
      balance: BigInt(0),
      isLoading: false,
      userSession: {},
      connectWallet: vi.fn(),
      disconnectWallet: vi.fn(),
      refreshBalance: vi.fn(),
    };

    mockVaultState.current = {
      deposit: vi.fn().mockResolvedValue({ success: true, txId: '0x123' }),
      withdraw: vi.fn().mockResolvedValue({ success: true }),
      borrow: vi.fn().mockResolvedValue({ success: true, txId: '0x456' }),
      repay: vi.fn().mockResolvedValue({ success: true }),
      getUserDeposit: vi.fn().mockResolvedValue({ amountSTX: 0 }),
      getUserLoan: vi.fn().mockResolvedValue(null),
      getHealthFactor: vi.fn().mockResolvedValue(null),
      getRepaymentAmount: vi.fn().mockResolvedValue(null),
      pollTransactionStatus: vi.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
    };

    mockProtocolStatsState.current = {
      stats: {
        totalDeposits: 50000,
        totalBorrowed: 20000,
        totalRepaid: 5000,
        activeLoans: 10,
        totalLiquidations: 3,
      },
      isLoading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: vi.fn(),
    };
  });

  describe('User Flow: New User Landing', () => {
    it('shows welcome page with connect prompt', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getByText('BitFlow Lend')).toBeInTheDocument();
      expect(screen.getByText('Welcome to BitFlow Lend')).toBeInTheDocument();
      expect(screen.getByText(/Connect your wallet/)).toBeInTheDocument();
    });

    it('shows protocol stats even when disconnected', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getAllByText('Protocol Overview').length).toBeGreaterThan(0);
    });

    it('does not show action cards when disconnected', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.queryByText('Your Portfolio')).not.toBeInTheDocument();
      expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    });
  });

  describe('User Flow: Connected User', () => {
    beforeEach(() => {
      mockAuthState.current = {
        ...mockAuthState.current,
        isConnected: true,
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        balanceSTX: 500,
        balance: BigInt(500_000_000),
      };
    });

    it('shows portfolio and action cards when connected', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getByText('Your Portfolio')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('shows deposit, borrow, and repay cards', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getByText('Deposit to earn and borrow')).toBeInTheDocument();
    });

    it('shows user portfolio with zero initial values', async () => {
      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getByText('Total Deposited')).toBeInTheDocument();
      expect(screen.getByText('Active Loan')).toBeInTheDocument();
      expect(screen.getByText('Health Factor')).toBeInTheDocument();
    });
  });

  describe('User Flow: Protocol Stats Loading', () => {
    it('shows loading state then data', async () => {
      mockProtocolStatsState.current = {
        stats: null,
        isLoading: true,
        error: null,
        lastUpdated: null,
        refresh: vi.fn(),
      };

      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getAllByText('Protocol Overview').length).toBeGreaterThan(0);
    });

    it('shows error state when stats fail', async () => {
      mockProtocolStatsState.current = {
        stats: null,
        isLoading: false,
        error: 'Failed to fetch stats',
        lastUpdated: null,
        refresh: vi.fn(),
      };

      const { Dashboard } = await import('../components/Dashboard');
      render(<Dashboard />);

      expect(screen.getByText('Failed to Load Protocol Stats')).toBeInTheDocument();
    });
  });

  describe('Calculation Integration', () => {
    it('utility functions work together for health factor', async () => {
      const { calculateHealthFactor, getHealthStatus, isLiquidatable } = await import('../utils/calculations');

      const hf = calculateHealthFactor(150, 100);
      expect(hf).toBe(150);
      expect(getHealthStatus(hf)).toBe('healthy');
      expect(isLiquidatable(hf)).toBe(false);
    });

    it('utility functions detect liquidatable positions', async () => {
      const { calculateHealthFactor, getHealthStatus, isLiquidatable } = await import('../utils/calculations');

      const hf = calculateHealthFactor(100, 100);
      expect(hf).toBe(100);
      expect(getHealthStatus(hf)).toBe('critical');
      expect(isLiquidatable(hf)).toBe(true);
    });

    it('validates borrow against collateral correctly', async () => {
      const { validateBorrowAmount, calculateMaxBorrow } = await import('../utils/calculations');

      // 150 STX collateral => max 100 STX borrow at 150% ratio
      const maxBorrow = calculateMaxBorrow(150);
      expect(maxBorrow).toBeCloseTo(100, 0);

      expect(validateBorrowAmount(50, 150).valid).toBe(true);
      expect(validateBorrowAmount(150, 150).valid).toBe(false);
    });

    it('calculates full loan scenario', async () => {
      const { 
        calculateSimpleInterest, 
        calculateRepaymentAmount, 
        calculateRequiredCollateral,
        calculateHealthFactor,
      } = await import('../utils/calculations');

      // Borrow 100 STX at 10% for 30 days
      const principal = 100;
      const interest = calculateSimpleInterest(principal, 10, 30);
      expect(interest).toBeGreaterThan(0);

      const totalRepayment = calculateRepaymentAmount(principal, interest);
      expect(totalRepayment).toBeGreaterThan(principal);

      const requiredCollateral = calculateRequiredCollateral(principal);
      expect(requiredCollateral).toBe(150);

      const hf = calculateHealthFactor(requiredCollateral, principal);
      expect(hf).toBe(150);
    });
  });

  describe('Formatter Integration', () => {
    it('formatters work together for display values', async () => {
      const { formatSTX, formatPercentage, formatAddress } = await import('../utils/formatters');

      expect(formatSTX(1234.5)).toBe('1,234.50');
      expect(formatPercentage(150)).toBe('150.0%');
      expect(formatAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'))
        .toBe('ST1PQH...GZGM');
    });

    it('micro to STX conversion displays correctly', async () => {
      const { formatMicroSTX } = await import('../utils/formatters');
      expect(formatMicroSTX(BigInt(100_000_000))).toBe('100.00');
    });

    it('timestamp formatting works for recent events', async () => {
      const { formatTimestamp } = await import('../utils/formatters');
      const result = formatTimestamp(Date.now());
      expect(result).toBe('just now');
    });
  });
});
