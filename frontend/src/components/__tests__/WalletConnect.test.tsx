/**
 * WalletConnect Component Tests
 * Task 3.5 - Connection flow, address display, balance display, disconnect
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletConnect } from '../WalletConnect';

// Mock hooks
const mockConnectWallet = vi.fn();
const mockDisconnectWallet = vi.fn();
const mockRefreshBalance = vi.fn();

const mockUseAuth = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock ToastProvider (WalletConnect uses useToastContext)
vi.mock('../ToastProvider', () => ({
  useToastContext: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Wallet: () => <span data-testid="wallet-icon">Wallet</span>,
  LogOut: () => <span data-testid="logout-icon">LogOut</span>,
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
}));

describe('WalletConnect Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshBalance.mockResolvedValue(undefined);
  });

  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      mockUseAuth.mockReturnValue({
        isConnected: false,
        address: null,
        balanceSTX: 0,
        isLoading: true,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });

      render(<WalletConnect />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('does not show connect button when loading', () => {
      mockUseAuth.mockReturnValue({
        isConnected: false,
        address: null,
        balanceSTX: 0,
        isLoading: true,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });

      render(<WalletConnect />);
      expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isConnected: false,
        address: null,
        balanceSTX: 0,
        isLoading: false,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });
    });

    it('shows connect wallet button', () => {
      render(<WalletConnect />);
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('shows wallet icon on connect button', () => {
      render(<WalletConnect />);
      expect(screen.getByTestId('wallet-icon')).toBeInTheDocument();
    });

    it('calls connectWallet when button is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect />);
      
      await user.click(screen.getByText('Connect Wallet'));
      expect(mockConnectWallet).toHaveBeenCalledOnce();
    });

    it('does not show balance or address', () => {
      render(<WalletConnect />);
      expect(screen.queryByText('Balance')).not.toBeInTheDocument();
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('does not show disconnect button', () => {
      render(<WalletConnect />);
      expect(screen.queryByText('Disconnect')).not.toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        isConnected: true,
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        balanceSTX: 1234.56,
        isLoading: false,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });
    });

    it('shows balance display', () => {
      render(<WalletConnect />);
      expect(screen.getByText('Balance')).toBeInTheDocument();
    });

    it('formats balance correctly', () => {
      render(<WalletConnect />);
      expect(screen.getByText(/1,234\.56 STX/)).toBeInTheDocument();
    });

    it('shows shortened address', () => {
      render(<WalletConnect />);
      // ST1PQH...GZGM (6 start, 4 end)
      expect(screen.getByText('ST1PQH...GZGM')).toBeInTheDocument();
    });

    it('shows connected label', () => {
      render(<WalletConnect />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('shows disconnect button', () => {
      render(<WalletConnect />);
      expect(screen.getByText('Disconnect')).toBeInTheDocument();
    });

    it('calls disconnectWallet when disconnect is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect />);
      
      await user.click(screen.getByText('Disconnect'));
      expect(mockDisconnectWallet).toHaveBeenCalledOnce();
    });

    it('does not show connect wallet button when connected', () => {
      render(<WalletConnect />);
      expect(screen.queryByText('Connect Wallet')).not.toBeInTheDocument();
    });

    it('shows refresh balance button', () => {
      render(<WalletConnect />);
      expect(screen.getByTitle('Refresh Balance')).toBeInTheDocument();
    });

    it('calls refreshBalance when refresh is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect />);
      
      await user.click(screen.getByTitle('Refresh Balance'));
      
      await waitFor(() => {
        expect(mockRefreshBalance).toHaveBeenCalled();
      });
    });
  });

  describe('Address Formatting', () => {
    it('truncates any address to 6+4 format', () => {
      mockUseAuth.mockReturnValue({
        isConnected: true,
        address: 'ST1ABCDEF',
        balanceSTX: 0,
        isLoading: false,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });

      render(<WalletConnect />);
      // Always formats: first 6 + ... + last 4
      expect(screen.getByText('ST1ABC...CDEF')).toBeInTheDocument();
    });

    it('formats zero balance', () => {
      mockUseAuth.mockReturnValue({
        isConnected: true,
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        balanceSTX: 0,
        isLoading: false,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });

      render(<WalletConnect />);
      expect(screen.getByText(/0\.00 STX/)).toBeInTheDocument();
    });

    it('formats large balance with commas', () => {
      mockUseAuth.mockReturnValue({
        isConnected: true,
        address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
        balanceSTX: 1000000,
        isLoading: false,
        connectWallet: mockConnectWallet,
        disconnectWallet: mockDisconnectWallet,
        refreshBalance: mockRefreshBalance,
      });

      render(<WalletConnect />);
      expect(screen.getByText(/1,000,000\.00 STX/)).toBeInTheDocument();
    });
  });
});
