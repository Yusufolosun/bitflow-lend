import React, { useState, useCallback } from 'react';
import { TrendingUp, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { formatSTX, LOAN_TERMS } from '../types/vault';
import { PROTOCOL_CONSTANTS, getExplorerUrl } from '../config/contracts';

/**
 * BorrowCard Component
 * Allows users to borrow STX against their deposited collateral
 */
export const BorrowCard: React.FC = () => {
  const { address, userSession, refreshBalance } = useAuth();
  const vault = useVault(userSession, address);

  const [borrowAmount, setBorrowAmount] = useState('');
  const [interestRate, setInterestRate] = useState(10);
  const [loanTerm, setLoanTerm] = useState(30);
  const [userDeposit, setUserDeposit] = useState(0);
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error' | 'timeout'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastTxId, setLastTxId] = useState<string | null>(null);

  // Fetch user deposit and active loan on a 60s smart interval
  const fetchData = useCallback(async () => {
    if (!address) return;
    const deposit = await vault.getUserDeposit();
    if (deposit) setUserDeposit(deposit.amountSTX);
    const loan = await vault.getUserLoan();
    setActiveLoan(loan);
  }, [address, vault]);

  useSmartPolling(fetchData, 60_000, !!address);

  // Calculate maximum borrowable amount
  const maxBorrowSTX = userDeposit / (PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO / 100);

  // Calculate required collateral
  const amount = parseFloat(borrowAmount || '0');
  const requiredCollateral = amount * (PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO / 100);

  // Calculate estimated interest
  const estimatedInterest = (amount * (interestRate / 100) * (loanTerm / 365));
  const totalRepayment = amount + estimatedInterest;

  const handleBorrow = async () => {
    // Validation
    if (!amount || amount <= 0) {
      setErrorMessage('Please enter a valid amount');
      setTxStatus('error');
      return;
    }

    if (amount > maxBorrowSTX) {
      setErrorMessage(`Maximum borrow is ${formatSTX(maxBorrowSTX)} STX`);
      setTxStatus('error');
      return;
    }

    if (requiredCollateral > userDeposit) {
      setErrorMessage('Insufficient collateral');
      setTxStatus('error');
      return;
    }

    if (activeLoan) {
      setErrorMessage('You already have an active loan. Please repay it first.');
      setTxStatus('error');
      return;
    }

    setTxStatus('pending');
    setErrorMessage('');
    setLastTxId(null);

    try {
      const result = await vault.borrow(amount, interestRate, loanTerm);

      if (result.success && result.txId) {
        console.log('Borrow transaction submitted:', result.txId);
        setLastTxId(result.txId);
        setErrorMessage(`Transaction submitted. Waiting for confirmation...`);
        
        // Wait for transaction confirmation (up to 3 minutes)
        const pollResult = await vault.pollTransactionStatus(result.txId);

        if (pollResult === 'confirmed') {
          setTxStatus('success');
          setBorrowAmount('');
          setErrorMessage('');

          // Refresh wallet balance to show received STX
          await refreshBalance();

          // Refresh loan data
          const loan = await vault.getUserLoan();
          setActiveLoan(loan);

          // Reset status after showing success message
          setTimeout(() => {
            setTxStatus('idle');
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
    setBorrowAmount(maxBorrowSTX.toFixed(2));
  };

  // If user has active loan, show message
  if (activeLoan) {
    return (
      <div className="card-elevated">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            <AlertCircle className="text-amber-600" size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Active Loan</h3>
            <p className="text-sm text-gray-500">You already have an active loan</p>
          </div>
        </div>

        <div className="bg-amber-50/80 rounded-xl p-4 space-y-2 border border-amber-100">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Loan Amount:</span>
            <span className="text-sm font-semibold">{formatSTX(activeLoan.amountSTX)} STX</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Interest Rate:</span>
            <span className="text-sm font-semibold">{activeLoan.interestRatePercent}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Collateral Locked:</span>
            <span className="text-sm font-semibold">{formatSTX(activeLoan.collateralAmountSTX)} STX</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4">
          Please repay your current loan before borrowing again.
        </p>
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-emerald-50 rounded-xl">
          <TrendingUp className="text-emerald-600" size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Borrow STX</h3>
          <p className="text-sm text-gray-500">Borrow against your collateral</p>
        </div>
      </div>

      {/* Available Collateral */}
      <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-100">
        <div className="text-xs font-medium text-gray-500 mb-1">Available Collateral</div>
        <div className="text-2xl font-bold text-gray-900 tracking-tight">
          {formatSTX(userDeposit)} STX
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Max Borrow: {formatSTX(maxBorrowSTX)} STX
        </div>
      </div>

      {/* Borrow Amount Input */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Borrow Amount
        </label>
        <div className="relative">
          <input
            type="number"
            value={borrowAmount}
            onChange={(e) => setBorrowAmount(e.target.value)}
            placeholder="0.00"
            className="input"
            disabled={txStatus === 'pending'}
          />
          <button
            onClick={handleMaxClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors border border-emerald-200"
            disabled={txStatus === 'pending'}
          >
            MAX
          </button>
        </div>
      </div>

      {/* Interest Rate */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Interest Rate (APR)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={interestRate}
            onChange={(e) => setInterestRate(parseInt(e.target.value))}
            className="flex-1"
            disabled={txStatus === 'pending'}
          />
          <div className="w-16 px-3 py-2 bg-gray-100 rounded-lg text-center font-semibold">
            {interestRate}%
          </div>
        </div>
      </div>

      {/* Loan Term */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Loan Term
        </label>
        <div className="grid grid-cols-4 gap-2">
          {LOAN_TERMS.map((term) => (
            <button
              key={term.days}
              onClick={() => setLoanTerm(term.days)}
              className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                loanTerm === term.days
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              disabled={txStatus === 'pending'}
            >
              {term.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loan Summary */}
      {borrowAmount && (
        <div className="bg-accent-50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-gray-900 text-sm mb-2">Loan Summary</h4>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Borrow Amount:</span>
            <span className="font-semibold">{formatSTX(amount)} STX</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Required Collateral:</span>
            <span className="font-semibold">{formatSTX(requiredCollateral)} STX</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Estimated Interest:</span>
            <span className="font-semibold">{formatSTX(estimatedInterest)} STX</span>
          </div>
          <div className="border-t border-accent-200 pt-2 mt-2"></div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 font-semibold">Total Repayment:</span>
            <span className="font-bold text-gray-900">{formatSTX(totalRepayment)} STX</span>
          </div>

          {/* Health Factor Preview */}
          {amount > 0 && userDeposit > 0 && (
            <div className="border-t border-accent-200 pt-2 mt-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Projected Health Factor:</span>
                <span className={`font-bold ${
                  (userDeposit / amount) * 100 >= 150 ? 'text-green-600' :
                  (userDeposit / amount) * 100 >= 110 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {((userDeposit / amount) * 100).toFixed(0)}%
                </span>
              </div>
              {(userDeposit / amount) * 100 < 150 && (userDeposit / amount) * 100 >= 110 && (
                <p className="text-xs text-yellow-700 mt-1">
                  ⚠️ This borrow would put you near the liquidation zone
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Collateral Sufficiency Warning */}
      {borrowAmount && requiredCollateral > userDeposit && (
        <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="text-red-600 flex-shrink-0" size={16} />
          <span className="text-xs text-red-700">
            Need {formatSTX(requiredCollateral - userDeposit)} more STX deposited as collateral
          </span>
        </div>
      )}

      {/* Borrow Button */}
      <button
        onClick={handleBorrow}
        disabled={!address || txStatus === 'pending' || !borrowAmount || userDeposit === 0}
        className="w-full btn btn-success py-3 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {txStatus === 'pending' && (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        )}
        {txStatus === 'pending' ? 'Borrowing...' : 'Borrow STX'}
      </button>

      {/* Status Messages */}
      {txStatus === 'success' && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="text-emerald-600" size={20} />
            <span className="text-sm text-emerald-700 font-medium">
              Loan created successfully! STX received.
            </span>
          </div>
          <p className="text-xs text-emerald-600">
            Tip: Click "Refresh Data" on the Dashboard to update your portfolio view.
          </p>
        </div>
      )}

      {txStatus === 'error' && errorMessage && (
        <div className="p-3 bg-red-50 rounded-xl border border-red-100 space-y-2">
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
              View transaction on explorer
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}

      {txStatus === 'timeout' && lastTxId && (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-amber-600" size={20} />
            <span className="text-sm text-amber-700 font-medium">
              Transaction still processing
            </span>
          </div>
          <p className="text-xs text-amber-700">
            Your borrow request may still go through. Do not submit again — check the explorer for the latest status.
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
        <p>• {PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO}% collateralization required</p>
        <p>• Interest accrues from the moment you borrow</p>
        <p>• Only one active loan allowed at a time</p>
      </div>
    </div>
  );
};

export default BorrowCard;
