/**
 * TransactionHistory Component Tests
 * Covers: empty states, filter buttons, header, loading state, error state
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionHistory } from '../TransactionHistory';

// Mock useAuth to control wallet state
const mockAddress = { current: '' };
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    address: mockAddress.current,
  }),
}));

vi.mock('../../config/contracts', () => ({
  VAULT_CONTRACT: {
    testnet: { address: 'ST1TEST', contractName: 'bitflow-vault-core' },
    mainnet: { address: 'SP1TEST', contractName: 'bitflow-vault-core' },
  },
  ACTIVE_NETWORK: 'testnet',
  getApiEndpoint: () => 'https://api.testnet.hiro.so',
  getExplorerUrl: (txId?: string) => txId ? `https://explorer.hiro.so/txid/${txId}?chain=testnet` : 'https://explorer.hiro.so?chain=testnet',
}));

vi.mock('../../utils/formatters', () => ({
  formatSTX: (v: number) => v.toFixed(2),
  formatTimestamp: () => '5 minutes ago',
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Clock: (props: any) => <span data-testid="clock-icon" {...props}>Clock</span>,
  ArrowDownCircle: () => <span>ArrowDown</span>,
  ArrowUpCircle: () => <span>ArrowUp</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  DollarSign: () => <span>DollarSign</span>,
  CheckCircle: () => <span>Check</span>,
  XCircle: (props: any) => <span data-testid="x-icon" {...props}>X</span>,
  Loader: () => <span>Loader</span>,
  ExternalLink: () => <span>Link</span>,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props}>Refresh</span>,
}));

// Mock global fetch
global.fetch = vi.fn();

describe('TransactionHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddress.current = '';
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [] }),
    });
  });

  it('renders the header', () => {
    render(<TransactionHistory />);
    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('shows no-wallet state when disconnected', async () => {
    mockAddress.current = '';
    render(<TransactionHistory />);
    expect(screen.getByText('No Wallet Connected')).toBeInTheDocument();
    expect(screen.getByText('Connect your wallet to view transaction history')).toBeInTheDocument();
  });

  it('renders all filter buttons', () => {
    render(<TransactionHistory />);
    expect(screen.getByText('all')).toBeInTheDocument();
    expect(screen.getByText('deposit')).toBeInTheDocument();
    expect(screen.getByText('withdraw')).toBeInTheDocument();
    expect(screen.getByText('borrow')).toBeInTheDocument();
    expect(screen.getByText('repay')).toBeInTheDocument();
  });

  it('has a refresh button', () => {
    render(<TransactionHistory />);
    expect(screen.getByTitle('Refresh transactions')).toBeInTheDocument();
  });

  it('shows empty state when connected with no transactions', async () => {
    mockAddress.current = 'ST1TESTUSER';
    render(<TransactionHistory />);

    // Wait for fetch to complete
    await screen.findByText('No Transactions');
    expect(screen.getByText(/No vault interactions found/)).toBeInTheDocument();
  });

  it('shows filtered empty state message', async () => {
    const user = userEvent.setup();
    mockAddress.current = 'ST1TESTUSER';
    render(<TransactionHistory />);

    await screen.findByText('No Transactions');

    await user.click(screen.getByText('deposit'));
    expect(screen.getByText(/No deposit transactions found/)).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockAddress.current = 'ST1TESTUSER';
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<TransactionHistory />);
    await screen.findByText('API error: 500');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });
});
