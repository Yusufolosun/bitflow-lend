import React, { useState } from 'react';
import { Wallet, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Manual balance refresh initiated');
      await refreshBalance();
      await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('Error during manual refresh:', error);
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

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-xl">
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-500 border-t-transparent"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button
        onClick={connectWallet}
        className="btn btn-primary text-sm"
      >
        <Wallet size={18} />
        <span>Connect Wallet</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Balance Display */}
      <div className="px-3 py-1.5 bg-gray-100/80 rounded-xl flex items-center gap-2 border border-gray-200/60">
        <div>
          <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Balance</div>
          <div className="text-sm font-bold text-gray-900 tabular-nums">
            {formatBalance(balanceSTX)} STX
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1.5 hover:bg-gray-200/80 rounded-lg transition-colors"
          title="Refresh Balance"
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
        <div className="text-[10px] text-accent-500 font-medium uppercase tracking-wider">Connected</div>
        <div className="text-sm font-mono font-bold text-accent-900">
          {address && formatAddress(address)}
        </div>
      </div>

      {/* Disconnect Button */}
      <button
        onClick={disconnectWallet}
        className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100"
        title="Disconnect Wallet"
      >
        <LogOut size={16} />
        <span className="text-sm font-semibold">Disconnect</span>
      </button>
    </div>
  );
};

export default WalletConnect;
