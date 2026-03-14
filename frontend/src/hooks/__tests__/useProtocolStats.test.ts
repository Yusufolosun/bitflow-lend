import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProtocolStats } from '../useProtocolStats';

// Mock @stacks/transactions
vi.mock('@stacks/transactions', () => ({
  callReadOnlyFunction: vi.fn(),
  cvToValue: vi.fn(),
}));

// Mock config/contracts
vi.mock('../../config/contracts', () => ({
  getNetwork: () => 'testnet',
  getContractAddress: () => 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  VAULT_CONTRACT: { name: 'bitflow-vault-core' },
}));

import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';

const mockCallReadOnly = callReadOnlyFunction as ReturnType<typeof vi.fn>;
const mockCvToValue = cvToValue as ReturnType<typeof vi.fn>;

describe('useProtocolStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in loading state', () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue({
      'total-deposits': 0,
      'total-repaid': 0,
      'total-liquidations': 0,
      'total-outstanding-borrows': 0,
    });

    const { result } = renderHook(() => useProtocolStats(0));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.stats).toBeNull();
  });

  it('fetches and parses protocol stats', async () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue({
      'total-deposits': 10_000_000,
      'total-repaid': 2_000_000,
      'total-liquidations': 3,
      'total-outstanding-borrows': 5_000_000,
    });

    const { result } = renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats?.totalDeposits).toBe(10); // 10M micro / 1M = 10
    expect(result.current.stats?.totalRepaid).toBe(2);
    expect(result.current.stats?.totalLiquidations).toBe(3);
    expect(result.current.stats?.totalBorrowed).toBe(5);
    expect(result.current.error).toBeNull();
  });

  it('sets lastUpdated after fetch', async () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue({
      'total-deposits': 0,
      'total-repaid': 0,
      'total-liquidations': 0,
      'total-outstanding-borrows': 0,
    });

    const { result } = renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(result.current.lastUpdated).not.toBeNull();
    });
  });

  it('handles fetch errors gracefully', async () => {
    mockCallReadOnly.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.stats).toBeNull();
  });

  it('handles malformed response data', async () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue(null);

    const { result } = renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should not crash; stats remain null
    expect(result.current.stats).toBeNull();
  });

  it('provides a refresh function', async () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue({
      'total-deposits': 0,
      'total-repaid': 0,
      'total-liquidations': 0,
      'total-outstanding-borrows': 0,
    });

    const { result } = renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(typeof result.current.refresh).toBe('function');
  });

  it('does not auto-refresh when interval is 0', async () => {
    mockCallReadOnly.mockResolvedValue({});
    mockCvToValue.mockReturnValue({
      'total-deposits': 0,
      'total-repaid': 0,
      'total-liquidations': 0,
      'total-outstanding-borrows': 0,
    });

    renderHook(() => useProtocolStats(0));

    await waitFor(() => {
      expect(mockCallReadOnly).toHaveBeenCalledTimes(1);
    });

    // Advance time — should NOT trigger another fetch
    vi.advanceTimersByTime(60000);
    expect(mockCallReadOnly).toHaveBeenCalledTimes(1);
  });
});
