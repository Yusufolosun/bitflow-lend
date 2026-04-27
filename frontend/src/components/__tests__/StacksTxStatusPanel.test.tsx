import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StacksTxStatusPanel } from '../StacksTxStatusPanel';
import type { StacksTxStatusSnapshot } from '../../types/txStatus';

vi.mock('../../config/contracts', () => ({
  getExplorerUrl: (txId?: string) => `https://explorer.hiro.so/txid/${txId}`,
}));

vi.mock('lucide-react', () => ({
  AlertCircle: () => <span>AlertCircle</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  ExternalLink: () => <span>ExternalLink</span>,
}));

const buildSnapshot = (overrides: Partial<StacksTxStatusSnapshot> = {}): StacksTxStatusSnapshot => ({
  state: 'pending',
  txStatusRaw: 'pending',
  message: 'Transaction in Stacks mempool — confirming with Bitcoin...',
  txId: '0xabc',
  elapsedMs: 120000,
  estimatedMs: 750000,
  remainingMs: 630000,
  progressPercent: 16,
  microblockAnchorTime: null,
  hasTerminalError: false,
  isPolling: true,
  pendingPhase: 'mempool',
  notFoundGraceRemainingMs: null,
  averageBlockTimeMinutes: 12.5,
  ...overrides,
});

describe('StacksTxStatusPanel', () => {
  it('renders pending status with average-time progress details', () => {
    render(<StacksTxStatusPanel snapshot={buildSnapshot()} />);

    expect(screen.getByText('Transaction in Stacks mempool — confirming with Bitcoin...')).toBeInTheDocument();
    expect(screen.getByText(/Estimated by average Stacks block time/i)).toBeInTheDocument();
    expect(screen.getByText(/Approx. 11 min remaining/i)).toBeInTheDocument();
  });

  it('shows propagation grace text for temporary 404 states', () => {
    render(
      <StacksTxStatusPanel
        snapshot={buildSnapshot({
          txStatusRaw: 'not_found',
          message: 'Transaction submitted — waiting for indexer propagation...',
          pendingPhase: 'propagation',
          notFoundGraceRemainingMs: 59 * 60 * 1000,
        })}
      />
    );

    expect(screen.getByText(/waiting for indexer propagation/i)).toBeInTheDocument();
    expect(screen.getByText(/only mark this as not found/i)).toBeInTheDocument();
  });

  it('renders confirmed state', () => {
    render(
      <StacksTxStatusPanel
        snapshot={buildSnapshot({
          state: 'success',
          txStatusRaw: 'success',
          message: 'Confirmed',
          isPolling: false,
        })}
      />
    );

    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('renders rejection state message', () => {
    render(
      <StacksTxStatusPanel
        snapshot={buildSnapshot({
          state: 'abort_by_response',
          txStatusRaw: 'abort_by_response',
          message: 'Transaction rejected — check post-conditions',
          hasTerminalError: true,
          isPolling: false,
        })}
      />
    );

    expect(screen.getByText('Transaction rejected — check post-conditions')).toBeInTheDocument();
  });

  it('explains not_found after long grace window', () => {
    render(
      <StacksTxStatusPanel
        snapshot={buildSnapshot({
          state: 'not_found',
          txStatusRaw: 'not_found',
          message: 'Transaction not found after 60 minutes. Confirm the tx ID in the explorer.',
          elapsedMs: 61 * 60 * 1000,
          hasTerminalError: true,
          isPolling: false,
        })}
      />
    );

    expect(screen.getByText(/not found after 60 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/kept polling for 61 min/i)).toBeInTheDocument();
  });

  it('renders microblock anchor label when available', () => {
    render(
      <StacksTxStatusPanel
        snapshot={buildSnapshot({
          microblockAnchorTime: 1710000000,
        })}
      />
    );

    expect(screen.getByText(/Microblock anchor time/i)).toBeInTheDocument();
  });
});
