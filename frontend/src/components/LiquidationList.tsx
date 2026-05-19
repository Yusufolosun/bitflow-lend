import React, { useState, useEffect } from 'react';
import { AlertTriangle, DollarSign, TrendingDown, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { formatSTX, formatAddress } from '../utils/formatters';
import { PROTOCOL_CONSTANTS } from '../config/contracts';
import { LIQUIDATION_COPY } from '../constants/messages';

/**
 * Position interface for liquidatable positions
 */
interface LiquidatablePosition {
  address: string;
  collateralSTX: number;
  debtSTX: number;
  healthFactor: number;
  liquidationBonus: number;
  potentialProfit: number;
}

/**
 * LiquidationList Component
 * Displays positions at risk of liquidation and allows liquidation
 */
export const LiquidationList: React.FC = () => {
  const { address, userSession } = useAuth();
  const vault = useVault(userSession, address);

  const [positions, setPositions] = useState<LiquidatablePosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch liquidatable positions
  useEffect(() => {
    const fetchPositions = async () => {
      setIsLoading(true);

      // The current contract does not expose an enumeration function
      // for all borrowers, so we cannot query liquidatable positions
      // on-chain yet. Once an off-chain indexer that watches borrow
      // events is available, this will query real data.
      setPositions([]);
      setIsLoading(false);
    };

    fetchPositions();
  }, []);

  const handleLiquidate = async (position: LiquidatablePosition) => {
    if (!address) {
      setStatusMessage({ type: 'error', text: LIQUIDATION_COPY.connectWalletError });
      return;
    }

    setSelectedPosition(position.address);
    setStatusMessage(null);

    try {
      const result = await vault.liquidate(position.address);

      if (result.success) {
        setStatusMessage({ type: 'success', text: LIQUIDATION_COPY.successMessage(formatAddress(position.address)) });
        setPositions(prev => prev.filter(p => p.address !== position.address));
      } else {
        setStatusMessage({
          type: 'error',
          text: result.error || LIQUIDATION_COPY.failureMessage(formatAddress(position.address)),
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: LIQUIDATION_COPY.transactionFailed });
    } finally {
      setSelectedPosition(null);
    }
  };

  const getHealthColor = (healthFactor: number) => {
    if (healthFactor < 105) return 'red';
    if (healthFactor < 110) return 'orange';
    return 'yellow';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-red-100 rounded-lg">
          <AlertTriangle className="text-red-600" size={24} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{LIQUIDATION_COPY.headerTitle}</h3>
          <p className="text-sm text-gray-500">
            {LIQUIDATION_COPY.headerSubtitle(positions.length)}
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="text-accent-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-primary-900 mb-1">
              {LIQUIDATION_COPY.infoTitle}
            </h4>
            <p className="text-xs text-accent-800">
              {LIQUIDATION_COPY.infoMessage(
                PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD,
                PROTOCOL_CONSTANTS.LIQUIDATION_BONUS
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && positions.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-gray-500">{LIQUIDATION_COPY.loading}</p>
        </div>
      )}

      {statusMessage && (
        <div
          className={`mb-6 rounded-lg border p-3 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
          role="alert"
        >
          {statusMessage.text}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && positions.length === 0 && (
        <div className="text-center py-12">
          <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} aria-hidden="true" />
          <p className="text-gray-600 mb-1 font-medium">{LIQUIDATION_COPY.emptyTitle}</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {LIQUIDATION_COPY.emptyMessage}
          </p>
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full" aria-label="Liquidatable positions">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableAddress}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableCollateral}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableDebt}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableHealthFactor}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableProfit}
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  {LIQUIDATION_COPY.tableAction}
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const healthColor = getHealthColor(position.healthFactor);
                const isLiquidating = selectedPosition === position.address;

                return (
                  <tr 
                    key={position.address}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-mono text-sm text-gray-900">
                        {formatAddress(position.address)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatSTX(position.collateralSTX)} STX
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {formatSTX(position.debtSTX)} STX
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                        healthColor === 'red' ? 'bg-red-100 text-red-700' :
                        healthColor === 'orange' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">
                          {position.healthFactor.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <DollarSign className="text-green-600" size={16} />
                        <span className="text-sm font-bold text-green-600">
                          {formatSTX(position.potentialProfit)} STX
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {LIQUIDATION_COPY.bonusLabel(position.liquidationBonus)}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button type="button"
                        onClick={() => handleLiquidate(position)}
                        disabled={!address || isLiquidating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
                      >
                        {isLiquidating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            {LIQUIDATION_COPY.actionLiquidating}
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            {LIQUIDATION_COPY.actionLiquidate}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {positions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{LIQUIDATION_COPY.summaryCollateral}</div>
              <div className="text-lg font-bold text-gray-900">
                {formatSTX(positions.reduce((sum, p) => sum + p.collateralSTX, 0))} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{LIQUIDATION_COPY.summaryDebt}</div>
              <div className="text-lg font-bold text-gray-900">
                {formatSTX(positions.reduce((sum, p) => sum + p.debtSTX, 0))} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">{LIQUIDATION_COPY.summaryProfit}</div>
              <div className="text-lg font-bold text-green-600">
                {formatSTX(positions.reduce((sum, p) => sum + p.potentialProfit, 0))} STX
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiquidationList;

