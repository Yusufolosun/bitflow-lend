import React, { useState, useEffect } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, TrendingDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { formatSTX, getHealthStatus } from '../types/vault';
import { PROTOCOL_CONSTANTS } from '../config/contracts';

/**
 * HealthMonitor Component
 * Displays user's collateral health and liquidation risk
 */
export const HealthMonitor: React.FC = () => {
  const { address, userSession } = useAuth();
  const vault = useVault(userSession, address);

  const [healthFactor, setHealthFactor] = useState<any>(null);
  const [userDeposit, setUserDeposit] = useState<any>(null);
  const [activeLoan, setActiveLoan] = useState<any>(null);
  const [stxPrice] = useState(1.5); // Default STX price in USD

  // Fetch user data once on mount
  useEffect(() => {
    const fetchData = async () => {
      if (address) {
        const deposit = await vault.getUserDeposit();
        setUserDeposit(deposit);

        const loan = await vault.getUserLoan();
        setActiveLoan(loan);

        if (loan) {
          const health = await vault.getHealthFactor(stxPrice);
          setHealthFactor(health);
        }
      }
    };

    fetchData();
    // Auto-refresh disabled to prevent rate limiting
  }, [address]); // Only re-fetch when address changes

  // Calculate collateralization ratio
  const getCollateralRatio = () => {
    if (!activeLoan || !userDeposit) return null;
    return (userDeposit.amountSTX / activeLoan.amountSTX) * 100;
  };

  const collateralRatio = getCollateralRatio();

  // Determine health status
  const getHealthColor = () => {
    if (!healthFactor) return 'gray';
    const status = getHealthStatus(healthFactor.healthFactorPercent);
    return status === 'healthy' ? 'green' : status === 'warning' ? 'yellow' : 'red';
  };

  const healthColor = getHealthColor();

  // Calculate distance to liquidation
  const getDistanceToLiquidation = () => {
    if (!collateralRatio) return null;
    const distance = collateralRatio - PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD;
    return distance;
  };

  const distanceToLiquidation = getDistanceToLiquidation();

  // No active loan
  if (!activeLoan) {
    return (
      <div className="card-elevated">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="text-emerald-600" size={22} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Health Monitor</h3>
            <p className="text-sm text-gray-500">Your position is healthy</p>
          </div>
        </div>

        <div className="bg-emerald-50/80 rounded-xl p-6 text-center border border-emerald-100">
          <CheckCircle className="mx-auto text-emerald-600 mb-3" size={48} />
          <p className="text-emerald-700 mb-1 font-medium">No Active Position</p>
          <p className="text-sm text-gray-600">
            You don't have any active loans. Your collateral is safe.
          </p>
        </div>

        {userDeposit && userDeposit.amountSTX > 0 && (
          <div className="mt-4 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Total Deposited</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatSTX(userDeposit.amountSTX)} STX
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Available for borrowing
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card-elevated space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl ${
          healthColor === 'green' ? 'bg-emerald-50' :
          healthColor === 'yellow' ? 'bg-amber-50' : 'bg-red-50'
        }`}>
          <Activity className={`${
            healthColor === 'green' ? 'text-emerald-600' :
            healthColor === 'yellow' ? 'text-amber-600' : 'text-red-600'
          }`} size={22} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Health Monitor</h3>
          <p className="text-sm text-gray-500">Track your position health</p>
        </div>
      </div>

      {/* Health Factor Display */}
      {healthFactor && (
        <div className={`rounded-xl p-6 border ${
          healthColor === 'green' ? 'bg-emerald-50/80 border-emerald-100' :
          healthColor === 'yellow' ? 'bg-amber-50/80 border-amber-100' : 'bg-red-50/80 border-red-100'
        }`}>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-600 mb-2">Health Factor</div>
            <div className={`text-5xl font-bold mb-2 tracking-tight ${
              healthColor === 'green' ? 'text-emerald-600' :
              healthColor === 'yellow' ? 'text-amber-600' : 'text-red-600'
            }`}>
              {healthFactor.healthFactorPercent.toFixed(0)}%
            </div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              healthColor === 'green' ? 'bg-emerald-200 text-emerald-800' :
              healthColor === 'yellow' ? 'bg-amber-200 text-amber-800' : 'bg-red-200 text-red-800'
            }`}>
              {healthColor === 'green' && <CheckCircle size={16} />}
              {healthColor === 'yellow' && <AlertTriangle size={16} />}
              {healthColor === 'red' && <XCircle size={16} />}
              <span className="text-sm font-semibold">
                {healthColor === 'green' ? 'Healthy' :
                 healthColor === 'yellow' ? 'At Risk' : 'Critical'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collateral Ratio */}
      {collateralRatio && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Collateralization Ratio</span>
            <span className="font-semibold">{collateralRatio.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 transition-all ${
                collateralRatio >= 150 ? 'bg-emerald-600' :
                collateralRatio >= 110 ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min((collateralRatio / 200) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Liquidation at {PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD}%</span>
            <span>Safe at {PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO}%+</span>
          </div>
        </div>
      )}

      {/* Position Details */}
      <div className="bg-gray-50/80 rounded-xl p-4 space-y-3 border border-gray-100">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">Position Details</h4>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Collateral:</span>
          <span className="font-semibold">{formatSTX(activeLoan.collateralAmountSTX)} STX</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Borrowed:</span>
          <span className="font-semibold">{formatSTX(activeLoan.amountSTX)} STX</span>
        </div>

        {healthFactor && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Collateral Value:</span>
              <span className="font-semibold">${healthFactor.collateralValueUSD.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Debt Value:</span>
              <span className="font-semibold">${healthFactor.debtValueUSD.toLocaleString()}</span>
            </div>
          </>
        )}

        {distanceToLiquidation !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Distance to Liquidation:</span>
            <span className={`font-semibold ${
              distanceToLiquidation > 40 ? 'text-green-600' :
              distanceToLiquidation > 0 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {distanceToLiquidation > 0 ? '+' : ''}{distanceToLiquidation.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Liquidation Warning */}
      {healthColor === 'yellow' && (
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-yellow-900 mb-1">
              Liquidation Risk Warning
            </h4>
            <p className="text-xs text-yellow-800">
              Your position is approaching the liquidation threshold. Consider adding more collateral
              or repaying part of your loan to improve your health factor.
            </p>
          </div>
        </div>
      )}

      {healthColor === 'red' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <TrendingDown className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900 mb-1">
              Critical Liquidation Risk!
            </h4>
            <p className="text-xs text-red-800 mb-2">
              Your position is in critical danger of liquidation. You may lose your collateral
              plus a {PROTOCOL_CONSTANTS.LIQUIDATION_BONUS}% liquidation penalty.
            </p>
            <p className="text-xs text-red-900 font-medium">
              Action Required: Add collateral or repay your loan immediately!
            </p>
          </div>
        </div>
      )}

      {/* Liquidation Info */}
      <div className="bg-accent-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">Liquidation Protection</h4>
        <div className="text-xs text-gray-700 space-y-1">
          <p>• Maintain collateral ratio above {PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD}%</p>
          <p>• Add more collateral to improve health factor</p>
          <p>• Repay loan to reduce debt and increase safety</p>
          <p>• Monitor price fluctuations that may affect your position</p>
        </div>
      </div>

      {/* Recommendations */}
      {healthColor !== 'green' && collateralRatio && (
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Recommended Actions</h4>
          <div className="space-y-2">
            {collateralRatio < PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO && (
              <div className="text-sm text-purple-900">
                <span className="font-medium">Add collateral:</span> Deposit{' '}
                <span className="font-semibold">
                  {formatSTX(
                    (activeLoan.amountSTX * (PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO / 100)) -
                    activeLoan.collateralAmountSTX
                  )} STX
                </span>
                {' '}to reach safe levels
              </div>
            )}
            <div className="text-sm text-purple-900">
              <span className="font-medium">Or repay:</span> Pay back your loan to release collateral
              and eliminate risk
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• Health factor updates every 10 seconds</p>
        <p>• Based on current STX price: ${stxPrice.toFixed(2)} USD</p>
        <p>• Liquidation occurs automatically below {PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD}%</p>
      </div>
    </div>
  );
};

export default HealthMonitor;
