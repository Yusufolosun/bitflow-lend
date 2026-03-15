import React, { useState, useCallback } from 'react';
import { ArrowUpCircle, CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { formatSTX } from '../utils/formatters';
import { PROTOCOL_CONSTANTS, getExplorerUrl } from '../config/contracts';

/**
 * WithdrawCard Component
 * Allows users to withdraw unlocked STX from the vault
 */
export const WithdrawCard: React.FC = () => {
  const { address, userSession } = useAuth();
  const vault = useVault(userSession, address);

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [userDeposit, setUserDeposit] = useState(0);
  const [lockedCollateral, setLockedCollateral] = useState(0);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'timeout'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  const availableBalance = Math.max(0, userDeposit - lockedCollateral);

  // Fetch user's deposit and locked collateral on a 60s smart interval
  const fetchBalance = useCallback(async () => {
    if (!address) return;
    const deposit = await vault.getUserDeposit();
    if (deposit) setUserDeposit(deposit.amountSTX);

    const loan = await vault.getUserLoan();
    if (loan) {
      setLockedCollateral(loan.collateralAmountSTX);
    } else {
      setLockedCollateral(0);
    }
  }, [address, vault.getUserDeposit, vault.getUserLoan]);

  useSmartPolling(fetchBalance, 60_000, !!address);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);

    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      setTxStatus('error');
      return;
    }

    if (amount > availableBalance) {
      setErrorMessage(`Insufficient available balance. You can withdraw up to ${formatSTX(availableBalance)} STX`);
      setTxStatus('error');
      return;
    }

    setTxStatus('pending');
    setErrorMessage('');

    try {
      const result = await vault.withdraw(amount);

      if (result.success && result.txId) {
        setLastTxId(result.txId);
        setErrorMessage('Transaction submitted. Waiting for confirmation...');

        const pollResult = await vault.pollTransactionStatus(result.txId);

        if (pollResult === 'confirmed') {
          setTxStatus('success');
          setWithdrawAmount('');

          const deposit = await vault.getUserDeposit();
          if (deposit) {
            setUserDeposit(deposit.amountSTX);
          }

          setTimeout(() => {
            setTxStatus('idle');
            setErrorMessage('');
          }, 5000);
        } else if (pollResult === 'failed') {
          setTxStatus('error');
          setErrorMessage('Transaction was rejected on-chain. Check the explorer for details.');
        } else {
          setTxStatus('timeout');
          setErrorMessage('');
        }
      } else {
        setTxStatus('error');
        setErrorMessage(result.error || 'Transaction failed');
      }
    } catch (error: any) {
      setTxStatus('error');
      setErrorMessage(error.message || 'An error occurred');
    }
  };

  const handleMaxClick = () => {
    setWithdrawAmount(availableBalance.toString());
  };

  return (
    <div className="card-elevated space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-50 rounded-xl">
          <ArrowUpCircle className="text-purple-600" size={22} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Withdraw STX</h3>
          <p className="text-sm text-gray-500">Withdraw unlocked collateral</p>
        </div>
      </div>

      {/* Balance Display */}
      <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Total Deposit</span>
          <span className="font-semibold text-gray-900">{formatSTX(userDeposit)} STX</span>
        </div>
        {lockedCollateral > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Locked as Collateral</span>
            <span className="font-semibold text-amber-600">-{formatSTX(lockedCollateral)} STX</span>
          </div>
        )}
        <div className="border-t border-gray-200 pt-2 flex justify-between text-sm">
          <span className="text-gray-600 font-medium">Available to Withdraw</span>
          <span className="font-bold text-gray-900">{formatSTX(availableBalance)} STX</span>
        </div>
      </div>

      {/* Withdraw Input */}
      <div className="space-y-2">
        <label htmlFor="withdraw-amount" className="block text-sm font-medium text-gray-700">
          Withdraw Amount
        </label>
        <div className="relative">
          <input
            id="withdraw-amount"
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="0.00"
            className="input"
            disabled={txStatus === 'pending'}
            aria-describedby="withdraw-validation"
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
            disabled={txStatus === 'pending'}
            aria-label="Set maximum withdrawal amount"
          >
            MAX
          </button>
        </div>
        <div id="withdraw-validation">
          {withdrawAmount && parseFloat(withdrawAmount) > availableBalance && (
            <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2" role="alert">
              <XCircle size={14} className="flex-shrink-0" />
              <span>Amount exceeds available balance of {formatSTX(availableBalance)} STX</span>
            </div>
          )}
          {lockedCollateral > 0 && availableBalance === 0 && (
            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>All deposits are locked as loan collateral. Repay your loan to unlock.</span>
            </div>
          )}
        </div>
      </div>

      {/* Withdraw Button */}
      <button
        onClick={handleWithdraw}
        disabled={!address || txStatus === 'pending' || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > availableBalance}
        className="w-full btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txStatus === 'pending' && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        )}
        {txStatus === 'pending' ? 'Withdrawing...' : 'Withdraw STX'}
      </button>

      {/* Status Messages */}
      {txStatus === 'success' && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2" role="alert">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-600" size={20} />
            <span className="text-sm text-emerald-700 font-medium">
              Withdrawal successful! Balance updated.
            </span>
          </div>
          {lastTxId && (
            <a
              href={getExplorerUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              View transaction
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {txStatus === 'error' && errorMessage && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-2" role="alert">
          <div className="flex items-center gap-2">
            <XCircle className="text-red-600" size={20} />
            <span className="text-sm text-red-700 font-medium">{errorMessage}</span>
          </div>
          {lastTxId && (
            <a
              href={getExplorerUrl(lastTxId)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 hover:underline"
            >
              View transaction
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {txStatus === 'timeout' && lastTxId && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2" role="alert">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-amber-600" size={20} />
            <span className="text-sm text-amber-700 font-medium">
              Transaction still processing
            </span>
          </div>
          <p className="text-xs text-amber-700">
            Your withdrawal may still go through. Do not retry — check the explorer for the latest status.
          </p>
          <a
            href={getExplorerUrl(lastTxId)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-800 hover:underline font-medium"
          >
            Check transaction status
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Only unlocked STX (not used as collateral) can be withdrawn</p>
        <p>• Repay your loan to unlock collateral for withdrawal</p>
        <p>• Small network fee (~0.001 STX) will be deducted</p>
      </div>
    </div>
  );
};

export default WithdrawCard;
