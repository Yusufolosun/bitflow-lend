import { useState, useCallback, useRef } from 'react';

/**
 * Toast notification types
 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  txId?: string;
  duration?: number;
  count: number;
}

const MAX_TOASTS = 5;

/**
 * Build a dedup key from type + title + message so identical toasts
 * get grouped with a count badge instead of filling the queue.
 */
const dedupKey = (type: ToastType, title: string, message?: string) =>
  `${type}::${title}::${message ?? ''}`;

/**
 * Custom hook for managing toast notifications
 * Supports multiple simultaneous toasts with auto-dismiss, queue cap,
 * and duplicate grouping.
 */
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  /** Tracks auto-dismiss timers so they can be paused on hover. */
  const timersRef = useRef<Map<string, { timerId: ReturnType<typeof setTimeout>; remaining: number; start: number }>>(new Map());

  /**
   * Schedule (or reschedule) the auto-dismiss timer for a toast.
   */
  const scheduleTimer = useCallback((id: string, remaining: number) => {
    if (remaining <= 0) return;

    const timerId = setTimeout(() => {
      timersRef.current.delete(id);
      setToasts(prev => prev.filter(t => t.id !== id));
    }, remaining);

    timersRef.current.set(id, { timerId, remaining, start: Date.now() });
  }, []);

  /**
   * Pause the auto-dismiss timer (called on mouse enter).
   */
  const pauseTimer = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry) return;
    clearTimeout(entry.timerId);
    const elapsed = Date.now() - entry.start;
    timersRef.current.set(id, { ...entry, remaining: Math.max(0, entry.remaining - elapsed), timerId: undefined as any });
  }, []);

  /**
   * Resume the auto-dismiss timer (called on mouse leave).
   */
  const resumeTimer = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (!entry || entry.remaining <= 0) return;
    scheduleTimer(id, entry.remaining);
  }, [scheduleTimer]);

  /**
   * Add a new toast notification.
   * If an identical toast (same type + title + message) is already visible
   * its count is bumped instead of adding a second entry.
   */
  const addToast = useCallback((
    type: ToastType,
    title: string,
    options?: { message?: string; txId?: string; duration?: number }
  ) => {
    const key = dedupKey(type, title, options?.message);
    const duration = options?.duration ?? (type === 'error' ? 8000 : 5000);

    // Check for duplicate
    let duplicateId: string | null = null;
    setToasts(prev => {
      const existing = prev.find(
        t => dedupKey(t.type, t.title, t.message) === key
      );

      if (existing) {
        duplicateId = existing.id;
        // Reset the timer on the existing toast
        const entry = timersRef.current.get(existing.id);
        if (entry) clearTimeout(entry.timerId);
        scheduleTimer(existing.id, duration);

        return prev.map(t =>
          t.id === existing.id ? { ...t, count: t.count + 1 } : t
        );
      }

      // No duplicate — add new toast, enforce cap
      const id = `toast-${++counterRef.current}-${Date.now()}`;
      const toast: Toast = {
        id,
        type,
        title,
        message: options?.message,
        txId: options?.txId,
        duration,
        count: 1,
      };

      duplicateId = id;
      const next = [...prev, toast];

      // Evict oldest if over limit
      if (next.length > MAX_TOASTS) {
        const evicted = next[0];
        const entry = timersRef.current.get(evicted.id);
        if (entry) clearTimeout(entry.timerId);
        timersRef.current.delete(evicted.id);
        next.shift();
      }

      // Schedule auto-dismiss
      if (duration > 0) {
        scheduleTimer(id, duration);
      }

      return next;
    });

    return duplicateId ?? '';
  }, [scheduleTimer]);

  /**
   * Remove a specific toast
   */
  const removeToast = useCallback((id: string) => {
    const entry = timersRef.current.get(id);
    if (entry) clearTimeout(entry.timerId);
    timersRef.current.delete(id);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /**
   * Clear all toasts
   */
  const clearToasts = useCallback(() => {
    timersRef.current.forEach(entry => clearTimeout(entry.timerId));
    timersRef.current.clear();
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, options?: { message?: string; txId?: string; duration?: number }) => {
    return addToast('success', title, options);
  }, [addToast]);

  const error = useCallback((title: string, options?: { message?: string; txId?: string; duration?: number }) => {
    return addToast('error', title, options);
  }, [addToast]);

  const info = useCallback((title: string, options?: { message?: string; duration?: number }) => {
    return addToast('info', title, options);
  }, [addToast]);

  const warning = useCallback((title: string, options?: { message?: string; duration?: number }) => {
    return addToast('warning', title, options);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    pauseTimer,
    resumeTimer,
    success,
    error,
    info,
    warning,
  };
};

export default useToast;
