import { useCallback, useEffect, useRef, useState } from 'react';
import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { bitflowClient } from '../utils/bitflowClient';
import { formatBitflowTokenLabel } from '../utils/bitflowTokens';

export type BitflowToken = Awaited<ReturnType<BitflowSDK['getAvailableTokens']>>[number];

interface UseBitflowTokensResult {
  tokens: BitflowToken[];
  loading: boolean;
  error: string | null;
}

const MAX_TOKENS = 5;
const TOKEN_REFRESH_INTERVAL_MS = 60_000;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const filterAndSortTokens = (
  availableTokens: BitflowToken[]
): BitflowToken[] => {
  const seenTokenIds = new Set<string>();

  return availableTokens
    .filter((token) => {
      const tokenId = typeof token.tokenId === 'string' ? token.tokenId.toLowerCase() : '';
      return tokenId.includes('stx') || tokenId.includes('usda');
    })
    .filter((token) => {
      if (seenTokenIds.has(token.tokenId)) {
        return false;
      }

      seenTokenIds.add(token.tokenId);
      return true;
    })
    .sort((left, right) => {
      const leftLabel = formatBitflowTokenLabel(left.name, left.tokenId);
      const rightLabel = formatBitflowTokenLabel(right.name, right.tokenId);

      return leftLabel.localeCompare(rightLabel);
    })
    .slice(0, MAX_TOKENS);
};

/**
 * Loads the public Bitflow token list and keeps only the STX-adjacent tokens
 * that are relevant to the dashboard ticker. Re-fetches every 60 seconds so
 * newly listed tokens appear without a page reload.
 */
export function useBitflowTokens(): UseBitflowTokensResult {
  const [tokens, setTokens] = useState<BitflowToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isActiveRef = useRef(true);

  const loadTokens = useCallback(async () => {
    try {
      const availableTokens = await bitflowClient.getAvailableTokens();

      if (!isActiveRef.current) {
        return;
      }

      setTokens(filterAndSortTokens(availableTokens));
      setError(null);
    } catch (fetchError: unknown) {
      if (!isActiveRef.current) {
        return;
      }

      setTokens([]);
      setError(getErrorMessage(fetchError, 'Failed to load Bitflow tokens'));
    } finally {
      if (isActiveRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isActiveRef.current = true;

    loadTokens();

    const intervalId = setInterval(loadTokens, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      isActiveRef.current = false;
      clearInterval(intervalId);
    };
  }, [loadTokens]);

  return { tokens, loading, error };
}

export default useBitflowTokens;
