/**
 * useToast Hook Tests
 * Covers: adding toasts, removing, clearing, convenience methods, auto-dismiss
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty toast list', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toHaveLength(0);
  });

  it('adds a success toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Deposit confirmed');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Deposit confirmed');
  });

  it('adds an error toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Transaction failed');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
  });

  it('adds an info toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.info('Processing...');
    });

    expect(result.current.toasts[0].type).toBe('info');
  });

  it('adds a warning toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.warning('Low balance');
    });

    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('includes optional message and txId', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Done', {
        message: 'Your deposit of 100 STX was confirmed',
        txId: '0xabc123',
      });
    });

    expect(result.current.toasts[0].message).toBe(
      'Your deposit of 100 STX was confirmed'
    );
    expect(result.current.toasts[0].txId).toBe('0xabc123');
  });

  it('removes a specific toast by id', () => {
    const { result } = renderHook(() => useToast());

    let toastId: string;
    act(() => {
      toastId = result.current.success('First');
      result.current.success('Second');
    });

    expect(result.current.toasts).toHaveLength(2);

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe('Second');
  });

  it('clears all toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('One');
      result.current.error('Two');
      result.current.info('Three');
    });

    expect(result.current.toasts).toHaveLength(3);

    act(() => {
      result.current.clearToasts();
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-dismisses success toast after 5 seconds', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Auto dismiss');
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('auto-dismisses error toast after 8 seconds', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.error('Sticky error');
    });

    // Still present at 5s
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.toasts).toHaveLength(1);

    // Gone at 8s
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.toasts).toHaveLength(0);
  });

  it('respects custom duration', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Quick', { duration: 1000 });
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('returns unique toast IDs', () => {
    const { result } = renderHook(() => useToast());

    let id1: string, id2: string;
    act(() => {
      id1 = result.current.success('One');
      id2 = result.current.success('Two');
    });

    expect(id1!).not.toBe(id2!);
  });

  it('can add multiple toasts simultaneously', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.success('Alpha');
      result.current.error('Beta');
      result.current.warning('Gamma');
      result.current.info('Delta');
    });

    expect(result.current.toasts).toHaveLength(4);
  });
});
