import React, { useMemo } from 'react';
import { Shield, AlertTriangle, XCircle, Activity, CheckCircle } from 'lucide-react';
import { getHealthStatus } from '../utils/calculations';
import { HEALTH_FACTOR_COPY } from '../constants/messages';

/**
 * Visual styles for different health statuses
 */
const COLORS = {
  healthy: 'text-emerald-600 bg-emerald-50 border-emerald-100',
  warning: 'text-amber-600 bg-amber-50 border-amber-100',
  critical: 'text-red-600 bg-red-50 border-red-100'
};

const BADGE_COLORS = {
  healthy: 'bg-emerald-200 text-emerald-800',
  warning: 'bg-amber-200 text-amber-800',
  critical: 'bg-red-200 text-red-800'
};

/**
 * HealthFactorDisplayProps
 * @property healthFactor - The health factor percentage (0-100+) or decimal (0-2.0+)
 * @property size - Visual size of the component
 */
interface HealthFactorDisplayProps {
  healthFactor: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * HealthFactorDisplay Component
 * Renders the user's health factor with appropriate status indicators.
 * Handles 0, null, and undefined states gracefully with alerts and skeletons.
 */
export const HealthFactorDisplay: React.FC<HealthFactorDisplayProps> = React.memo(({ 
  healthFactor, 
  size = 'md' 
}) => {
  // Explicit null/undefined check for loading/skeleton state
  if (healthFactor === null || healthFactor === undefined) {
    return (
      <div 
        className={`bg-gray-100 animate-pulse rounded-lg shadow-inner ${
          size === 'sm' ? 'h-6 w-20' : size === 'md' ? 'h-12 w-32' : 'h-20 w-48'
        }`}
        data-testid="hf-loading-skeleton"
        aria-label={HEALTH_FACTOR_COPY.loadingAria}
      />
    );
  }

  // Explicit check for 0 health factor — most critical state
  if (healthFactor === 0) {
    return (
      <div 
        className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-2 duration-300"
        data-testid="hf-critical-alert"
        role="alert"
      >
        <div className="p-2 bg-red-100 rounded-lg">
          <XCircle className="text-red-600 flex-shrink-0" size={24} />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-900 mb-1 leading-none pt-1">
            {HEALTH_FACTOR_COPY.criticalTitle}
          </h4>
          <p className="text-xs text-red-800 leading-relaxed font-medium">
            {HEALTH_FACTOR_COPY.criticalMessage}
          </p>
        </div>
      </div>
    );
  }

  // Determine health status and styles
  const numericHF = typeof healthFactor === 'number' ? healthFactor : Number(healthFactor);
  
  if (isNaN(numericHF)) {
    return (
      <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
        {HEALTH_FACTOR_COPY.invalidValue}
      </div>
    );
  }

  // If user passes decimal version (e.g., 1.1), we normalize to percentage (110%)
  const isDecimal = numericHF > 0 && numericHF < 10;
  const normalizedHF = useMemo(() => isDecimal ? numericHF * 100 : numericHF, [numericHF, isDecimal]);
  const status = useMemo(() => getHealthStatus(normalizedHF), [normalizedHF]);
  const statusLabel = HEALTH_FACTOR_COPY.statusLabels[status];
  
  const StatusIcon = useMemo(() => {
    return status === 'healthy' ? CheckCircle : status === 'warning' ? AlertTriangle : Activity;
  }, [status]);

  return (
    <div 
      className={`rounded-xl border-2 transition-all duration-500 hover:shadow-lg animate-in fade-in zoom-in-95 ${COLORS[status]} ${
        size === 'sm' ? 'p-2' : size === 'md' ? 'p-4' : 'p-6'
      }`}
      data-testid={`hf-display-${status}`}
      role="status"
      aria-live="polite"
      aria-label={HEALTH_FACTOR_COPY.ariaLabel(normalizedHF.toFixed(0), statusLabel)}
    >
      <div className="flex items-center gap-3">
        <StatusIcon size={size === 'sm' ? 18 : 22} />
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-extrabold tabular-nums ${
              size === 'sm' ? 'text-lg' : size === 'md' ? 'text-3xl' : 'text-5xl'
            }`}>
              {normalizedHF.toFixed(0)}%
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${BADGE_COLORS[status]}`}>
              {statusLabel}
            </span>
          </div>
          {size !== 'sm' && (
            <div className="flex items-center gap-1.5 mt-1.5 opacity-70">
              <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-widest">
                {HEALTH_FACTOR_COPY.sourceLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

HealthFactorDisplay.displayName = 'HealthFactorDisplay';

