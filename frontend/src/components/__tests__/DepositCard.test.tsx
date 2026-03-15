/**
 * DepositCard Component Tests
 * Task 3.2 - Input validation, max button, submit states, status messages
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DepositCard } from '../DepositCard';

// Mock hooks
const mockDeposit = vi.fn();
const mockGetUserDeposit = vi.fn();
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
    deposit: mockDeposit,
    getUserDeposit: mockGetUserDeposit,
    pollTransactionStatus: mockPollTransactionStatus,
  }),
}));

vi.mock('../../types/vault', () => ({
  formatSTX: (amount: number) => amount.toFixed(2),
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
  ArrowDownCircle: () => <span>ArrowDownCircle</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  ExternalLink: () => <span>ExternalLink</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
}));

describe('DepositCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserDeposit.mockResolvedValue({ amountSTX: 50 });
    mockDeposit.mockResolvedValue({ success: true, txId: '0x123' });
    mockPollTransactionStatus.mockResolvedValue('confirmed');
  });

  describe('Rendering', () => {
    it('renders the deposit card title', () => {
      render(<DepositCard />);
      expect(screen.getByRole('heading', { name: /Deposit STX/i })).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      render(<DepositCard />);
      expect(screen.getByText('Deposit to earn and borrow')).toBeInTheDocument();
    });

    it('shows deposit input field', () => {
      render(<DepositCard />);
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('shows the MAX button', () => {
      render(<DepositCard />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('shows available balance', () => {
      render(<DepositCard />);
      expect(screen.getByText(/Available:/)).toBeInTheDocument();
    });

    it('shows deposit button', () => {
      render(<DepositCard />);
      const btn = screen.getByRole('button', { name: /Deposit STX/i });
      expect(btn).toBeInTheDocument();
    });

    it('shows info text about deposits', () => {
      render(<DepositCard />);
      expect(screen.getByText(/Deposits can be withdrawn anytime/)).toBeInTheDocument();
    });
  });

  describe('Input Validation Warnings', () => {
    it('shows warning for amounts below minimum', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '0.005');
      
      expect(screen.getByText('Minimum deposit is 0.01 STX')).toBeInTheDocument();
    });

    it('shows error when amount exceeds balance', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '200');
      
      expect(screen.getByText(/Amount exceeds your available balance/)).toBeInTheDocument();
    });

    it('shows fee warning when leaving less than 0.1 STX', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '99.95');
      
      expect(screen.getByText(/Keep at least 0.1 STX for transaction fees/)).toBeInTheDocument();
    });

    it('shows max borrow info for valid deposits', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');
      
      expect(screen.getByText(/Max borrow after deposit/)).toBeInTheDocument();
    });
  });

  describe('MAX Button', () => {
    it('sets input to balance minus 0.1 STX for fees', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      await user.click(screen.getByText('MAX'));
      
      const input = screen.getByPlaceholderText('0.00') as HTMLInputElement;
      expect(parseFloat(input.value)).toBeCloseTo(99.9, 1);
    });
  });

  describe('Deposit Submission', () => {
    it('calls deposit function with correct amount', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');
      
      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);
      
      expect(mockDeposit).toHaveBeenCalledWith(10);
    });

    it('disables submit button when amount is empty', () => {
      render(<DepositCard />);
      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      expect(submitBtn).toBeDisabled();
    });

    it('shows error when depositing more than balance', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '500');

      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Insufficient balance/)).toBeInTheDocument();
      });
    });

    it('shows pending state during deposit', async () => {
      // Make deposit hang
      mockDeposit.mockReturnValue(new Promise(() => {}));
      
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');
      
      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByText('Depositing...')).toBeInTheDocument();
      });
    });

    it('shows success message after confirmed deposit', async () => {
      mockDeposit.mockResolvedValue({ success: true, txId: '0xabc123' });
      mockPollTransactionStatus.mockResolvedValue('confirmed');
      mockGetUserDeposit.mockResolvedValue({ amountSTX: 60 });

      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Deposit successful/)).toBeInTheDocument();
      });
    });

    it('shows error message when deposit fails', async () => {
      mockDeposit.mockResolvedValue({ success: false, error: 'Contract execution failed' });
      
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Contract execution failed')).toBeInTheDocument();
      });
    });

    it('shows warning when transaction times out', async () => {
      mockDeposit.mockResolvedValue({ success: true, txId: '0xabc' });
      mockPollTransactionStatus.mockResolvedValue('timeout');

      const user = userEvent.setup();
      render(<DepositCard />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Transaction still processing/)).toBeInTheDocument();
      });
    });

    it('handles thrown errors gracefully', async () => {
      mockDeposit.mockRejectedValue(new Error('Network failure'));
      
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '10');

      const submitBtn = screen.getByRole('button', { name: /Deposit STX/i });
      await user.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Network failure')).toBeInTheDocument();
      });
    });
  });

  describe('New Total Display', () => {
    it('shows new total when entering an amount', async () => {
      const user = userEvent.setup();
      render(<DepositCard />);
      
      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '25');

      await waitFor(() => {
        expect(screen.getByText(/New Total:/)).toBeInTheDocument();
      });
    });
  });
});
