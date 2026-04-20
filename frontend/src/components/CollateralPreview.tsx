import React, { useEffect, useState } from 'react';
import { ArrowRight, AlertTriangle, Coins, RefreshCw } from 'lucide-react';
import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { formatSTX, formatUSD } from '../utils/formatters';
import {
  extractEstimatedOutput,
  extractPriceImpact,
  formatPriceImpact,
  getRouteLabel,
  normalizeAmount,
  type BitflowQuoteResult,
  type PreviewRoute,
} from './collateralPreviewUtils';

type PreviewQuoteResult = Omit<BitflowQuoteResult, 'bestRoute'> & {
  bestRoute: PreviewRoute | null;
};

interface CollateralPreviewProps {
  stxAmount: number;
  className?: string;
}

type PreviewStatus = 'idle' | 'loading' | 'success' | 'error';

const bitflow = new BitflowSDK();
const DEBOUNCE_MS = 500;
const INPUT_TOKEN = 'token-stx';
const OUTPUT_TOKEN = 'token-usda';

/**
 * CollateralPreview Component
 * Shows a live Bitflow quote for the collateral amount the user is entering.
 */
export const CollateralPreview: React.FC<CollateralPreviewProps> = ({ stxAmount, className = '' }) => {
  const [status, setStatus] = useState<PreviewStatus>('idle');
  const [quote, setQuote] = useState<PreviewQuoteResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshSeed, setRefreshSeed] = useState(0);

  useEffect(() => {
    const normalizedAmount = normalizeAmount(stxAmount);

    if (normalizedAmount === null) {
      setStatus('idle');
      setQuote(null);
      setErrorMessage(null);
      return undefined;
    }

    let active = true;
    setStatus('loading');
    setErrorMessage(null);

    const timeoutId = window.setTimeout(async () => {
      try {
        const quoteResult = await bitflow.getQuoteForRoute(INPUT_TOKEN, OUTPUT_TOKEN, normalizedAmount);
        const bestRoute = quoteResult.bestRoute as PreviewRoute | null;
        const estimatedOutput = extractEstimatedOutput(bestRoute);

        if (!bestRoute || estimatedOutput === null) {
          throw new Error('Bitflow did not return a live route for this amount.');
        }

        if (!active) {
          return;
        }

        setQuote(quoteResult as PreviewQuoteResult);
        setStatus('success');
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        setQuote(null);
        setStatus('error');
        setErrorMessage(error instanceof Error && error.message ? error.message : 'Unable to load the live Bitflow preview right now.');
      }
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [stxAmount, refreshSeed]);

  const normalizedAmount = normalizeAmount(stxAmount);
  const bestRoute = quote?.bestRoute ?? null;
  const estimatedOutput = extractEstimatedOutput(bestRoute);
  const priceImpact = extractPriceImpact(bestRoute);
  const routeLabel = getRouteLabel(bestRoute);

  if (normalizedAmount === null) {
    return (
      <div
        className={`rounded-2xl border border-dashed border-[#43515f] bg-[#1F2A37] px-4 py-4 text-slate-200 shadow-sm ${className}`}
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F15A22]/15 ring-1 ring-[#F15A22]/30">
            <Coins size={18} className="text-[#F15A22]" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Collateral preview</p>
            <p className="text-sm text-slate-200">Enter an STX amount to preview its USDA value.</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div
        className={`rounded-2xl border border-slate-700 bg-gradient-to-br from-[#1F2A37] via-[#223140] to-[#111827] px-4 py-4 text-white shadow-lg shadow-slate-950/20 ${className}`}
        role="status"
        aria-live="polite"
        aria-label="Loading collateral preview"
      >
        <span className="sr-only">Loading Bitflow collateral preview</span>
        <div className="animate-pulse space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10" />
            <div className="space-y-2">
              <div className="h-3 w-32 rounded-full bg-white/10" />
              <div className="h-4 w-48 rounded-full bg-white/10" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="h-8 w-40 rounded-full bg-white/10" />
            <div className="h-3 w-full rounded-full bg-white/10" />
            <div className="h-3 w-5/6 rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className={`rounded-2xl border border-[#4b2b21] bg-gradient-to-br from-[#1F2A37] via-[#2b2020] to-[#171c23] px-4 py-4 text-slate-100 shadow-lg shadow-slate-950/20 ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F15A22]/15 ring-1 ring-[#F15A22]/30">
            <AlertTriangle size={18} className="text-[#F15A22]" aria-hidden="true" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Preview unavailable</p>
              <p className="mt-1 text-sm font-medium text-white">We could not load the live Bitflow route.</p>
            </div>
            <p className="text-sm text-slate-300">{errorMessage}</p>
            <button
              type="button"
              onClick={() => setRefreshSeed((value) => value + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#F15A22]/30 bg-[#F15A22]/10 px-3 py-2 text-sm font-semibold text-[#F15A22] transition-colors hover:bg-[#F15A22]/20"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'success' && estimatedOutput !== null) {
    const outputDecimals = estimatedOutput < 1 ? 4 : 2;

    return (
      <div
        className={`rounded-2xl border border-slate-700 bg-gradient-to-br from-[#1F2A37] via-[#223140] to-[#111827] px-4 py-4 text-slate-100 shadow-lg shadow-slate-950/20 ${className}`}
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F15A22]/15 ring-1 ring-[#F15A22]/30">
              <Coins size={18} className="text-[#F15A22]" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Collateral preview</p>
              <p className="text-sm text-slate-200">Live route for {formatSTX(normalizedAmount)} STX</p>
            </div>
          </div>

          <div className="rounded-full border border-[#F15A22]/25 bg-[#F15A22]/10 px-3 py-1 text-xs font-semibold text-[#F15A22]">
            Bitflow live
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Estimated USDA</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-white">{formatUSD(estimatedOutput, outputDecimals)}</p>
            </div>
            <p className="text-sm text-slate-300">Worth approximately the same as the collateral route below.</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-100">
            <span className="rounded-full bg-slate-950/30 px-3 py-1 font-medium text-slate-100 ring-1 ring-white/10">
              {routeLabel}
            </span>
            {priceImpact !== null && (
              <span className="rounded-full border border-[#F15A22]/25 bg-[#F15A22]/10 px-3 py-1 font-medium text-[#F15A22]">
                Price impact {formatPriceImpact(priceImpact)}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <ArrowRight size={14} className="text-[#F15A22]" aria-hidden="true" />
            <span>Preview updates after you pause typing for half a second.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border border-dashed border-[#43515f] bg-[#1F2A37] px-4 py-4 text-slate-200 shadow-sm ${className}`}
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F15A22]/15 ring-1 ring-[#F15A22]/30">
          <Coins size={18} className="text-[#F15A22]" aria-hidden="true" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Collateral preview</p>
          <p className="text-sm text-slate-200">Waiting for a live Bitflow quote.</p>
        </div>
      </div>
    </div>
  );
};

export default CollateralPreview;