import { describe, expect, it } from 'vitest';
import {
  extractEstimatedOutput,
  extractPriceImpact,
  formatPriceImpact,
  getRouteLabel,
  normalizeAmount,
  type PreviewRoute,
} from '../../utils/collateralPreviewUtils';

const createRoute = (overrides: Partial<PreviewRoute> = {}): PreviewRoute => ({
  route: {
    dex_path: ['alex'],
    token_path: ['token-stx', 'token-usda'],
    postConditions: {},
    quoteData: {
      contract: 'SP000.mock-router',
      function: 'quote',
      parameters: {},
    },
    swapData: {
      contract: 'SP000.mock-router',
      function: 'swap',
      parameters: {},
    },
    tokenXDecimals: 6,
    tokenYDecimals: 6,
  },
  quote: 18.42,
  tokenYAmount: 18.42,
  params: {},
  quoteData: {
    contract: 'SP000.mock-router',
    function: 'quote',
    parameters: {},
  },
  swapData: {
    contract: 'SP000.mock-router',
    function: 'swap',
    parameters: {},
  },
  dexPath: ['alex'],
  tokenPath: ['token-stx', 'token-usda'],
  tokenXDecimals: 6,
  tokenYDecimals: 6,
  ...overrides,
});

describe('collateralPreviewUtils', () => {
  it('normalizes invalid collateral amounts to null', () => {
    expect(normalizeAmount(0)).toBeNull();
    expect(normalizeAmount(-1)).toBeNull();
    expect(normalizeAmount(Number.NaN)).toBeNull();
  });

  it('keeps positive collateral amounts intact', () => {
    expect(normalizeAmount(12.5)).toBe(12.5);
  });

  it('prefers tokenYAmount over the legacy quote value', () => {
    const route = createRoute({ quote: 11.11, tokenYAmount: 23.45 });

    expect(extractEstimatedOutput(route)).toBe(23.45);
  });

  it('formats the live route label from the token and dex path', () => {
    const route = createRoute();

    expect(getRouteLabel(route)).toBe('STX → USDA via ALEX');
  });

  it('normalizes fractional price impact values into percentages', () => {
    const route = createRoute({ priceImpact: 0.0123 });

    expect(extractPriceImpact(route)).toBeCloseTo(1.23, 2);
    expect(formatPriceImpact(1.23)).toBe('1.23%');
  });

  it('returns null when no route exists', () => {
    expect(extractEstimatedOutput(null)).toBeNull();
    expect(extractPriceImpact(null)).toBeNull();
    expect(getRouteLabel(null)).toBe('Live Bitflow route');
  });
});
