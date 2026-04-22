import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStacksTxStatus } from '../useStacksTxStatus';

const mockFetch = vi.fn();

vi.mock('../../config/contracts', () => ({
  getApiEndpoint: () => 'https://api.testnet.hiro.so',
  PROTOCOL_CONSTANTS: {
    BLOCK_TIME_MINUTES: 10,
  },
}));

describe('useStacksTxStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('maps successful tx status to confirmed', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tx_id: '0xabc', tx_status: 'success' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('success');
      expect(result.current.message).toBe('Confirmed');
      expect(result.current.isPolling).toBe(false);
    });
  });

  it('maps abort_by_response to terminal rejection state', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tx_id: '0xabc', tx_status: 'abort_by_response' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('abort_by_response');
      expect(result.current.hasTerminalError).toBe(true);
      expect(result.current.message).toContain('Transaction rejected');
    });
  });

  it('keeps pending during initial not_found grace period', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('pending');
      expect(result.current.hasTerminalError).toBe(false);
    });
  });

  it('returns not_found only after 60 minutes', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('pending');
    });

    await act(async () => {
      vi.advanceTimersByTime(61 * 60 * 1000);
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('not_found');
      expect(result.current.hasTerminalError).toBe(true);
    });
  });

  it('captures optional microblock anchor time', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        tx_id: '0xabc',
        tx_status: 'pending',
        microblock_anchor_time: 1710000000,
      }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('pending');
      expect(result.current.microblockAnchorTime).toBe(1710000000);
    });
  });
});
