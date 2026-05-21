import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BitflowSDK } from '@bitflowlabs/core-sdk';
import { executeLiquidationSwap } from '../liquidation-swap';

const mockGetQuoteForRoute = vi.hoisted(() => vi.fn());
const mockGetSwapParams = vi.hoisted(() => vi.fn());

vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getQuoteForRoute = mockGetQuoteForRoute;
    getSwapParams = mockGetSwapParams;
  },
}));

type QuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;
type SwapParamsResult = Awaited<ReturnType<BitflowSDK['getSwapParams']>>;

describe('executeLiquidationSwap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns swap params shape for bundling with liquidation tx', async () => {
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
        quote: 99,
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
        amountInput: 125,
      },
    };

    const swapParams: SwapParamsResult = {
      functionArgs: ['arg-1', 'arg-2'],
      postConditions: ['pc-1'],
      contractAddress: 'SP000.mock-router',
      contractName: 'mock-router',
      functionName: 'swap',
    };

    mockGetQuoteForRoute.mockResolvedValue(quote);
    mockGetSwapParams.mockResolvedValue(swapParams);

    const result = await executeLiquidationSwap(
      'ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T',
      125,
      0.5
    );

    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-stx', 'token-usda', 125);
    expect(mockGetSwapParams).toHaveBeenCalledWith(
      {
        route: quote.bestRoute?.route,
        amount: 125,
        tokenXDecimals: 6,
        tokenYDecimals: 6,
      },
      'ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T',
      0.5
    );

    expect(result).toEqual(
      expect.objectContaining({
        functionArgs: expect.any(Array),
        postConditions: expect.any(Array),
        contractAddress: expect.any(String),
        contractName: expect.any(String),
        functionName: expect.any(String),
      })
    );
  });

  it('throws when the quote does not include a best route', async () => {
    const quoteWithoutRoute: QuoteResult = {
      bestRoute: null,
      allRoutes: [],
      inputData: {
        tokenX: 'token-stx',
        tokenY: 'token-usda',
        amountInput: 75,
      },
    };

    mockGetQuoteForRoute.mockResolvedValue(quoteWithoutRoute);

    await expect(
      executeLiquidationSwap(
        'ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T',
        75,
        0.5
      )
    ).rejects.toThrow('No swap route available for liquidation collateral.');

    expect(mockGetSwapParams).not.toHaveBeenCalled();
  });

  it('rejects invalid sender or amounts before calling SDK', async () => {
    await expect(executeLiquidationSwap('   ', 75, 0.5)).rejects.toThrow(
      'senderAddress is required.'
    );

    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', 0, 0.5)
    ).rejects.toThrow('collateralAmount must be a positive number.');

    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', 75, 0)
    ).rejects.toThrow('slippage must be a positive number.');

    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
    expect(mockGetSwapParams).not.toHaveBeenCalled();
  });

  it('rejects slippage above the maximum ceiling', async () => {
    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', 100, 51)
    ).rejects.toThrow('slippage must not exceed 50%');

    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('accepts slippage at the exact maximum boundary', async () => {
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
        quote: 50,
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
        amountInput: 100,
      },
    };

    mockGetQuoteForRoute.mockResolvedValue(quote);
    mockGetSwapParams.mockResolvedValue({
      functionArgs: [],
      postConditions: [],
      contractAddress: 'SP000.mock-router',
      contractName: 'mock-router',
      functionName: 'swap',
    });

    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', 100, 50)
    ).resolves.toBeDefined();
  });

  it('rejects NaN and Infinity collateral amounts', async () => {
    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', NaN, 0.5)
    ).rejects.toThrow('collateralAmount must be a positive number.');

    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', Infinity, 0.5)
    ).rejects.toThrow('collateralAmount must be a positive number.');

    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('propagates SDK rejection without swallowing the error', async () => {
    mockGetQuoteForRoute.mockRejectedValue(new Error('Bitflow API rate limited'));

    await expect(
      executeLiquidationSwap('ST1A2B3C4D5E6F7G8H9I0J1K2L3M4N5P6Q7R8S9T', 50, 1)
    ).rejects.toThrow('Bitflow API rate limited');
  });
});
