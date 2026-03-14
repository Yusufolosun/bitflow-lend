/**
 * Toast Component Tests
 * Covers: toast types, dismiss, explorer link, empty state
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastContainer } from '../Toast';
import type { Toast } from '../../hooks/useToast';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  CheckCircle: () => <span data-testid="check-icon">Check</span>,
  XCircle: () => <span data-testid="x-icon">X</span>,
  Info: () => <span data-testid="info-icon">Info</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>,
  X: () => <span data-testid="close-icon">Close</span>,
  ExternalLink: () => <span data-testid="external-icon">External</span>,
}));

// Mock config for explorer URL
vi.mock('../../config/contracts', () => ({
  getExplorerUrl: (txId: string) => `https://explorer.hiro.so/txid/${txId}`,
}));

const makeToast = (overrides: Partial<Toast> = {}): Toast => ({
  id: 'toast-1',
  type: 'success',
  title: 'Transaction Confirmed',
  ...overrides,
});

describe('ToastContainer Component', () => {
  const mockDismiss = vi.fn();

  it('renders nothing when toasts array is empty', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={mockDismiss} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a success toast', () => {
    render(
      <ToastContainer
        toasts={[makeToast()]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('Transaction Confirmed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders toast message when provided', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ message: 'Your deposit was successful' })]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByText('Your deposit was successful')).toBeInTheDocument();
  });

  it('shows explorer link when txId is provided', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ txId: '0x1234abcd' })]}
        onDismiss={mockDismiss}
      />
    );
    const link = screen.getByText('View on Explorer');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute(
      'href',
      'https://explorer.hiro.so/txid/0x1234abcd'
    );
  });

  it('hides explorer link when no txId', () => {
    render(
      <ToastContainer
        toasts={[makeToast()]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.queryByText('View on Explorer')).not.toBeInTheDocument();
  });

  it('calls onDismiss when close button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <ToastContainer
        toasts={[makeToast({ id: 'toast-42' })]}
        onDismiss={mockDismiss}
      />
    );

    await user.click(screen.getByLabelText('Dismiss notification'));
    expect(mockDismiss).toHaveBeenCalledWith('toast-42');
  });

  it('renders multiple toasts', () => {
    const toasts: Toast[] = [
      makeToast({ id: 't1', title: 'First' }),
      makeToast({ id: 't2', title: 'Second', type: 'error' }),
    ];

    render(
      <ToastContainer toasts={toasts} onDismiss={mockDismiss} />
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('renders error toast with correct icon', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ type: 'error', title: 'Failed' })]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByTestId('x-icon')).toBeInTheDocument();
  });

  it('renders warning toast', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ type: 'warning', title: 'Caution' })]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByTestId('alert-icon')).toBeInTheDocument();
  });

  it('renders info toast', () => {
    render(
      <ToastContainer
        toasts={[makeToast({ type: 'info', title: 'Note' })]}
        onDismiss={mockDismiss}
      />
    );
    expect(screen.getByTestId('info-icon')).toBeInTheDocument();
  });
});
