import { useEffect, useState } from 'react';
import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { formatBitflowTokenLabel } from '../utils/bitflowTokens';

export type BitflowToken = Awaited<ReturnType<BitflowSDK['getAvailableTokens']>>[number];

interface UseBitflowTokensResult {
  tokens: BitflowToken[];
  loading: boolean;
  error: string | null;
}

const bitflow = new BitflowSDK();
const MAX_TOKENS = 5;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

/**
 * Loads the public Bitflow token list and keeps only the STX-adjacent tokens
 * that are relevant to the dashboard ticker.
 */
export function useBitflowTokens(): UseBitflowTokensResult {
  const [tokens, setTokens] = useState<BitflowToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadTokens = async () => {
      try {
        const availableTokens = await bitflow.getAvailableTokens();

        if (!isActive) {
          return;
        }

        const seenTokenIds = new Set<string>();
        const filteredTokens = availableTokens
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

        setTokens(filteredTokens);
      } catch (fetchError: unknown) {
        if (!isActive) {
          return;
        }

        setTokens([]);
        setError(getErrorMessage(fetchError, 'Failed to load Bitflow tokens'));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadTokens();

    return () => {
      isActive = false;
    };
  }, []);

  return { tokens, loading, error };
}

export default useBitflowTokens;
