import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorState Component
 * Displays an error message with optional retry button
 */

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error message or description */
  message: string;
  /** Optional retry callback */
  onRetry?: () => void;
  /** Show as compact inline error (default: full card) */
  compact?: boolean;
  /** Optional className */
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl ${className}`}>
        <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-700 flex-1">{message}</span>
        {onRetry && (
          <button type="button"
            onClick={onRetry}
            className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`card-elevated p-8 text-center ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-2xl mb-4">
        <AlertTriangle size={32} className="text-red-500" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{message}</p>

      {onRetry && (
        <button type="button"
          onClick={onRetry}
          className="btn btn-danger text-sm"
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
