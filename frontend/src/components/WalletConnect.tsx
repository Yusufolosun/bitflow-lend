import React, { useState } from 'react';
import { Wallet, LogOut, RefreshCw, Copy, Check } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToastContext } from './ToastProvider';
import { COMMON_STATUS, WALLET_COPY } from '../constants/messages';

/**
 * WalletConnect Component
 * Polished wallet connection button and user information display
 */
export const WalletConnect: React.FC = () => {
  const { 
    isConnected, 
    address, 
    balanceSTX, 
    isLoading,
    connectWallet, 
    disconnectWallet,
    refreshBalance,
  } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToastContext();

  const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshError(null);
    try {
      await refreshBalance();
    } catch (error: unknown) {
      const message = getErrorMessage(error, WALLET_COPY.refreshFailedFallback);
      setRefreshError(message);
      toast.error(WALLET_COPY.refreshFailedToastTitle, { message });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatBalance = (balance: number): string => {
    return balance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleCopyAddress = async () => {
    if (!address) return;

    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success(WALLET_COPY.addressCopiedToast);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(WALLET_COPY.addressCopyFailedToast);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-500 border-t-transparent"></div>
        <span className="text-sm text-gray-600">{COMMON_STATUS.loadingWallet}</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button type="button"
        onClick={connectWallet}
        className="btn btn-primary text-sm"
      >
        <Wallet size={18} />
        <span>{WALLET_COPY.connect}</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Balance Display */}
      <div className="px-3 py-1.5 bg-gray-100/80 rounded-xl flex items-center gap-2 border border-gray-200/60">
        <div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{WALLET_COPY.balanceLabel}</div>
          <div className="text-sm font-bold text-gray-900 tabular-nums">
            {formatBalance(balanceSTX)} STX
          </div>
          {refreshError && (
            <div className="text-[10px] text-red-500 font-medium mt-0.5">
              {WALLET_COPY.refreshFailedInline}
            </div>
          )}
        </div>
        <button type="button"
          onClick={handleRefresh}
          className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors"
          title={WALLET_COPY.refreshBalanceTitle}
          aria-label={WALLET_COPY.refreshBalanceAria}
          disabled={isRefreshing}
        >
          <RefreshCw 
            size={14} 
            className={`text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </button>
      </div>

      {/* Address Display */}
      <div className="px-3 py-1.5 bg-accent-50/80 rounded-xl border border-accent-100">
        <div className="text-[10px] text-accent-500 font-medium uppercase tracking-wider">{WALLET_COPY.connectedLabel}</div>
        <div className="flex items-center gap-1.5">
          <div className="text-sm font-mono font-bold text-accent-900">
            {address && formatAddress(address)}
          </div>
          <button
            type="button"
            onClick={handleCopyAddress}
            className="p-1 rounded hover:bg-accent-100 transition-colors"
            title={copied ? WALLET_COPY.copiedAddressTitle : WALLET_COPY.copyAddressTitle}
            aria-label={WALLET_COPY.copyAddressAria}
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-accent-700" />}
          </button>
        </div>
      </div>

      {/* Disconnect Button */}
      <button type="button"
        onClick={disconnectWallet}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
        title={WALLET_COPY.disconnect}
        aria-label={WALLET_COPY.disconnect}
      >
        <LogOut size={16} />
        <span className="text-sm font-semibold">{WALLET_COPY.disconnect}</span>
      </button>
    </div>
  );
};

export default WalletConnect;

