import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStacksTxStatus } from '../useStacksTxStatus';

const mockFetch = vi.fn();

describe('useStacksTxStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
      expect(result.current.pendingPhase).toBe('propagation');
      expect(result.current.message).toContain('waiting for indexer propagation');
      expect(result.current.notFoundGraceRemainingMs).toBeTypeOf('number');
    });
  });

  it('stores average block timing metadata for progress calculation', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tx_id: '0xabc', tx_status: 'pending' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.state).toBe('pending');
      expect(result.current.averageBlockTimeMinutes).toBe(12.5);
      expect(result.current.estimatedMs).toBe(750000);
    });
  });

  it('returns not_found only after 60 minutes', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy
      .mockReturnValueOnce(0)
      .mockReturnValue(61 * 60 * 1000);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

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

  it('continues polling every 30 seconds while pending', async () => {
    vi.useFakeTimers();

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tx_id: '0xabc', tx_status: 'pending' }),
    });

    renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    vi.useRealTimers();
  });

  it('keeps propagation messaging after temporary upstream API failure', async () => {
    vi.useFakeTimers();

    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'not found' }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({ error: 'unavailable' }),
      });

    const { result } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(result.current.pendingPhase).toBe('propagation');
      expect(result.current.message).toContain('waiting for indexer propagation');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await vi.advanceTimersByTimeAsync(30_000);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.pendingPhase).toBe('propagation');
      expect(result.current.message).toContain('waiting for indexer propagation');
    });

    vi.useRealTimers();
  });
});
