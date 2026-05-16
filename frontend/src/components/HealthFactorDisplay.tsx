import React from 'react';
import { Shield, AlertTriangle, XCircle, Activity, CheckCircle } from 'lucide-react';
import { getHealthStatus } from '../utils/calculations';

interface HealthFactorDisplayProps {
  healthFactor: number | null | undefined;
  size?: 'sm' | 'md' | 'lg';
}

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
  return null;
};
