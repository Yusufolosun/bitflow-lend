import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { bitflowClient } from '../utils/bitflowClient';
import { Activity, RefreshCw, AlertTriangle } from 'lucide-react';
import { useBitflowTokens } from '../hooks/useBitflowTokens';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { formatBitflowTokenLabel } from '../utils/bitflowTokens';
import { formatSTX } from '../utils/formatters';
import { extractEstimatedOutput, getRouteLabel, type PreviewRoute } from '../utils/collateralPreviewUtils';
import { TOKEN_RATE_COPY } from '../constants/messages';

type QuoteResult = Awaited<ReturnType<BitflowSDK['getQuoteForRoute']>>;

interface TokenRateState {
  tokenId: string;
  name: string;
  rate: number | null;
  routeLabel: string;
  error: string | null;
}

interface TokenRateCardProps {
  rate: TokenRateState;
}

const STX_TOKEN_ID = 'token-stx';
const REFRESH_INTERVAL_MS = 60_000;
const QUOTE_AMOUNT = 1;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const extractQuoteRate = (quoteResult: QuoteResult): number | null => {
  const bestRoute = quoteResult.bestRoute as PreviewRoute | null;
  return extractEstimatedOutput(bestRoute);
};

const TickerSkeleton = () => (
  <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="min-w-[14rem] sm:min-w-[15rem] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 animate-pulse snap-start"
      >
        <div className="h-3 w-20 rounded-full bg-white/10" />
        <div className="mt-3 h-6 w-28 rounded-full bg-white/10" />
        <div className="mt-2 h-3 w-full rounded-full bg-white/10" />
        <div className="mt-2 h-3 w-5/6 rounded-full bg-white/10" />
      </div>
    ))}
  </div>
);

const TokenRateCard: React.FC<TokenRateCardProps> = ({ rate }) => (
  <div className="min-w-[14rem] sm:min-w-[15rem] shrink-0 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 shadow-sm shadow-black/10 snap-start">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-white">{rate.name}</span>
      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
        {TOKEN_RATE_COPY.stxBadge}
      </span>
    </div>

    <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
      {rate.rate !== null ? `${formatSTX(rate.rate, 4)} STX` : TOKEN_RATE_COPY.rateUnavailable}
    </p>

    <p className="mt-2 text-xs text-slate-300">
      {rate.rate !== null
        ? TOKEN_RATE_COPY.rateApprox(rate.name, formatSTX(rate.rate, 4))
        : rate.error ?? TOKEN_RATE_COPY.rateUnavailableDetail}
    </p>

    <p className="mt-2 truncate text-[11px] leading-relaxed text-slate-400">
      {rate.routeLabel}
    </p>
  </div>
);

/**
 * Compact ticker that shows live Bitflow swap quotes against STX.
 */
export const TokenRateTicker: React.FC = () => {
  const { tokens, loading, error } = useBitflowTokens();
  const [rates, setRates] = useState<TokenRateState[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const refreshInFlightRef = useRef(false);

  const refreshRates = useCallback(async () => {
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;

    if (tokens.length === 0) {
      setRates([]);
      setLastUpdated(null);
      setIsRefreshing(false);
      refreshInFlightRef.current = false;
      return;
    }

    setIsRefreshing(true);

    try {
      const settledRates = await Promise.allSettled(
        tokens.map(async (token) => {
          const quoteResult = await bitflowClient.getQuoteForRoute(token.tokenId, STX_TOKEN_ID, QUOTE_AMOUNT);
          const rate = extractQuoteRate(quoteResult);

          if (rate === null) {
            throw new Error(TOKEN_RATE_COPY.noLiveRoute);
          }

          return {
            tokenId: token.tokenId,
            name: formatBitflowTokenLabel(token.name, token.tokenId),
            rate,
            routeLabel: getRouteLabel(quoteResult.bestRoute as PreviewRoute | null),
            error: null,
          } satisfies TokenRateState;
        })
      );

      const nextRates = settledRates.map((result, index) => {
        const token = tokens[index];

        if (result.status === 'fulfilled') {
          return result.value;
        }

        return {
          tokenId: token.tokenId,
          name: formatBitflowTokenLabel(token.name, token.tokenId),
          rate: null,
          routeLabel: TOKEN_RATE_COPY.routeUnavailableLabel,
          error: getErrorMessage(result.reason, TOKEN_RATE_COPY.errorFallback),
        } satisfies TokenRateState;
      });

      const hasSuccessfulRate = nextRates.some((rate) => rate.rate !== null);

      setRates(nextRates);

      if (hasSuccessfulRate) {
        setLastUpdated(new Date());
      }
    } finally {
      setIsRefreshing(false);
      refreshInFlightRef.current = false;
    }
  }, [tokens]);

  useSmartPolling(refreshRates, REFRESH_INTERVAL_MS, tokens.length > 0 && !error);

  useEffect(() => {
    if (!error) {
      return;
    }

    setRates([]);
    setLastUpdated(null);
    setIsRefreshing(false);
  }, [error]);

  const isQuoteLoading = tokens.length > 0 && rates.length === 0;
  const hasRates = rates.length > 0;

  return (
    <section className="mb-8" aria-label={TOKEN_RATE_COPY.sectionAriaLabel}>
      <div className="overflow-hidden rounded-3xl border border-gray-200/70 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white shadow-elevated">
        <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <Activity size={18} aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{TOKEN_RATE_COPY.headerKicker}</p>
              <h3 className="text-lg font-semibold tracking-tight text-white">{TOKEN_RATE_COPY.headerTitle}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-300">
            {isRefreshing && <RefreshCw size={13} className="animate-spin" aria-hidden="true" />}
            <span>{isRefreshing ? TOKEN_RATE_COPY.refreshing : TOKEN_RATE_COPY.live}</span>
            {lastUpdated && <span>{TOKEN_RATE_COPY.updatedAt(lastUpdated.toLocaleTimeString())}</span>}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-4">
          {loading || isQuoteLoading ? (
            <TickerSkeleton />
          ) : error ? (
            <div className="flex items-center gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-4 text-sm text-amber-100">
              <AlertTriangle size={16} className="shrink-0 text-amber-300" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : !hasRates ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-slate-300">
              {TOKEN_RATE_COPY.noTokens}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin snap-x snap-mandatory scroll-smooth" style={{ WebkitOverflowScrolling: 'touch' }} aria-live="polite">
              {rates.map((rate) => (
                <TokenRateCard key={rate.tokenId} rate={rate} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TokenRateTicker;
