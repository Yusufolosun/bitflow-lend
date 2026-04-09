/**
 * TransactionHistory Component Tests
 * Covers: empty states, filter buttons, header, loading state, error state
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  CONTRACT_VERSIONS: [
    {
      version: '1.0.0',
      address: { testnet: 'ST1TEST', mainnet: 'SP1TEST' },
      contractName: 'bitflow-vault-core',
    },
    {
      version: '2.0.0',
      address: { testnet: 'ST1TEST', mainnet: 'SP1TEST' },
      contractName: 'bitflow-vault-core-v2',
    },
  ],
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
  Clock: (props: { className?: string }) => <span data-testid="clock-icon" className={props.className}>Clock</span>,
  ArrowDownCircle: () => <span>ArrowDown</span>,
  ArrowUpCircle: () => <span>ArrowUp</span>,
  TrendingUp: () => <span>TrendingUp</span>,
  DollarSign: () => <span>DollarSign</span>,
  CheckCircle: () => <span>Check</span>,
  XCircle: (props: { className?: string }) => <span data-testid="x-icon" className={props.className}>X</span>,
  Loader: () => <span>Loader</span>,
  ExternalLink: () => <span>Link</span>,
  RefreshCw: (props: { className?: string }) => <span data-testid="refresh-icon" className={props.className}>Refresh</span>,
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('TransactionHistory Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddress.current = '';
    mockFetch.mockResolvedValue({
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
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<TransactionHistory />);
    await screen.findByText('API error: 500');
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('filters visible transactions using search query', async () => {
    const user = userEvent.setup();
    mockAddress.current = 'ST1TESTUSER';
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        results: [
          {
            tx_id: '0xabc12345ffff',
            tx_type: 'contract_call',
            tx_status: 'success',
            block_height: 100,
            burn_block_time: 1710000000,
            contract_call: {
              contract_id: 'ST1TEST.bitflow-vault-core',
              function_name: 'deposit',
              function_args: [{ hex: '0x01', repr: 'u1000000', name: 'amount', type: 'uint' }],
            },
          },
          {
            tx_id: '0xdef67890ffff',
            tx_type: 'contract_call',
            tx_status: 'success',
            block_height: 101,
            burn_block_time: 1710000100,
            contract_call: {
              contract_id: 'ST1TEST.bitflow-vault-core',
              function_name: 'borrow',
              function_args: [{ hex: '0x02', repr: 'u2000000', name: 'amount', type: 'uint' }],
            },
          },
        ],
      }),
    });

    render(<TransactionHistory />);
    await screen.findByText('Block #100');
    await screen.findByText('Block #101');

    await user.type(screen.getByLabelText('Search transactions'), 'abc12345');

    expect(screen.getByText('0xabc12345...45ffff')).toBeInTheDocument();
    expect(screen.queryByText('0xdef67890...90ffff')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    await waitFor(() => {
      expect(screen.getByText('0xdef67890...90ffff')).toBeInTheDocument();
    });
  });
});
