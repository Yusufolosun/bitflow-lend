import { useState, useEffect, useCallback, useRef } from 'react';

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd';

const FALLBACK_PRICE = 1.5;
const DEFAULT_INTERVAL = 60_000; // 60 seconds

interface StxPriceState {
  price: number;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  isStale: boolean;
}

/**
 * Fetches the current STX/USD price from CoinGecko on a configurable interval.
 * Falls back to a stale cached price (with a warning flag) when the API is unreachable.
 */
export function useStxPrice(refreshInterval = DEFAULT_INTERVAL) {
  const [state, setState] = useState<StxPriceState>({
    price: FALLBACK_PRICE,
    lastUpdated: null,
    isLoading: true,
    error: null,
    isStale: true,
  });

  const mountedRef = useRef(true);

  const fetchPrice = useCallback(async () => {
    try {
      const res = await fetch(COINGECKO_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const price = data?.blockstack?.usd;

      if (typeof price !== 'number' || isNaN(price)) {
        throw new Error('Unexpected response format');
      }

      if (mountedRef.current) {
        setState({
          price,
          lastUpdated: new Date(),
          isLoading: false,
          error: null,
          isStale: false,
        });
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err.message || 'Failed to fetch STX price',
          isStale: true,
        }));
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrice();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchPrice]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    const id = setInterval(fetchPrice, refreshInterval);
    return () => clearInterval(id);
  }, [refreshInterval, fetchPrice]);

  return { ...state, refresh: fetchPrice };
}

export default useStxPrice;
