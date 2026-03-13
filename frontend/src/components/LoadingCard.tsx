import React from 'react';

/**
 * LoadingCard Component
 * Displays a skeleton loading placeholder that matches card layouts
 */

interface LoadingCardProps {
  /** Number of skeleton lines to show (default: 3) */
  lines?: number;
  /** Show a header skeleton (default: true) */
  showHeader?: boolean;
  /** Optional className override */
  className?: string;
}

export const LoadingCard: React.FC<LoadingCardProps> = ({
  lines = 3,
  showHeader = true,
  className = '',
}) => {
  return (
    <div className={`card-elevated animate-pulse ${className}`} role="status" aria-label="Loading content">
      <span className="sr-only">Loading...</span>
      {/* Header Skeleton */}
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-48" />
          </div>
        </div>
      )}

      {/* Content Skeleton Lines */}
      <div className="space-y-4">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div
              className="h-4 bg-gray-200 rounded"
              style={{ width: `${85 - i * 15}%` }}
            />
            {i === 0 && <div className="h-8 bg-gray-100 rounded w-full" />}
          </div>
        ))}
      </div>

      {/* Footer Skeleton */}
      <div className="mt-6">
        <div className="h-12 bg-gray-200 rounded-xl w-full" />
      </div>
    </div>
  );
};

/**
 * LoadingStats Component
 * Skeleton loader for the protocol stats grid
 */
export const LoadingStats: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-elevated animate-pulse" role="status" aria-label="Loading statistic">
          <span className="sr-only">Loading...</span>
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
          </div>
          <div className="h-3 bg-gray-200 rounded w-24 mb-3" />
          <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      ))}
    </div>
  );
};

export default LoadingCard;
