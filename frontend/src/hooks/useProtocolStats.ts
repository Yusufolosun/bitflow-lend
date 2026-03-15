import { useState, useEffect, useCallback, useRef } from 'react';
import {
  callReadOnlyFunction,
  cvToValue,
} from '@stacks/transactions';
import {
  getNetwork,
  getContractAddress,
  VAULT_CONTRACT,
} from '../config/contracts';

/**
 * Protocol stats returned from the contract's get-protocol-stats function
 */
export interface ProtocolStats {
  totalDeposits: number;
  totalBorrowed: number;
  totalRepaid: number;
  activeLoans: number;
  totalLiquidations: number;
}

/**
 * Safely extract a numeric value from a Clarity response field.
 * Handles: number, bigint, string (with optional 'u' prefix), ClarityValue objects, undefined/null.
 */
const safeNumber = (val: unknown): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'bigint') return Number(val);
  if (typeof val === 'string') {
    const cleaned = val.replace(/^u/, '');
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  // Handle ClarityValue objects that weren't fully unpacked
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>;
    if ('value' in obj) return safeNumber(obj.value);
  }
  return 0;
};

/**
 * Custom hook that fetches real-time protocol statistics from the blockchain
 * Uses the get-protocol-stats read-only function on the vault contract
 *
 * Note: The contract's get-protocol-stats returns:
 *   { total-deposits, total-repaid, total-liquidations, total-outstanding-borrows }
 * active-loans count is not tracked on-chain (requires map enumeration).
 *
 * @param refreshInterval - Auto-refresh interval in ms (default: 30000 = 30s, 0 = disabled)
 */
export const useProtocolStats = (refreshInterval = 30000) => {
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const network = getNetwork();
  const contractAddress = getContractAddress();
  const contractName = VAULT_CONTRACT.name;

  /**
   * Parse protocol stats from a Clarity tuple value
   */
  const parseStats = (data: Record<string, unknown>): ProtocolStats => {
    const totalDeposits = safeNumber(data['total-deposits']) / 1_000_000;
    const totalRepaid = safeNumber(data['total-repaid']) / 1_000_000;
    const totalLiquidations = safeNumber(data['total-liquidations']);

    // total-outstanding-borrows tracks live debt (increments on borrow,
    // decrements on repay/liquidation). active-loans count is not tracked
    // on-chain (would require map enumeration), so always 0.
    const totalBorrowed = safeNumber(data['total-outstanding-borrows']) / 1_000_000;

    return {
      totalDeposits,
      totalBorrowed,
      totalRepaid,
      activeLoans: 0,
      totalLiquidations,
    };
  };

  /**
   * Fetch protocol stats from the contract
   */
  const fetchStats = useCallback(async () => {
    try {
      setError(null);

      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-protocol-stats',
        functionArgs: [],
        senderAddress: contractAddress,
      });

      if (!mountedRef.current) return;

      const data = cvToValue(result);

      if (data && typeof data === 'object') {
        const protocolStats = parseStats(data as Record<string, unknown>);
        setStats(protocolStats);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      setError(err.message || 'Failed to fetch protocol stats');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [network, contractAddress, contractName]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStats();
  }, [fetchStats]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    fetchStats();

    return () => {
      mountedRef.current = false;
    };
  }, [fetchStats]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(() => {
      fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    lastUpdated,
    refresh,
  };
};

export default useProtocolStats;
