import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { BitflowSDK } from '@bitflowlabs/core-sdk';
import { TokenRateTicker } from '../TokenRateTicker';

const mockGetQuoteForRoute = vi.hoisted(() => vi.fn());
const mockUseBitflowTokens = vi.hoisted(() => vi.fn());

vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getQuoteForRoute = mockGetQuoteForRoute;
  },
}));

vi.mock('../../hooks/useBitflowTokens', () => ({
  useBitflowTokens: () => mockUseBitflowTokens(),
}));

vi.mock('lucide-react', () => ({
  Activity: () => <span>Activity</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  AlertTriangle: () => <span>AlertTriangle</span>,
}));

type QuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;

const createQuote = (quote: number, tokenPath: string[]): QuoteResult => ({
  bestRoute: {
    route: {
      dex_path: ['alex'],
      token_path: tokenPath,
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
    quote,
    tokenYAmount: quote,
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
    tokenPath,
    tokenXDecimals: 6,
    tokenYDecimals: 6,
  },
  allRoutes: [],
  inputData: {
    tokenX: tokenPath[0],
    tokenY: tokenPath[tokenPath.length - 1],
    amountInput: 1,
  },
});

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('TokenRateTicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the loading skeleton while Bitflow tokens are being discovered', () => {
    mockUseBitflowTokens.mockReturnValue({
      tokens: [],
      loading: true,
      error: null,
    });

    const { container } = render(<TokenRateTicker />);

    expect(screen.getByText('Swap rates against STX')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('renders live quotes and refreshes them on the polling interval', async () => {
    mockUseBitflowTokens.mockReturnValue({
      tokens: [
        { tokenId: 'token-usda', name: 'USDA', decimals: 6 },
        { tokenId: 'token-stxbtc', name: 'STXBTC', decimals: 6 },
      ],
      loading: false,
      error: null,
    });

    mockGetQuoteForRoute
      .mockResolvedValueOnce(createQuote(1.02, ['token-usda', 'token-stx']))
      .mockResolvedValueOnce(createQuote(0.0045, ['token-stxbtc', 'token-stx']))
      .mockResolvedValueOnce(createQuote(1.01, ['token-usda', 'token-stx']))
      .mockResolvedValueOnce(createQuote(0.0048, ['token-stxbtc', 'token-stx']));

    render(<TokenRateTicker />);

    await waitFor(() => {
      expect(screen.getByText('1.0200 STX')).toBeInTheDocument();
    });

    expect(screen.getByText('USDA')).toBeInTheDocument();
    expect(screen.getByText('STXBTC')).toBeInTheDocument();
    expect(screen.getByText(/USDA → STX via ALEX/i)).toBeInTheDocument();
    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-usda', 'token-stx', 1);
    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-stxbtc', 'token-stx', 1);
    expect(mockGetQuoteForRoute).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    await flushPromises();

    expect(mockGetQuoteForRoute).toHaveBeenCalledTimes(4);
    expect(screen.getByText('1.0100 STX')).toBeInTheDocument();
    expect(screen.getByText('0.0048 STX')).toBeInTheDocument();
  });

  it('shows a readable error when Bitflow token discovery fails', () => {
    mockUseBitflowTokens.mockReturnValue({
      tokens: [],
      loading: false,
      error: 'Bitflow unavailable',
    });

    render(<TokenRateTicker />);

    expect(screen.getByText('Bitflow unavailable')).toBeInTheDocument();
    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('keeps the timestamp blank when every quote request fails', async () => {
    mockUseBitflowTokens.mockReturnValue({
      tokens: [
        { tokenId: 'token-usda', name: 'USDA', decimals: 6 },
      ],
      loading: false,
      error: null,
    });

    mockGetQuoteForRoute.mockRejectedValue(new Error('No route available'));

    render(<TokenRateTicker />);

    await waitFor(() => {
      expect(screen.getByText('No route available')).toBeInTheDocument();
    });

    expect(screen.getByText('Unavailable')).toBeInTheDocument();
    expect(screen.queryByText(/Updated /i)).not.toBeInTheDocument();
  });
});