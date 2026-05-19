import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { formatPercentage } from '../utils/formatters';

export type BitflowQuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;

export type PreviewRoute = NonNullable<BitflowQuoteResult['bestRoute']> & {
  tokenYAmount?: number | null;
  priceImpact?: number | null;
  priceImpactPercent?: number | null;
  price_impact?: number | null;
  impact?: number | null;
  params?: Record<string, unknown>;
};

export const TOKEN_LABELS: Record<string, string> = {
  'token-stx': 'STX',
  'token-usda': 'USDA',
};

export const normalizeAmount = (value: number): number | null => {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
};

export const formatTokenLabel = (token: string): string => {
  return TOKEN_LABELS[token] ?? token.replace(/[-_]/g, ' ').toUpperCase();
};

export const formatDexLabel = (dex: string): string => {
  return dex.replace(/[-_]/g, ' ').toUpperCase();
};

export const extractEstimatedOutput = (bestRoute: PreviewRoute | null): number | null => {
  if (!bestRoute) {
    return null;
  }

  const candidate = bestRoute.tokenYAmount ?? bestRoute.quote;

  return typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0
    ? candidate
    : null;
};

const readNumericValue = (...values: Array<unknown>): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
};

export const extractPriceImpact = (bestRoute: PreviewRoute | null): number | null => {
  if (!bestRoute) {
    return null;
  }

  const params = bestRoute.params as
    | { priceImpact?: unknown; price_impact?: unknown; 'price-impact'?: unknown }
    | undefined;
  const quoteParams = bestRoute.quoteData?.parameters as
    | { priceImpact?: unknown; price_impact?: unknown; 'price-impact'?: unknown }
    | undefined;

  const rawValue = readNumericValue(
    bestRoute.priceImpact,
    bestRoute.priceImpactPercent,
    bestRoute.price_impact,
    bestRoute.impact,
    params?.priceImpact,
    params?.price_impact,
    params?.['price-impact'],
    quoteParams?.priceImpact,
    quoteParams?.price_impact,
    quoteParams?.['price-impact']
  );

  if (rawValue === null) {
    return null;
  }

  if (Math.abs(rawValue) <= 1) {
    return rawValue * 100;
  }

  return rawValue;
};

export const formatPriceImpact = (priceImpact: number): string => {
  return formatPercentage(Math.abs(priceImpact), 2);
};

export const getRouteLabel = (bestRoute: PreviewRoute | null): string => {
  if (!bestRoute) {
    return 'Live Bitflow route';
  }

  const tokenPath = bestRoute.tokenPath.length > 0
    ? bestRoute.tokenPath.map(formatTokenLabel).join(' → ')
    : 'STX → USDA';
  const dexPath = bestRoute.dexPath.length > 0
    ? bestRoute.dexPath.map(formatDexLabel).join(' / ')
    : 'Bitflow';

  return `${tokenPath} via ${dexPath}`;
};
