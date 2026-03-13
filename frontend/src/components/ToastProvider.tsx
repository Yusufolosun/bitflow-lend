import React, { createContext, useContext } from 'react';
import { useToast, ToastType } from '../hooks/useToast';

/**
 * Toast context value interface
 */
interface ToastContextValue {
  success: (title: string, options?: { message?: string; txId?: string; duration?: number }) => string;
  error: (title: string, options?: { message?: string; txId?: string; duration?: number }) => string;
  info: (title: string, options?: { message?: string; duration?: number }) => string;
  warning: (title: string, options?: { message?: string; duration?: number }) => string;
  addToast: (type: ToastType, title: string, options?: { message?: string; txId?: string; duration?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to access toast notifications from any component
 */
export const useToastContext = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};

/**
 * Toast Provider Props
 */
interface ToastProviderProps {
  children: React.ReactNode;
}

/**
 * ToastProvider Component
 * Wraps the app and provides toast notification functionality to all children
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={{
      success: toast.success,
      error: toast.error,
      info: toast.info,
      warning: toast.warning,
      addToast: toast.addToast,
      removeToast: toast.removeToast,
      clearToasts: toast.clearToasts,
    }}>
      {children}
      {/* ToastContainer is rendered inside the provider to access toasts */}
      {toast.toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3" aria-live="polite" aria-atomic="false">
          {toast.toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={toast.removeToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

// Inline ToastItem to avoid circular imports
import { CheckCircle, XCircle, Info, AlertTriangle, X, ExternalLink } from 'lucide-react';
import { getExplorerUrl } from '../config/contracts';
import { Toast } from '../hooks/useToast';

const toastStyles = {
  success: { icon: CheckCircle, bg: 'bg-green-600' },
  error: { icon: XCircle, bg: 'bg-red-600' },
  info: { icon: Info, bg: 'bg-accent-500' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500' },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type];
  const Icon = style.icon;

  return (
    <div className={`${style.bg} text-white rounded-lg shadow-2xl p-4 min-w-[320px] max-w-[420px] animate-toast-slide-up`} role="alert">
      <div className="flex items-start gap-3">
        <Icon size={20} className="flex-shrink-0 mt-0.5 opacity-90" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{toast.title}</p>
          {toast.message && <p className="text-xs opacity-90 mt-1">{toast.message}</p>}
          {toast.txId && (
            <a href={getExplorerUrl(toast.txId)} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs mt-2 opacity-90 hover:opacity-100 underline">
              View on Explorer <ExternalLink size={10} />
            </a>
          )}
        </div>
        <button onClick={() => onDismiss(toast.id)}
          className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default ToastProvider;
