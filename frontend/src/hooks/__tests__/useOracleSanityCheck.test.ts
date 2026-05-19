import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { BitflowSDK } from '@bitflowlabs/core-sdk';
import { useOracleSanityCheck } from '../useOracleSanityCheck';

const mockGetQuoteForRoute = vi.hoisted(() => vi.fn());

vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getQuoteForRoute = mockGetQuoteForRoute;
  },
}));

type QuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;

describe('useOracleSanityCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const flushPromises = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };

  it('returns a warning when the oracle diverges by more than 5 percent', async () => {
    const quote: QuoteResult = {
      bestRoute: {
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
        quote: 1.25,
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
      },
      allRoutes: [],
      inputData: {
        tokenX: 'token-stx',
        tokenY: 'token-usda',
        amountInput: 1,
      },
    };

    mockGetQuoteForRoute.mockResolvedValue(quote);

    const { result } = renderHook(() => useOracleSanityCheck(1.0, 'token-stx'));

    await flushPromises();

    expect(result.current.warning).toBe(true);
    expect(result.current.deviation).toBeCloseTo(0.25, 2);

    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-stx', 'token-usda', 1);
  });

  it('does not warn when the market quote stays within the threshold', async () => {
    const quote: QuoteResult = {
      bestRoute: {
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
        quote: 1.03,
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
      },
      allRoutes: [],
      inputData: {
        tokenX: 'token-stx',
        tokenY: 'token-usda',
        amountInput: 1,
      },
    };

    mockGetQuoteForRoute.mockResolvedValue(quote);

    const { result } = renderHook(() => useOracleSanityCheck(1.0, 'token-stx'));

    await flushPromises();

    expect(result.current.warning).toBe(false);
    expect(result.current.deviation).toBeCloseTo(0.03, 2);
  });

  it('refreshes the Bitflow quote on the polling interval', async () => {
    vi.useFakeTimers();

    const quote: QuoteResult = {
      bestRoute: {
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
        quote: 1.0,
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
      },
      allRoutes: [],
      inputData: {
        tokenX: 'token-stx',
        tokenY: 'token-usda',
        amountInput: 1,
      },
    };

    mockGetQuoteForRoute.mockResolvedValue(quote);

    const { result } = renderHook(() => useOracleSanityCheck(1.0, 'token-stx'));

    await flushPromises();

    expect(mockGetQuoteForRoute).toHaveBeenCalledTimes(1);
    expect(result.current.warning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    await flushPromises();

    expect(mockGetQuoteForRoute).toHaveBeenCalledTimes(2);
  });

  it('fails closed when the oracle price is invalid', async () => {
    const { result } = renderHook(() => useOracleSanityCheck(0, 'token-stx'));

    await flushPromises();

    expect(result.current.warning).toBe(false);
    expect(result.current.deviation).toBe(0);

    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('fails closed when the Bitflow quote request rejects', async () => {
    mockGetQuoteForRoute.mockRejectedValue(new Error('Bitflow unavailable'));

    const { result } = renderHook(() => useOracleSanityCheck(1.0, 'token-stx'));

    await flushPromises();

    expect(result.current.warning).toBe(false);
    expect(result.current.deviation).toBe(0);
  });
});
