import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { BitflowSDK } from '@bitflowlabs/core-sdk';
import { CollateralPreview } from '../CollateralPreview';

const mockGetQuoteForRoute = vi.hoisted(() => vi.fn());

vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getQuoteForRoute = mockGetQuoteForRoute;
  },
}));

type QuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;
type PreviewRoute = NonNullable<QuoteResult['bestRoute']> & {
  tokenYAmount?: number | null;
  priceImpact?: number | null;
};
type PreviewQuoteResult = Omit<QuoteResult, 'bestRoute'> & {
  bestRoute: PreviewRoute | null;
};

const createQuote = (overrides: Partial<PreviewRoute> = {}): PreviewQuoteResult => ({
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
    priceImpact: 0.0123,
    ...overrides,
  },
  allRoutes: [],
  inputData: {
    tokenX: 'token-stx',
    tokenY: 'token-usda',
    amountInput: 12.3,
  },
});

const flushPromises = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('CollateralPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the idle prompt when no collateral amount is available', () => {
    render(<CollateralPreview stxAmount={0} />);

    expect(screen.getByText(/Enter an STX amount to preview its USDA value/i)).toBeInTheDocument();
    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();
  });

  it('renders the live quote preview once the Bitflow response resolves', async () => {
    vi.useFakeTimers();

    mockGetQuoteForRoute.mockResolvedValue(createQuote());

    render(<CollateralPreview stxAmount={12.3} />);

    expect(screen.getByLabelText(/Loading collateral preview/i)).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await flushPromises();

    await waitFor(() => {
      expect(screen.getByText('$18.42')).toBeInTheDocument();
    });

    expect(screen.getByText(/STX → USDA via ALEX/i)).toBeInTheDocument();
    expect(screen.getByText(/Price impact 1.23%/i)).toBeInTheDocument();
    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-stx', 'token-usda', 12.3);
  });

  it('debounces rapid collateral changes before calling Bitflow', async () => {
    vi.useFakeTimers();

    mockGetQuoteForRoute.mockResolvedValue(createQuote());

    const { rerender } = render(<CollateralPreview stxAmount={10} />);

    act(() => {
      vi.advanceTimersByTime(250);
    });

    rerender(<CollateralPreview stxAmount={11} />);

    act(() => {
      vi.advanceTimersByTime(249);
    });

    await flushPromises();

    expect(mockGetQuoteForRoute).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    await flushPromises();

    expect(mockGetQuoteForRoute).toHaveBeenCalledWith('token-stx', 'token-usda', 11);
  });

  it('shows an error fallback and retries after the user asks again', async () => {
    vi.useFakeTimers();

    mockGetQuoteForRoute
      .mockRejectedValueOnce(new Error('Bitflow unavailable'))
      .mockResolvedValue(createQuote());

    render(<CollateralPreview stxAmount={12.3} />);

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await flushPromises();

    expect(screen.getByText(/Preview unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/Bitflow unavailable/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Try again/i }));

    act(() => {
      vi.advanceTimersByTime(500);
    });

    await flushPromises();

    await waitFor(() => {
      expect(screen.getByText('$18.42')).toBeInTheDocument();
    });

    expect(mockGetQuoteForRoute).toHaveBeenCalledTimes(2);
  });
});