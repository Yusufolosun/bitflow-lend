import { useState, useEffect, useCallback } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import { WalletState } from '../types/vault';
import { ACTIVE_NETWORK, getApiEndpoint } from '../config/contracts';

// Module-level singletons so identity is stable across renders
const appConfig = new AppConfig(['store_write', 'publish_data']);
const sharedUserSession = new UserSession({ appConfig });
const sharedNetwork = ACTIVE_NETWORK === 'testnet'
  ? STACKS_TESTNET
  : STACKS_MAINNET;
const AUTH_SYNC_EVENT = 'bitflow-auth-sync';

/**
 * Custom hook for wallet authentication
 * Handles wallet connection, disconnection, and user state
 */
export const useAuth = () => {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: BigInt(0),
    balanceSTX: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const userSession = sharedUserSession;
  const network = sharedNetwork;

  const getAddressFromUserData = useCallback((): string | null => {
    try {
      const userData = userSession.loadUserData();
      const stxAddress = userData.profile?.stxAddress as Record<string, string> | undefined;
      return stxAddress?.[ACTIVE_NETWORK] ?? null;
    } catch {
      return null;
    }
  }, [userSession]);

  /**
   * Fetch STX balance for a given address
   */
  const fetchBalance = useCallback(async (address: string): Promise<bigint | null> => {
    try {
      const apiUrl = getApiEndpoint();

      const response = await fetch(`${apiUrl}/v2/accounts/${address}`, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      const balance = BigInt(data.balance || '0');
      return balance;
    } catch {
      // Return null to indicate fetch failure, don't reset to 0
      return null;
    }
  }, []);

  /**
   * Safely check if user is signed in
   * Handles corrupt/stale session data from older @stacks/connect versions
   */
  const isSignedIn = useCallback((): boolean => {
    try {
      return userSession.isUserSignedIn();
    } catch {
      console.warn('Corrupt session data detected, clearing localStorage');
      // Clear stale session data that can't be parsed by current library version
      localStorage.removeItem('blockstack-session');
      return false;
    }
  }, [userSession]);

  /**
   * Update wallet state with current user data
   */
  const updateWalletState = useCallback(async () => {
    if (isSignedIn()) {
      const address = getAddressFromUserData();
      if (!address) {
        setWalletState({
          isConnected: false,
          address: null,
          balance: BigInt(0),
          balanceSTX: 0,
        });
        setIsLoading(false);
        return;
      }
      const balance = await fetchBalance(address);
      
      // Only update if we successfully fetched a balance
      if (balance !== null) {
        const balanceSTX = Number(balance) / 1_000_000;
        setWalletState({
          isConnected: true,
          address,
          balance,
          balanceSTX,
        });
      } else {
        // Keep existing balance if fetch fails, just update connection status
        setWalletState(prev => ({
          ...prev,
          isConnected: true,
          address,
        }));
      }
    } else {
      setWalletState({
        isConnected: false,
        address: null,
        balance: BigInt(0),
        balanceSTX: 0,
      });
    }
    setIsLoading(false);
  }, [fetchBalance, getAddressFromUserData, isSignedIn]);

  /**
   * Connect wallet using Stacks Connect
   */
  const connectWallet = useCallback(() => {
    showConnect({
      appDetails: {
        name: 'BitFlow Lend',
        icon: window.location.origin + '/favicon.svg',
      },
      redirectTo: '/',
      onFinish: async () => {
        // Update state and fetch balance after connect
        await updateWalletState();
        window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
      },
      userSession,
    });
  }, [userSession, updateWalletState]);

  /**
   * Disconnect wallet
   */
  const disconnectWallet = useCallback(() => {
    userSession.signUserOut();
    setWalletState({
      isConnected: false,
      address: null,
      balance: BigInt(0),
      balanceSTX: 0,
    });
    window.dispatchEvent(new Event(AUTH_SYNC_EVENT));
  }, [userSession]);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    const address = walletState.address;
    if (address) {
      try {
        const balance = await fetchBalance(address);
        if (balance !== null) {
          const balanceSTX = Number(balance) / 1_000_000;
          setWalletState(prev => ({
            ...prev,
            balance,
            balanceSTX,
          }));
        } else {
          // Balance fetch returned null, keep existing balance
        }
      } catch {
        console.warn('Failed to refresh wallet balance');
      }
    }
  }, [walletState.address, fetchBalance]);

  // Check if user is already signed in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (isSignedIn()) {
        const address = getAddressFromUserData();
        if (!address) {
          setWalletState({
            isConnected: false,
            address: null,
            balance: BigInt(0),
            balanceSTX: 0,
          });
          setIsLoading(false);
          return;
        }
        
        // Fetch balance first
        const balance = await fetchBalance(address);
        const balanceSTX = balance !== null ? Number(balance) / 1_000_000 : 0;
        
        // Set complete state once with actual balance
        setWalletState({
          isConnected: true,
          address,
          balance: balance || BigInt(0),
          balanceSTX,
        });
      }
      setIsLoading(false);
    };
    
    initializeAuth();
  }, [fetchBalance, getAddressFromUserData, isSignedIn]);

  useEffect(() => {
    const handleSync = () => {
      updateWalletState();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateWalletState();
      }
    };

    window.addEventListener('focus', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener(AUTH_SYNC_EVENT, handleSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener(AUTH_SYNC_EVENT, handleSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [updateWalletState]);

  return {
    // State
    ...walletState,
    isLoading,
    userSession,

    // Actions
    connectWallet,
    disconnectWallet,
    refreshBalance,

    // Helpers
    network,
  };
};

export default useAuth;
