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
  return null;
};
