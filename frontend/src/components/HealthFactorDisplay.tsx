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
  return null;
};
