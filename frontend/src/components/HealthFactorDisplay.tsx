import React from 'react';
import { Shield, AlertTriangle, XCircle, Activity, CheckCircle } from 'lucide-react';
import { getHealthStatus } from '../utils/calculations';

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
export const HealthFactorDisplay: React.FC<HealthFactorDisplayProps> = ({ 
  healthFactor, 
  size = 'md' 
}) => {
  // Explicit null/undefined check for loading/skeleton state
  if (healthFactor === null || healthFactor === undefined) {
    return (
      <div 
        className={`bg-gray-100 animate-pulse rounded-lg ${
          size === 'sm' ? 'h-6 w-20' : size === 'md' ? 'h-10 w-32' : 'h-16 w-48'
        }`}
        data-testid="hf-loading-skeleton"
        aria-label="Loading health factor"
      />
    );
  }

  // Explicit check for 0 health factor — most critical state
  if (healthFactor === 0) {
    return (
      <div 
        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-1"
        data-testid="hf-critical-alert"
        role="alert"
      >
        <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-900 mb-1">
            Critical Liquidation Risk!
          </h4>
          <p className="text-xs text-red-800 leading-relaxed">
            Health Factor: 0 — Position subject to immediate liquidation. Add collateral or repay now.
          </p>
        </div>
      </div>
    );
  }

  // Determine health status and styles
  // If user passes decimal version (e.g., 1.1), we normalize to percentage (110%)
  const isDecimal = healthFactor > 0 && healthFactor < 10;
  const normalizedHF = isDecimal ? healthFactor * 100 : healthFactor;
  const status = getHealthStatus(normalizedHF);
  
  const colors = {
    healthy: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    warning: 'text-amber-600 bg-amber-50 border-amber-100',
    critical: 'text-red-600 bg-red-50 border-red-100'
  };

  const badgeColors = {
    healthy: 'bg-emerald-200 text-emerald-800',
    warning: 'bg-amber-200 text-amber-800',
    critical: 'bg-red-200 text-red-800'
  };

  const StatusIcon = status === 'healthy' ? CheckCircle : status === 'warning' ? AlertTriangle : Activity;

  return (
    <div 
      className={`rounded-xl border transition-all ${colors[status]} ${
        size === 'sm' ? 'p-2' : size === 'md' ? 'p-4' : 'p-6'
      }`}
      data-testid={`hf-display-${status}`}
    >
      <div className="flex items-center gap-3">
        <StatusIcon size={size === 'sm' ? 18 : 22} />
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${
              size === 'sm' ? 'text-base' : size === 'md' ? 'text-2xl' : 'text-4xl'
            }`}>
              {normalizedHF.toFixed(0)}%
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${badgeColors[status]}`}>
              {status}
            </span>
          </div>
          {size !== 'sm' && (
            <p className="text-[10px] opacity-70 font-medium mt-1 uppercase tracking-tight">
              Health Factor (On-chain)
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
