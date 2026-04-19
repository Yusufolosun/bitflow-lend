import { useEffect, useState } from 'react';
import { BitflowSDK } from '@bitflowlabs/core-sdk';

export interface OracleSanityCheckResult {
  warning: boolean;
  deviation: number;
}

const DEFAULT_RESULT: OracleSanityCheckResult = {
  warning: false,
  deviation: 0,
};

export const ORACLE_SANITY_THRESHOLD = 0.05;
const ORACLE_SANITY_INTERVAL_MS = 30_000;
const ORACLE_TOKEN_IN = 'token-stx';
const ORACLE_TOKEN_OUT = 'token-usda';

const bitflow = new BitflowSDK();

/**
 * Compares the current oracle price to the Bitflow market quote.
 * The fetch logic is added in a later commit so the hook API can be adopted safely.
 */
export function useOracleSanityCheck(oraclePrice: number, tokenId: string): OracleSanityCheckResult {
  const [state, setState] = useState<OracleSanityCheckResult>(DEFAULT_RESULT);

  useEffect(() => {
    let cancelled = false;

    const refreshQuote = async () => {
      try {
        if (!tokenId.trim() || !Number.isFinite(oraclePrice) || oraclePrice <= 0) {
          if (!cancelled) {
            setState(DEFAULT_RESULT);
          }
          return;
        }

        const quote = await bitflow.getQuoteForRoute(ORACLE_TOKEN_IN, ORACLE_TOKEN_OUT, 1);
        const marketRate = Number(quote?.bestRoute?.quote ?? 0);

        if (!Number.isFinite(marketRate) || marketRate <= 0) {
          if (!cancelled) {
            setState(DEFAULT_RESULT);
          }
          return;
        }

        const deviation = Math.abs(oraclePrice - marketRate) / oraclePrice;

        if (!cancelled) {
          setState({
            warning: deviation > ORACLE_SANITY_THRESHOLD,
            deviation,
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