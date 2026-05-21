import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStacksTxStatus } from '../useStacksTxStatus';
import { STACKS_TX_STATUS_COPY } from '../../constants/messages';

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
      expect(result.current.message).toBe(STACKS_TX_STATUS_COPY.confirmed);
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

  it('configures 30-second polling without terminal timeout behavior', async () => {
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ tx_id: '0xabc', tx_status: 'pending' }),
    });

    const { unmount } = renderHook(() => useStacksTxStatus('0xabc'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30_000);
    });

    const clearCallsBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCallsBeforeUnmount);
  });

  it('keeps propagation messaging after temporary upstream API failure', async () => {
    const setIntervalSpy = vi
      .spyOn(window, 'setInterval')
      .mockImplementation((() => 1 as unknown as number) as typeof window.setInterval);

    vi.spyOn(window, 'clearInterval').mockImplementation(() => undefined);

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
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(result.current.txStatusRaw).toBe('not_found');
      expect(result.current.pendingPhase).toBe('propagation');
      expect(result.current.message).toContain('waiting for indexer propagation');
    });

    const intervalCallback = setIntervalSpy.mock.calls[0]?.[0];
    expect(typeof intervalCallback).toBe('function');

    if (typeof intervalCallback === 'function') {
      intervalCallback();
    }

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.current.pendingPhase).toBe('propagation');
      expect(result.current.message).toContain('waiting for indexer propagation');
    });
  });
});

