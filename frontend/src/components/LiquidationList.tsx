import React, { useState, useEffect } from 'react';
import { AlertTriangle, DollarSign, TrendingDown, Zap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatSTX, formatAddress } from '../utils/formatters';
import { PROTOCOL_CONSTANTS } from '../config/contracts';

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
  const { address } = useAuth();

  const [positions, setPositions] = useState<LiquidatablePosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

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
      alert('Please connect your wallet first');
      return;
    }

    setSelectedPosition(position.address);

    try {
      // In a real implementation, this would call the liquidate function
      // const result = await vault.liquidate(position.address);

      alert(`Liquidation initiated for ${formatAddress(position.address)}`);
      
      // Refresh positions after liquidation
      setTimeout(() => {
        setPositions(prev => prev.filter(p => p.address !== position.address));
        setSelectedPosition(null);
      }, 2000);
    } catch {
      alert('Liquidation failed. Please try again.');
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
          <h3 className="text-xl font-bold text-gray-900">Liquidation Opportunities</h3>
          <p className="text-sm text-gray-500">
            {positions.length} position{positions.length !== 1 ? 's' : ''} available for liquidation
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Zap className="text-accent-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-primary-900 mb-1">
              How Liquidation Works
            </h4>
            <p className="text-xs text-accent-800">
              When a position falls below {PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD}% health factor,
              anyone can liquidate it by repaying the debt and receiving the collateral plus a{' '}
              {PROTOCOL_CONSTANTS.LIQUIDATION_BONUS}% bonus.
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && positions.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading positions...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && positions.length === 0 && (
        <div className="text-center py-12">
          <TrendingDown className="mx-auto text-gray-400 mb-4" size={48} aria-hidden="true" />
          <p className="text-gray-600 mb-1 font-medium">No Liquidatable Positions Found</p>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Liquidatable positions will appear here once an on-chain indexer is
            integrated. The contract currently does not support enumerating all
            borrower positions directly.
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
                  Address
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  Collateral
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  Debt
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  Health Factor
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  Potential Profit
                </th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">
                  Action
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
                        +{position.liquidationBonus}% bonus
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleLiquidate(position)}
                        disabled={!address || isLiquidating}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 ml-auto"
                      >
                        {isLiquidating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Liquidating...
                          </>
                        ) : (
                          <>
                            <Zap size={16} />
                            Liquidate
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
              <div className="text-xs text-gray-500 mb-1">Total Collateral at Risk</div>
              <div className="text-lg font-bold text-gray-900">
                {formatSTX(positions.reduce((sum, p) => sum + p.collateralSTX, 0))} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Total Debt</div>
              <div className="text-lg font-bold text-gray-900">
                {formatSTX(positions.reduce((sum, p) => sum + p.debtSTX, 0))} STX
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Total Profit Potential</div>
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
