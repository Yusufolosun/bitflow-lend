import { useState, useEffect, useCallback } from 'react';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { WalletState } from '../types/vault';
import { ACTIVE_NETWORK } from '../config/contracts';

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

  // Initialize app config and user session
  const appConfig = new AppConfig(['store_write', 'publish_data']);
  const userSession = new UserSession({ appConfig });

  // Get the appropriate network
  const network = ACTIVE_NETWORK === 'testnet' 
    ? new StacksTestnet() 
    : new StacksMainnet();

  /**
   * Fetch STX balance for a given address
   */
  const fetchBalance = useCallback(async (address: string): Promise<bigint | null> => {
    try {
      const apiUrl = ACTIVE_NETWORK === 'testnet'
        ? 'https://api.testnet.hiro.so'
        : 'https://api.mainnet.hiro.so';

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
      const userData = userSession.loadUserData();
      const address = userData.profile.stxAddress[ACTIVE_NETWORK];
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
  }, [userSession, fetchBalance, isSignedIn]);

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
  }, [userSession]);

  /**
   * Refresh balance
   */
  const refreshBalance = useCallback(async () => {
    const currentState = walletState;
    if (currentState.address) {
      try {
        const balance = await fetchBalance(currentState.address);
        if (balance !== null) {
          const balanceSTX = Number(balance) / 1_000_000;
          setWalletState(prev => ({
            ...prev,
            balance,
            balanceSTX,
          }));
        }
      } catch {
      }
    }
  }, [walletState, fetchBalance]);

  // Check if user is already signed in on mount
  useEffect(() => {
    const initializeAuth = async () => {
      if (isSignedIn()) {
        const userData = userSession.loadUserData();
        const address = userData.profile.stxAddress[ACTIVE_NETWORK];
        
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
  }, [userSession, fetchBalance, isSignedIn]);

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
