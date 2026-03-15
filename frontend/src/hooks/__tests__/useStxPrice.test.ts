/**
 * useStxPrice Hook Tests
 * Covers: initial fallback, successful fetch, error handling, refresh interval, stale flag
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useStxPrice } from '../useStxPrice';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useStxPrice Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with fallback price and loading state', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: { usd: 1.5 } }),
    });

    const { result } = renderHook(() => useStxPrice());

    expect(result.current.price).toBe(1.5);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isStale).toBe(true);
    expect(result.current.lastUpdated).toBeNull();
  });

  it('updates price after successful fetch', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: { usd: 2.35 } }),
    });

    const { result } = renderHook(() => useStxPrice());

    await waitFor(() => {
      expect(result.current.price).toBe(2.35);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStale).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  it('keeps fallback price on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
    });

    const { result } = renderHook(() => useStxPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isStale).toBe(true);
      expect(result.current.error).toContain('HTTP 429');
      expect(result.current.price).toBe(1.5); // fallback
    });
  });

  it('handles malformed response gracefully', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: {} }),
    });

    const { result } = renderHook(() => useStxPrice());

    await waitFor(() => {
      expect(result.current.isStale).toBe(true);
      expect(result.current.error).toContain('Unexpected response format');
    });
  });

  it('handles network error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useStxPrice());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
      expect(result.current.isStale).toBe(true);
    });
  });

  it('exposes a refresh function', () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: { usd: 1.5 } }),
    });

    const { result } = renderHook(() => useStxPrice());

    expect(typeof result.current.refresh).toBe('function');
  });

  it('does not set interval when refreshInterval is 0', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: { usd: 1.5 } }),
    });

    renderHook(() => useStxPrice(0));

    await waitFor(() => {
      // Initial fetch happens
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Advance time — no additional calls
    act(() => {
      vi.advanceTimersByTime(120_000);
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it('sets lastUpdated timestamp on success', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ stacks: { usd: 2.0 } }),
    });

    const { result } = renderHook(() => useStxPrice());

    await waitFor(() => {
      expect(result.current.lastUpdated).toBeInstanceOf(Date);
    });
  });
});
