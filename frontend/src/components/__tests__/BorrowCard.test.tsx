/**
 * BorrowCard Component Tests
 * Task 3.3 - Collateral check, health factor preview, interest preview, loan term selection
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BorrowCard } from '../BorrowCard';

// Mock hooks
const mockBorrow = vi.fn();
const mockGetUserDeposit = vi.fn();
const mockGetUserLoan = vi.fn();
const mockPollTransactionStatus = vi.fn();
const mockRefreshBalance = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    userSession: {},
    refreshBalance: mockRefreshBalance,
  }),
}));

vi.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    borrow: mockBorrow,
    getUserDeposit: mockGetUserDeposit,
    getUserLoan: mockGetUserLoan,
    pollTransactionStatus: mockPollTransactionStatus,
  }),
}));

vi.mock('../../types/vault', () => ({
  formatSTX: (amount: number) => amount.toFixed(2),
  LOAN_TERMS: [
    { days: 7, label: '7 days', suggestedRate: 5 },
    { days: 30, label: '30 days', suggestedRate: 10 },
    { days: 90, label: '90 days', suggestedRate: 15 },
    { days: 365, label: '1 year', suggestedRate: 20 },
  ],
}));

vi.mock('../../config/contracts', () => ({
  PROTOCOL_CONSTANTS: {
    MIN_COLLATERAL_RATIO: 150,
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
  },
  getExplorerUrl: (txId: string) => `https://explorer.hiro.so/txid/${txId}`,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  TrendingUp: () => <span>TrendingUp</span>,
  AlertCircle: () => <span>AlertCircle</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  ExternalLink: () => <span>ExternalLink</span>,
}));

describe('BorrowCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserDeposit.mockResolvedValue({ amountSTX: 150 });
    mockGetUserLoan.mockResolvedValue(null); // No active loan
    mockBorrow.mockResolvedValue({ success: true, txId: '0x123' });
    mockPollTransactionStatus.mockResolvedValue('confirmed');
  });

  describe('Rendering (no active loan)', () => {
    it('renders the borrow card title', () => {
      render(<BorrowCard />);
      expect(screen.getByRole('heading', { name: /Borrow STX/i })).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      render(<BorrowCard />);
      expect(screen.getByText('Borrow against your collateral')).toBeInTheDocument();
    });

    it('shows borrow amount input', () => {
      render(<BorrowCard />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('shows interest rate slider', () => {
      render(<BorrowCard />);
      expect(screen.getByText('Interest Rate (APR)')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument(); // default rate
    });

    it('shows loan term selection', () => {
      render(<BorrowCard />);
      expect(screen.getByText('Loan Term')).toBeInTheDocument();
      expect(screen.getByText('7 days')).toBeInTheDocument();
      expect(screen.getByText('30 days')).toBeInTheDocument();
      expect(screen.getByText('90 days')).toBeInTheDocument();
      expect(screen.getByText('1 year')).toBeInTheDocument();
    });

    it('shows available collateral display', () => {
      render(<BorrowCard />);
      expect(screen.getByText('Available Collateral')).toBeInTheDocument();
    });

    it('shows MAX button', () => {
      render(<BorrowCard />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('shows borrow button', () => {
      render(<BorrowCard />);
      const btn = screen.getByRole('button', { name: /Borrow STX/i });
      expect(btn).toBeInTheDocument();
    });

    it('shows collateral ratio info', () => {
      render(<BorrowCard />);
      expect(screen.getByText(/150% collateralization required/)).toBeInTheDocument();
    });
  });

  describe('Active Loan State', () => {
    beforeEach(() => {
      mockGetUserLoan.mockResolvedValue({
        amountSTX: 50,
        interestRatePercent: 10,
        collateralAmountSTX: 75,
      });
    });

    it('shows active loan info when loan exists', async () => {
      render(<BorrowCard />);
      await waitFor(() => {
        expect(screen.getByText('Active Loan')).toBeInTheDocument();
      });
    });

    it('shows repay-first message', async () => {
      render(<BorrowCard />);
      await waitFor(() => {
        expect(screen.getByText(/repay your current loan before borrowing again/)).toBeInTheDocument();
      });
    });
  });

  describe('Loan Summary', () => {
    it('shows loan summary when amount is entered', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      expect(screen.getByText('Loan Summary')).toBeInTheDocument();
    });

    it('shows required collateral in summary', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      expect(screen.getByText('Required Collateral:')).toBeInTheDocument();
    });

    it('shows estimated interest in summary', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      expect(screen.getByText('Estimated Interest:')).toBeInTheDocument();
    });

    it('shows total repayment in summary', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      expect(screen.getByText('Total Repayment:')).toBeInTheDocument();
    });
  });

  describe('Collateral Validation', () => {
    it('shows insufficient collateral warning', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      // With 150 STX deposit and 150% ratio, max = 100 STX
      // 200 STX would require 300 STX collateral
      await user.type(input, '200');

      expect(screen.getByText(/more STX deposited as collateral/)).toBeInTheDocument();
    });
  });

  describe('Loan Term Selection', () => {
    it('highlights selected loan term', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const term7 = screen.getByText('7 days');
      await user.click(term7);
      
      expect(term7.closest('button')).toHaveClass('bg-emerald-600');
    });

    it('30 days is selected by default', () => {
      render(<BorrowCard />);
      const term30 = screen.getByText('30 days');
      expect(term30.closest('button')).toHaveClass('bg-emerald-600');
    });
  });

  describe('Interest Rate Slider', () => {
    it('shows default 10% interest rate', () => {
      render(<BorrowCard />);
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('updates rate when slider changes', async () => {
      render(<BorrowCard />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '20' } });
      expect(screen.getByText('20%')).toBeInTheDocument();
    });
  });

  describe('Borrow Submission', () => {
    it('calls borrow with correct parameters', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');
      
      const submitBtn = screen.getByRole('button', { name: /Borrow STX/i });
      await user.click(submitBtn);

      expect(mockBorrow).toHaveBeenCalledWith(50, 10, 30);
    });

    it('shows pending state during borrow', async () => {
      mockBorrow.mockReturnValue(new Promise(() => {}));
      
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');
      
      const submitBtn = screen.getByRole('button', { name: /Borrow STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Borrowing...')).toBeInTheDocument();
      });
    });

    it('shows success message after confirmed borrow', async () => {
      mockBorrow.mockResolvedValue({ success: true, txId: '0xabc' });
      mockPollTransactionStatus.mockResolvedValue('confirmed');

      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      const submitBtn = screen.getByRole('button', { name: /Borrow STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Loan created successfully/)).toBeInTheDocument();
      });
    });

    it('shows error message when borrow fails', async () => {
      mockBorrow.mockResolvedValue({ success: false, error: 'Insufficient collateral' });
      
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '50');

      const submitBtn = screen.getByRole('button', { name: /Borrow STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Insufficient collateral')).toBeInTheDocument();
      });
    });

    it('disables borrow when no deposit', () => {
      mockGetUserDeposit.mockResolvedValue({ amountSTX: 0 });
      render(<BorrowCard />);
      const submitBtn = screen.getByRole('button', { name: /Borrow STX/i });
      expect(submitBtn).toBeDisabled();
    });
  });

  describe('MAX Button', () => {
    it('sets amount to max borrowable', async () => {
      const user = userEvent.setup();
      render(<BorrowCard />);
      
      await user.click(screen.getByText('MAX'));
      
      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      // 150 deposit / 1.5 ratio = 100 max borrow
      expect(parseFloat(input.value)).toBeCloseTo(100, 0);
    });
  });
});
