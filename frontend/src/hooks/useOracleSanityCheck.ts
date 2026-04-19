import { useState } from 'react';

export interface OracleSanityCheckResult {
  warning: boolean;
  deviation: number;
}

const DEFAULT_RESULT: OracleSanityCheckResult = {
  warning: false,
  deviation: 0,
};

export const ORACLE_SANITY_THRESHOLD = 0.05;

/**
 * Compares the current oracle price to the Bitflow market quote.
 * The fetch logic is added in a later commit so the hook API can be adopted safely.
 */
export function useOracleSanityCheck(_oraclePrice: number, tokenId: string): OracleSanityCheckResult {
  const [state] = useState<OracleSanityCheckResult>(DEFAULT_RESULT);

  if (!tokenId.trim()) {
    return DEFAULT_RESULT;
  }

  return state;
}

export default useOracleSanityCheck;