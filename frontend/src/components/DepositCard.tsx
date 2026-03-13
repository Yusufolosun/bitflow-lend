import React, { useState, useCallback } from 'react';
import { ArrowDownCircle, CheckCircle, XCircle, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { formatSTX } from '../utils/formatters';
import { PROTOCOL_CONSTANTS } from '../config/contracts';
import { getExplorerUrl } from '../config/contracts';

/**
 * DepositCard Component
 * Allows users to deposit STX into the vault
 */
export const DepositCard: React.FC = () => {
  const { address, balanceSTX, userSession } = useAuth();
  const vault = useVault(userSession, address);

  const [depositAmount, setDepositAmount] = useState('');
  const [userDeposit, setUserDeposit] = useState(0);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'timeout'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  // Fetch user's current deposit on a 60s smart interval
  const fetchDeposit = useCallback(async () => {
    if (!address) return;
    const deposit = await vault.getUserDeposit();
    if (deposit) setUserDeposit(deposit.amountSTX);
  }, [address, vault]);

  useSmartPolling(fetchDeposit, 60_000, !!address);

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);

    // Validation
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      setTxStatus('error');
      return;
    }

    if (amount > balanceSTX) {
      setErrorMessage(`Insufficient balance. You have ${balanceSTX.toFixed(2)} STX, trying to deposit ${amount.toFixed(2)} STX`);
      setTxStatus('error');
      return;
    }

    setTxStatus('pending');
    setErrorMessage('');

    try {
      const result = await vault.deposit(amount);

      if (result.success && result.txId) {
        console.log('Transaction submitted, waiting for confirmation...');
        setLastTxId(result.txId);
        setErrorMessage(`Transaction submitted: ${result.txId}`);
        
        // Wait for transaction confirmation
        const result2 = await vault.pollTransactionStatus(result.txId);

        if (result2 === 'confirmed') {
          setTxStatus('success');
          setDepositAmount('');

          // Refresh deposit immediately after confirmation
          const deposit = await vault.getUserDeposit();
          if (deposit) {
            setUserDeposit(deposit.amountSTX);
          }

          // Reset status after showing success message
          setTimeout(() => {
            setTxStatus('idle');
            setErrorMessage('');
          }, 5000);
        } else if (result2 === 'failed') {
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
    // Reserve 0.1 STX for fees
    const maxAmount = Math.max(0, balanceSTX - 0.1);
    setDepositAmount(maxAmount.toString());
  };

  return (
    <div className="card-elevated space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-accent-50 rounded-xl">
          <ArrowDownCircle className="text-accent-600" size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Deposit STX</h3>
          <p className="text-sm text-gray-500">Deposit to earn and borrow</p>
        </div>
      </div>

      {/* Current Deposit Display */}
      <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <div className="text-xs font-medium text-gray-500 mb-1">Your Total Deposit</div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight">
          {formatSTX(userDeposit)} STX
        </div>
      </div>

      {/* Deposit Input */}
      <div className="space-y-2">
        <label htmlFor="deposit-amount" className="block text-sm font-medium text-gray-700">
          Deposit Amount
        </label>
        <div className="relative">
          <input
            id="deposit-amount"
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="0.00"
            className="input"
            disabled={txStatus === 'pending'}
            aria-describedby="deposit-validation"
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-accent-50 text-accent-600 rounded-lg text-xs font-bold hover:bg-accent-100 transition-colors border border-accent-200"
            disabled={txStatus === 'pending'}
            aria-label="Set maximum deposit amount"
          >
            MAX
          </button>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Available: {formatSTX(balanceSTX)} STX</span>
          {depositAmount && (
            <span>
              New Total: {formatSTX(userDeposit + parseFloat(depositAmount || '0'))} STX
            </span>
          )}
        </div>

        {/* Inline Validation Warnings */}
        <div id="deposit-validation">
        {depositAmount && parseFloat(depositAmount) > 0 && parseFloat(depositAmount) < 0.01 && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2" role="alert">
            <XCircle size={14} className="flex-shrink-0" />
            <span>Minimum deposit is 0.01 STX</span>
          </div>
        )}
        {depositAmount && parseFloat(depositAmount) > balanceSTX && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 rounded-lg p-2">
            <XCircle size={14} className="flex-shrink-0" />
            <span>Amount exceeds your available balance of {formatSTX(balanceSTX)} STX</span>
          </div>
        )}
        {depositAmount && parseFloat(depositAmount) > 0 && parseFloat(depositAmount) <= balanceSTX && balanceSTX - parseFloat(depositAmount) < 0.1 && (
          <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 rounded-lg p-2">
            <AlertTriangle size={14} className="flex-shrink-0" />
            <span>Keep at least 0.1 STX for transaction fees</span>
          </div>
        )}
        {depositAmount && parseFloat(depositAmount) >= 0.01 && parseFloat(depositAmount) <= balanceSTX && (
          <div className="text-xs text-gray-400 mt-1">
            Max borrow after deposit: {formatSTX((userDeposit + parseFloat(depositAmount)) / (PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO / 100))} STX
          </div>
        )}
        </div>
      </div>

      {/* Deposit Button */}
      <button
        onClick={handleDeposit}
        disabled={!address || txStatus === 'pending' || !depositAmount || parseFloat(depositAmount) < 0.01}
        className="w-full btn btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txStatus === 'pending' && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        )}
        {txStatus === 'pending' ? 'Depositing...' : 'Deposit STX'}
      </button>

      {/* Status Messages */}
      {txStatus === 'success' && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2" role="alert">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-600" size={20} />
            <span className="text-sm text-emerald-700 font-medium">
              Deposit successful! Balance updated.
            </span>
          </div>
          <p className="text-xs text-emerald-600">
            Tip: Click "Refresh Data" on Dashboard to update your total deposit view.
          </p>
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
            Your deposit may still go through. Do not retry — check the explorer for the latest status.
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
        <p>• Deposits can be withdrawn anytime (if not used as collateral)</p>
        <p>• Use deposited STX as collateral to borrow</p>
        <p>• Small network fee (~0.001 STX) will be deducted</p>
      </div>
    </div>
  );
};

export default DepositCard;
