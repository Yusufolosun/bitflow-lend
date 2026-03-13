/**
 * useSmartPolling Hook Tests
 * Covers: initial call, interval ticking, pause on hidden, cleanup
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartPolling } from '../useSmartPolling';

describe('useSmartPolling Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Default: tab is visible
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls callback immediately on mount', () => {
    const cb = vi.fn();
    renderHook(() => useSmartPolling(cb, 10000, true));
    expect(cb).toHaveBeenCalledOnce();
  });

  it('calls callback on each interval tick', () => {
    const cb = vi.fn();
    renderHook(() => useSmartPolling(cb, 5000, true));

    expect(cb).toHaveBeenCalledTimes(1); // initial

    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(3);
  });

  it('does not call callback when disabled', () => {
    const cb = vi.fn();
    renderHook(() => useSmartPolling(cb, 5000, false));

    vi.advanceTimersByTime(15000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does not call when interval is 0', () => {
    const cb = vi.fn();
    renderHook(() => useSmartPolling(cb, 0, true));

    vi.advanceTimersByTime(10000);
    expect(cb).not.toHaveBeenCalled();
  });

  it('skips tick when tab is hidden', () => {
    const cb = vi.fn();
    renderHook(() => useSmartPolling(cb, 5000, true));

    expect(cb).toHaveBeenCalledTimes(1); // initial

    // Hide tab
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'hidden',
    });

    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1); // not called while hidden
  });

  it('stops interval on unmount', () => {
    const cb = vi.fn();
    const { unmount } = renderHook(() => useSmartPolling(cb, 5000, true));

    expect(cb).toHaveBeenCalledTimes(1);

    unmount();

    vi.advanceTimersByTime(15000);
    expect(cb).toHaveBeenCalledTimes(1); // no more calls
  });

  it('restarts interval when enabled changes', () => {
    const cb = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useSmartPolling(cb, 5000, enabled),
      { initialProps: { enabled: false } }
    );

    expect(cb).not.toHaveBeenCalled();

    rerender({ enabled: true });
    expect(cb).toHaveBeenCalledTimes(1); // immediate call on enable
  });
});
