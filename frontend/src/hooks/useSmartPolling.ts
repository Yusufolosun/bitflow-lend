import { useEffect, useRef, useCallback } from 'react';

/**
 * Smart polling hook that pauses when the tab is hidden and supports
 * configurable intervals.
 *
 * @param callback - Async function to invoke on each tick
 * @param interval - Polling interval in ms (0 to disable)
 * @param enabled  - Whether polling is active (e.g., only when wallet connected)
 */
export function useSmartPolling(
  callback: () => Promise<void> | void,
  interval: number,
  enabled = true,
) {
  const savedCallback = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the callback ref fresh without re-creating the interval.
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const tick = useCallback(() => {
    if (document.visibilityState === 'visible') {
      savedCallback.current();
    }
  }, []);

  useEffect(() => {
    if (!enabled || interval <= 0) return;

    // Run once immediately on mount / re-enable
    tick();

    timerRef.current = setInterval(tick, interval);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Fire immediately when the user returns to the tab
        tick();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [interval, enabled, tick]);
}

export default useSmartPolling;
