import { useEffect, useState } from 'react';
import { bitflowClient } from '../utils/bitflowClient';

export interface OracleSanityCheckResult {
  warning: boolean;
  deviation: number;
  marketRate: number | null;
}

const DEFAULT_RESULT: OracleSanityCheckResult = {
  warning: false,
  deviation: 0,
  marketRate: null,
};

export const ORACLE_SANITY_THRESHOLD = 0.05;
const ORACLE_SANITY_INTERVAL_MS = 30_000;
const ORACLE_TOKEN_IN = 'token-stx';
const ORACLE_TOKEN_OUT = 'token-usda';


/**
 * Compares the current oracle price to the Bitflow live market quote.
 * Returns a warning flag when deviation exceeds the configured threshold.
 * Re-fetches every 30 seconds with proper cleanup on unmount.
 */
export function useOracleSanityCheck(oraclePrice: number, tokenId: string): OracleSanityCheckResult {
  const [state, setState] = useState<OracleSanityCheckResult>(DEFAULT_RESULT);

  useEffect(() => {
    let cancelled = false;

    const isInputValid = tokenId.trim().length > 0 && Number.isFinite(oraclePrice) && oraclePrice > 0;

    if (!isInputValid) {
      setState(DEFAULT_RESULT);
      return () => {
        cancelled = true;
      };
    }

    const refreshQuote = async () => {
      try {
        const quote = await bitflowClient.getQuoteForRoute(ORACLE_TOKEN_IN, ORACLE_TOKEN_OUT, 1);
        const marketRate = Number(quote?.bestRoute?.quote ?? 0);

        if (!Number.isFinite(marketRate) || marketRate <= 0) {
          if (!cancelled) {
            setState(DEFAULT_RESULT);
          }
          return;
        }

        const deviation = Math.abs(oraclePrice - marketRate) / oraclePrice;

        if (!Number.isFinite(deviation)) {
          if (!cancelled) {
            setState(DEFAULT_RESULT);
          }
          return;
        }

        if (!cancelled) {
          setState({
            warning: deviation > ORACLE_SANITY_THRESHOLD,
            deviation,
            marketRate,
          });
        }
      } catch {
        if (!cancelled) {
          setState(DEFAULT_RESULT);
        }
      }
    };

    refreshQuote();

    const intervalId = setInterval(refreshQuote, ORACLE_SANITY_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [oraclePrice, tokenId]);

  return state;
}

export default useOracleSanityCheck;
