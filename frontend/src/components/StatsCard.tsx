import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * Trend indicator interface
 */
interface Trend {
  value: number;
  isPositive: boolean;
}

/**
 * StatsCard Props
 */
interface StatsCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: Trend;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  subtitle?: string;
}

/**
 * StatsCard Component
 * Reusable card for displaying protocol statistics with colored accent
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  icon,
  label,
  value,
  trend,
  color = 'blue',
  subtitle,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-primary-100',
      text: 'text-primary-800',
      accent: 'border-t-primary-700',
    },
    green: {
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      accent: 'border-t-emerald-500',
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      accent: 'border-t-purple-500',
    },
    orange: {
      bg: 'bg-accent-50',
      text: 'text-accent-600',
      accent: 'border-t-accent-500',
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      accent: 'border-t-red-500',
    },
    yellow: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      accent: 'border-t-amber-500',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`card-elevated card-hover border-t-2 ${colors.accent}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 ${colors.bg} rounded-xl`}>
          <div className={colors.text}>{icon}</div>
        </div>
        
        {trend && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp size={14} />
            ) : (
              <TrendingDown size={14} />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <div className="text-sm font-medium text-gray-500 mb-1.5">{label}</div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight">{value}</div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;
