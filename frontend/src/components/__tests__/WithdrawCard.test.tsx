/**
 * WithdrawCard Component Tests
 * Validates rendering, input validation, max button, and withdrawal flow
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WithdrawCard } from '../WithdrawCard';

// Mock hooks
const mockWithdraw = vi.fn();
const mockGetUserDeposit = vi.fn();
const mockGetUserLoan = vi.fn();
const mockPollTransactionStatus = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    balanceSTX: 100,
    userSession: {},
  }),
}));

vi.mock('../../hooks/useVault', () => ({
  useVault: () => ({
    withdraw: mockWithdraw,
    getUserDeposit: mockGetUserDeposit,
    getUserLoan: mockGetUserLoan,
    pollTransactionStatus: mockPollTransactionStatus,
  }),
}));

vi.mock('../../config/contracts', () => ({
  PROTOCOL_CONSTANTS: {
    MIN_COLLATERAL_RATIO: 150,
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
  },
  getExplorerUrl: (txId: string) => `https://explorer.hiro.so/txid/${txId}`,
}));

vi.mock('lucide-react', () => ({
  ArrowUpCircle: () => <span>ArrowUpCircle</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
}));

describe('WithdrawCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserDeposit.mockResolvedValue({ amountSTX: 50 });
    mockGetUserLoan.mockResolvedValue(null);
    mockWithdraw.mockResolvedValue({ success: true, txId: '0x456' });
    mockPollTransactionStatus.mockResolvedValue('confirmed');
  });

  describe('Rendering', () => {
    it('renders the withdraw card title', () => {
      render(<WithdrawCard />);
      expect(screen.getByRole('heading', { name: /Withdraw STX/i })).toBeInTheDocument();
    });

    it('shows withdraw input field', () => {
      render(<WithdrawCard />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('shows the MAX button', () => {
      render(<WithdrawCard />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('shows withdraw button', () => {
      render(<WithdrawCard />);
      const btn = screen.getByRole('button', { name: /Withdraw STX/i });
      expect(btn).toBeInTheDocument();
    });

    it('shows info text about withdrawals', () => {
      render(<WithdrawCard />);
      expect(screen.getByText(/Only unlocked STX/)).toBeInTheDocument();
    });
  });

  describe('Input Validation', () => {
    it('shows error when amount exceeds available balance', async () => {
      const user = userEvent.setup();
      render(<WithdrawCard />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '999');

      expect(screen.getByText(/Amount exceeds available balance/)).toBeInTheDocument();
    });
  });

  describe('Withdraw Submission', () => {
    it('calls withdraw function with correct amount', async () => {
      const user = userEvent.setup();
      render(<WithdrawCard />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      const submitBtn = screen.getByRole('button', { name: /Withdraw STX/i });
      await user.click(submitBtn);

      expect(mockWithdraw).toHaveBeenCalledWith(10);
    });

    it('shows success message after confirmed withdrawal', async () => {
      mockWithdraw.mockResolvedValue({ success: true, txId: '0xabc' });
      mockPollTransactionStatus.mockResolvedValue('confirmed');

      const user = userEvent.setup();
      render(<WithdrawCard />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '5');

      const submitBtn = screen.getByRole('button', { name: /Withdraw STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Withdrawal successful/)).toBeInTheDocument();
      });
    });

    it('shows error on failed withdrawal', async () => {
      mockWithdraw.mockResolvedValue({ success: false, error: 'Insufficient unlocked balance' });

      const user = userEvent.setup();
      render(<WithdrawCard />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '5');

      const submitBtn = screen.getByRole('button', { name: /Withdraw STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Insufficient unlocked balance')).toBeInTheDocument();
      });
    });

    it('disables submit when no amount entered', () => {
      render(<WithdrawCard />);
      const submitBtn = screen.getByRole('button', { name: /Withdraw STX/i });
      expect(submitBtn).toBeDisabled();
    });
  });
});
