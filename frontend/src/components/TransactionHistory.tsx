import React, { useState, useEffect, useCallback } from 'react';
import { Clock, ArrowDownCircle, ArrowUpCircle, TrendingUp, DollarSign, CheckCircle, XCircle, Loader, ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatSTX, formatTimestamp } from '../utils/formatters';
import { getApiEndpoint, getExplorerUrl, VAULT_CONTRACT, ACTIVE_NETWORK } from '../config/contracts';

/**
 * Transaction types mapped from contract function names
 */
type TransactionType = 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'liquidate' | 'unknown';

/**
 * Transaction status from API
 */
type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/**
 * Blockchain transaction interface
 */
interface ChainTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  timestamp: number;
  status: TransactionStatus;
  txId: string;
  blockHeight?: number;
  functionName: string;
}

/**
 * Map contract function name to transaction type
 */
const mapFunctionToType = (functionName: string): TransactionType => {
  switch (functionName) {
    case 'deposit': return 'deposit';
    case 'withdraw': return 'withdraw';
    case 'borrow': return 'borrow';
    case 'repay': return 'repay';
    case 'liquidate': return 'liquidate';
    default: return 'unknown';
  }
};

/**
 * Extract STX amount from transaction args or result
 */
const extractAmount = (tx: any): number => {
  try {
    const args = tx.contract_call?.function_args;
    if (args && args.length > 0) {
      const amountArg = args[0];
      if (amountArg && amountArg.repr) {
        const val = amountArg.repr.replace('u', '');
        return Number(val) / 1_000_000;
      }
    }

    // For repay, try reading from tx_result
    if (tx.tx_result && tx.tx_result.repr) {
      const repr = tx.tx_result.repr;
      const totalMatch = repr.match(/total:\s*u(\d+)/);
      if (totalMatch) {
        return Number(totalMatch[1]) / 1_000_000;
      }
    }

    return 0;
  } catch {
    return 0;
  }
};

/**
 * TransactionHistory Component
 * Fetches and displays real transaction history from the Hiro API,
 * filtered to only show vault contract interactions.
 */
export const TransactionHistory: React.FC = () => {
  const { address } = useAuth();
  const [transactions, setTransactions] = useState<ChainTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionType | 'all'>('all');

  const contractId = ACTIVE_NETWORK === 'testnet'
    ? `${VAULT_CONTRACT.testnet.address}.${VAULT_CONTRACT.testnet.contractName}`
    : `${VAULT_CONTRACT.mainnet.address}.${VAULT_CONTRACT.mainnet.contractName}`;

  /**
   * Fetch transactions from Hiro API
   */
  const fetchTransactions = useCallback(async () => {
    if (!address) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = getApiEndpoint();

      const response = await fetch(
        `${apiUrl}/extended/v1/address/${address}/transactions?limit=50`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];

      // Filter for vault contract interactions only
      const vaultTxs: ChainTransaction[] = results
        .filter((tx: any) => {
          if (tx.tx_type !== 'contract_call') return false;
          return tx.contract_call?.contract_id === contractId;
        })
        .map((tx: any) => {
          const functionName = tx.contract_call?.function_name || 'unknown';
          const type = mapFunctionToType(functionName);
          const amount = extractAmount(tx);

          let status: TransactionStatus = 'pending';
          if (tx.tx_status === 'success') status = 'confirmed';
          else if (tx.tx_status === 'abort_by_response' || tx.tx_status === 'abort_by_post_condition') status = 'failed';

          return {
            id: tx.tx_id,
            type,
            amount,
            timestamp: tx.burn_block_time ? tx.burn_block_time * 1000 : Date.now(),
            status,
            txId: tx.tx_id,
            blockHeight: tx.block_height,
            functionName,
          };
        });

      setTransactions(vaultTxs);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  }, [address, contractId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Filter
  const filteredTransactions = filter === 'all'
    ? transactions
    : transactions.filter(tx => tx.type === filter);

  // Icon helpers
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case 'deposit': return <ArrowDownCircle size={20} className="text-emerald-600" />;
      case 'withdraw': return <ArrowUpCircle size={20} className="text-accent-600" />;
      case 'borrow': return <TrendingUp size={20} className="text-purple-600" />;
      case 'repay': return <DollarSign size={20} className="text-orange-600" />;
      case 'liquidate': return <XCircle size={20} className="text-red-600" />;
      default: return <Clock size={20} className="text-gray-400" />;
    }
  };

  const getStatusIcon = (status: TransactionStatus) => {
    switch (status) {
      case 'confirmed': return <CheckCircle size={16} className="text-green-600" />;
      case 'failed': return <XCircle size={16} className="text-red-600" />;
      case 'pending': return <Loader size={16} className="text-yellow-600 animate-spin" />;
    }
  };

  const getBadgeColor = (type: TransactionType) => {
    switch (type) {
      case 'deposit': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'withdraw': return 'bg-accent-100 text-accent-800 border-accent-200';
      case 'borrow': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'repay': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'liquidate': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTransactionColor = (type: TransactionType) => {
    switch (type) {
      case 'deposit': return 'bg-emerald-50 border-emerald-200';
      case 'withdraw': return 'bg-accent-50 border-accent-200';
      case 'borrow': return 'bg-purple-50 border-purple-200';
      case 'repay': return 'bg-orange-50 border-orange-200';
      case 'liquidate': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="card-elevated">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gray-100 rounded-xl">
            <Clock className="text-gray-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Transaction History</h3>
            <p className="text-sm text-gray-500">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} from blockchain
            </p>
          </div>
        </div>

        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
          title="Refresh transactions"
        >
          <RefreshCw size={16} className={`text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6 flex-wrap" role="group" aria-label="Filter transactions by type">
        {(['all', 'deposit', 'withdraw', 'borrow', 'repay'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            aria-pressed={filter === type}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
              filter === type
                ? 'bg-accent-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && transactions.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading transactions from blockchain...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
          <XCircle size={16} className="text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <button
            onClick={fetchTransactions}
            className="text-xs font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State - No Wallet */}
      {!isLoading && !address && (
        <div className="text-center py-12">
          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-1 font-medium">No Wallet Connected</p>
          <p className="text-sm text-gray-500">Connect your wallet to view transaction history</p>
        </div>
      )}

      {/* Empty State - No Transactions */}
      {!isLoading && address && filteredTransactions.length === 0 && !error && (
        <div className="text-center py-12">
          <Clock className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600 mb-1 font-medium">No Transactions</p>
          <p className="text-sm text-gray-500">
            {filter === 'all'
              ? 'No vault interactions found for your address'
              : `No ${filter} transactions found`}
          </p>
        </div>
      )}

      {/* Transaction List */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className={`border rounded-xl p-4 transition-all hover:shadow-md ${getTransactionColor(tx.type)}`}
            >
              <div className="flex items-center justify-between">
                {/* Left: Icon & Details */}
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex-shrink-0">
                    {getTransactionIcon(tx.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Colored Function Badge */}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${getBadgeColor(tx.type)}`}>
                        {tx.functionName}
                      </span>
                      {getStatusIcon(tx.status)}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                      <span>{formatTimestamp(tx.timestamp)}</span>
                      {tx.blockHeight && (
                        <>
                          <span>·</span>
                          <span>Block #{tx.blockHeight.toLocaleString()}</span>
                        </>
                      )}
                      <a
                        href={getExplorerUrl(tx.txId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-600 hover:text-accent-700 hover:underline"
                      >
                        <span className="font-mono">{tx.txId.slice(0, 10)}...{tx.txId.slice(-6)}</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Right: Amount */}
                <div className="text-right flex-shrink-0 ml-4">
                  {tx.amount > 0 ? (
                    <div className={`text-lg font-bold tabular-nums ${
                      tx.type === 'deposit' || tx.type === 'borrow'
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}>
                      {tx.type === 'deposit' || tx.type === 'borrow' ? '+' : '-'}
                      {formatSTX(tx.amount)} STX
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">—</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {!isLoading && filteredTransactions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Deposits</div>
              <div className="text-sm font-bold text-emerald-600 tabular-nums">
                {formatSTX(
                  transactions
                    .filter(tx => tx.type === 'deposit' && tx.status === 'confirmed')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                )} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Withdrawn</div>
              <div className="text-sm font-bold text-accent-600 tabular-nums">
                {formatSTX(
                  transactions
                    .filter(tx => tx.type === 'withdraw' && tx.status === 'confirmed')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                )} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Borrowed</div>
              <div className="text-sm font-bold text-purple-600 tabular-nums">
                {formatSTX(
                  transactions
                    .filter(tx => tx.type === 'borrow' && tx.status === 'confirmed')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                )} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">Total Repaid</div>
              <div className="text-sm font-bold text-orange-600 tabular-nums">
                {formatSTX(
                  transactions
                    .filter(tx => tx.type === 'repay' && tx.status === 'confirmed')
                    .reduce((sum, tx) => sum + tx.amount, 0)
                )} STX
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
