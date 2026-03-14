import React, { useState, useCallback } from 'react';
import { TrendingUp, DollarSign, Activity, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { StatsCard } from './StatsCard';
import { WalletConnect } from './WalletConnect';
import { DepositCard } from './DepositCard';
import { BorrowCard } from './BorrowCard';
import { RepayCard } from './RepayCard';
import { HealthMonitor } from './HealthMonitor';
import { TransactionHistory } from './TransactionHistory';
import { NetworkIndicator } from './NetworkIndicator';
import { formatSTX } from '../utils/formatters';
import { ACTIVE_NETWORK } from '../config/contracts';
import { getHealthStatus } from '../utils/calculations';
import { useProtocolStats } from '../hooks/useProtocolStats';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { useStxPrice } from '../hooks/useStxPrice';
import { LoadingStats } from './LoadingCard';
import { ErrorState } from './ErrorState';

/**
 * Dashboard Component
 * Main dashboard layout with protocol stats and user portfolio
 */
export const Dashboard: React.FC = () => {
  const { address, balanceSTX, userSession } = useAuth();
  const vault = useVault(userSession, address);
  const { stats: protocolStats, isLoading: statsLoading, error: statsError, lastUpdated: statsLastUpdated, refresh: refreshStats } = useProtocolStats(30000);
  const { price: stxPrice } = useStxPrice();

  // Protocol stats derived from hook
  const totalValueLocked = protocolStats?.totalDeposits ?? 0;
  const totalBorrowed = protocolStats?.totalBorrowed ?? 0;
  const totalRepaid = protocolStats?.totalRepaid ?? 0;
  const activeUsers = protocolStats?.activeLoans ?? 0;

  // User portfolio
  const [userDeposit, setUserDeposit] = useState(0);
  const [userLoan, setUserLoan] = useState<any>(null);
  const [userHealthFactor, setUserHealthFactor] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Protocol stats now fetched via useProtocolStats hook (auto-refreshes every 30s)

  // Fetch user portfolio data on a 60s smart interval (pauses when tab hidden)
  const fetchUserData = useCallback(async () => {
    if (!address) return;
    try {
      const deposit = await vault.getUserDeposit();
      setUserDeposit(deposit ? deposit.amountSTX : 0);

      const loan = await vault.getUserLoan();
      setUserLoan(loan);

      if (loan) {
        const health = await vault.getHealthFactor(stxPrice);
        if (health) setUserHealthFactor(health.healthFactorPercent);
      } else {
        setUserHealthFactor(null);
      }
    } catch {
      // Silently swallow — next poll will retry
    }
  }, [address, vault, stxPrice]);

  useSmartPolling(fetchUserData, 60_000, !!address);

  // Manual refresh function for user portfolio
  const refreshUserData = async () => {
    if (!address) {
      setRefreshError('Please connect your wallet first');
      return;
    }

    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const deposit = await vault.getUserDeposit();
      if (deposit) {
        setUserDeposit(deposit.amountSTX);
      } else {
        setUserDeposit(0);
      }

      const loan = await vault.getUserLoan();
      setUserLoan(loan);

      if (loan) {
        const health = await vault.getHealthFactor(stxPrice);
        if (health) {
          setUserHealthFactor(health.healthFactorPercent);
        }
      } else {
        setUserHealthFactor(null);
      }
    } catch (error: any) {
      setRefreshError(error.message || 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate utilization rate
  const utilizationRate = totalValueLocked > 0 
    ? (totalBorrowed / totalValueLocked) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 bg-grid-pattern">
      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="BitFlow Lend" className="h-9" />
              <NetworkIndicator />
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Protocol Stats */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="section-title">Protocol Overview</h2>
              {statsLastUpdated && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Updated {statsLastUpdated.toLocaleTimeString()} · auto-refreshes every 30s
                </p>
              )}
            </div>
            <button
              onClick={refreshStats}
              disabled={statsLoading}
              className="btn btn-ghost text-xs px-3 py-1.5 rounded-lg"
            >
              {statsLoading ? 'Loading...' : 'Refresh Stats'}
            </button>
          </div>

          {/* Loading State */}
          {statsLoading && !protocolStats && <LoadingStats />}

          {/* Error State */}
          {statsError && !protocolStats && (
            <ErrorState
              title="Failed to Load Protocol Stats"
              message={statsError}
              onRetry={refreshStats}
            />
          )}

          {/* Stats Grid */}
          {protocolStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              icon={<DollarSign size={22} />}
              label="Total Value Locked"
              value={formatSTX(totalValueLocked) + ' STX'}
              color="blue"
            />
            <StatsCard
              icon={<TrendingUp size={22} />}
              label="Total Borrowed"
              value={formatSTX(totalBorrowed) + ' STX'}
              color="green"
            />
            <StatsCard
              icon={<Activity size={22} />}
              label="Utilization Rate"
              value={utilizationRate.toFixed(1) + '%'}
              color={utilizationRate >= 90 ? 'red' : utilizationRate >= 70 ? 'yellow' : 'green'}
              subtitle={utilizationRate >= 90 ? 'High — withdrawal risk' : utilizationRate >= 70 ? 'Elevated' : 'Healthy'}
            />
            <StatsCard
              icon={<Users size={22} />}
              label="Active Loans"
              value={activeUsers.toString()}
              color="orange"
            />
          </div>
          )}
        </section>

        {/* User Portfolio */}
        {address && (
          <section className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="section-title">Your Portfolio</h2>
              <button
                onClick={refreshUserData}
                disabled={isRefreshing}
                className="btn btn-primary text-sm px-4 py-2"
              >
                <svg 
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
            </div>
            
            {/* Error Message */}
            {refreshError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2" role="alert">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700">{refreshError}</span>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="card-elevated card-hover">
                <div className="text-sm font-medium text-gray-500 mb-2">Total Deposited</div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                  {formatSTX(userDeposit)} STX
                </div>
                <div className="text-sm text-gray-500">
                  ≈ ${(userDeposit * stxPrice).toLocaleString()} USD
                </div>
              </div>

              <div className="card-elevated card-hover">
                <div className="text-sm font-medium text-gray-500 mb-2">Active Loan</div>
                <div className="text-3xl font-bold text-gray-900 tracking-tight mb-1">
                  {userLoan ? formatSTX(userLoan.amountSTX) : '0.00'} STX
                </div>
                <div className="text-sm text-gray-500">
                  {userLoan 
                    ? `${userLoan.interestRatePercent}% APR` 
                    : 'No active loan'}
                </div>
              </div>

              <div className="card-elevated card-hover">
                <div className="text-sm font-medium text-gray-500 mb-2">Health Factor</div>
                <div className={`text-3xl font-bold tracking-tight mb-1 ${
                  !userLoan ? 'text-gray-400' :
                  userHealthFactor && getHealthStatus(userHealthFactor) === 'healthy' ? 'text-emerald-600' :
                  userHealthFactor && getHealthStatus(userHealthFactor) === 'warning' ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {userHealthFactor ? userHealthFactor.toFixed(0) + '%' : 'N/A'}
                </div>
                <div className="text-sm text-gray-500">
                  {!userLoan ? 'No active loan' :
                   userHealthFactor && getHealthStatus(userHealthFactor) === 'healthy' ? 'Healthy' :
                   userHealthFactor && getHealthStatus(userHealthFactor) === 'warning' ? 'At Risk' : 'Critical'}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Action Cards */}
        {!address ? (
          <section className="mb-8">
            <div className="card-elevated p-12 text-center gradient-mesh rounded-2xl">
              <img src="/favicon.svg" alt="BitFlow" className="w-16 h-16 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-primary-900 mb-3 tracking-tight">
                Welcome to <span className="text-accent-500">BitFlow</span> Lend
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Connect your wallet to start depositing, borrowing, and earning with your STX tokens on Stacks.
              </p>
              <WalletConnect />
            </div>
          </section>
        ) : (
          <section className="mb-8">
            <h2 className="section-title mb-5">Actions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <DepositCard />
                <BorrowCard />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <RepayCard />
                <HealthMonitor />
              </div>
            </div>
          </section>
        )}

        {/* Transaction History */}
        {address && (
          <section className="mb-8">
            <h2 className="section-title mb-5">Transaction History</h2>
            <TransactionHistory />
          </section>
        )}

        {/* Quick Stats Footer */}
        <section>
          <div className="gradient-dark rounded-2xl p-8 text-white shadow-elevated relative overflow-hidden">
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
            
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="text-sm text-gray-400 mb-1 font-medium">Your Wallet Balance</div>
                <div className="text-2xl font-bold tracking-tight">
                  {address ? formatSTX(balanceSTX) : '0.00'} STX
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1 font-medium">Total Repaid (Protocol)</div>
                <div className="text-2xl font-bold tracking-tight">
                  {formatSTX(totalRepaid)} STX
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1 font-medium">Network</div>
                <div className="text-2xl font-bold tracking-tight">
                  Stacks {ACTIVE_NETWORK === 'mainnet' ? 'Mainnet' : 'Testnet'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 mt-16 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <img src="/favicon.svg" alt="BitFlow" className="w-5 h-5" />
              © 2026 BitFlow Lend. Built on Stacks.
            </div>
            <div className="flex gap-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Docs</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">GitHub</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Discord</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Twitter</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
