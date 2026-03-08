import React from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { Toast as ToastType } from '../hooks/useToast';
import { getExplorerUrl } from '../config/contracts';

/**
 * Individual Toast notification component props
 */
interface ToastItemProps {
  toast: ToastType;
  onDismiss: (id: string) => void;
}

/**
 * Icon and color mapping for toast types
 */
const toastStyles = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-600',
    border: 'border-green-700',
    iconColor: 'text-green-100',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-600',
    border: 'border-red-700',
    iconColor: 'text-red-100',
  },
  info: {
    icon: Info,
    bg: 'bg-accent-500',
    border: 'border-blue-700',
    iconColor: 'text-blue-100',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-500',
    border: 'border-yellow-600',
    iconColor: 'text-yellow-100',
  },
};

/**
 * Single toast notification item
 */
const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  return (
    <div
      className={`${style.bg} ${style.border} border text-white rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[420px] animate-toast-slide-up`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${style.iconColor} flex-shrink-0 mt-0.5`} />
        
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && (
            <p className="text-xs opacity-90 mt-1">{toast.message}</p>
          )}
          {toast.txId && (
            <a
              href={getExplorerUrl(toast.txId)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-2 opacity-90 hover:opacity-100 underline"
            >
              View on Explorer
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        <button
          onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

/**
 * Toast Container Props
 */
interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: string) => void;
}

/**
 * ToastContainer Component
 * Renders a stack of toast notifications in the bottom-right corner
 */
export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastContainer;
