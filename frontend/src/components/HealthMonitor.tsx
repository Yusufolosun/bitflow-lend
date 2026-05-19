import React, { useState, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useVault } from '../hooks/useVault';
import { useSmartPolling } from '../hooks/useSmartPolling';
import { useStxPrice } from '../hooks/useStxPrice';
import { useOracleSanityCheck } from '../hooks/useOracleSanityCheck';
import { formatSTX } from '../utils/formatters';
import { PROTOCOL_CONSTANTS } from '../config/contracts';
import { getHealthStatus } from '../utils/calculations';
import { UserDeposit, UserLoan } from '../types/vault';
import { HealthFactorDisplay } from './HealthFactorDisplay';
import { HEALTH_MONITOR_COPY, ORACLE_WARNING_COPY } from '../constants/messages';

interface HealthFactorData {
  healthFactorPercent: number;
  collateralValueUSD: number;
  debtValueUSD: number;
  stxPriceUSD: number;
}

/**
 * HealthMonitor Component
 * Displays user's collateral health and liquidation risk
 */
export const HealthMonitor: React.FC = () => {
  const { address, userSession } = useAuth();
  const vault = useVault(userSession, address);
  const { price: stxPrice, lastUpdated: priceUpdated, isStale: priceIsStale } = useStxPrice();
  const oracleSanity = useOracleSanityCheck(stxPrice, 'token-stx');

  const [healthFactor, setHealthFactor] = useState<HealthFactorData | null>(null);
  const [userDeposit, setUserDeposit] = useState<UserDeposit | null>(null);
  const [activeLoan, setActiveLoan] = useState<UserLoan | null>(null);

  // Fetch user data on a 30s smart interval — health factor is time-sensitive
  const fetchData = useCallback(async () => {
    if (!address) return;
    const deposit = await vault.getUserDeposit();
    setUserDeposit(deposit);

    const loan = await vault.getUserLoan();
    setActiveLoan(loan);

    if (loan) {
      const health = await vault.getHealthFactor();
      setHealthFactor(health);
    }
  }, [address, vault]);

  useSmartPolling(fetchData, 30_000, !!address);

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
  const oracleWarningBanner = oracleSanity.warning ? (
    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg" role="alert">
      <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
      <div className="flex-1">
        <h4 className="text-sm font-semibold text-amber-900 mb-1">
          {ORACLE_WARNING_COPY.title}
        </h4>
        <p className="text-xs text-amber-800">
          {ORACLE_WARNING_COPY.healthMessage(`${(oracleSanity.deviation * 100).toFixed(1)}%`)}
        </p>
      </div>
    </div>
  ) : null;

  // No active loan
  if (!activeLoan) {
    return (
      <div className="card-elevated">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="text-emerald-600" size={22} aria-hidden="true" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{HEALTH_MONITOR_COPY.headerTitle}</h3>
            <p className="text-sm text-gray-500">{HEALTH_MONITOR_COPY.headerSubtitleHealthy}</p>
          </div>
        </div>

        {oracleWarningBanner}

        <div className="bg-emerald-50/80 rounded-xl p-6 text-center border border-emerald-100">
          <CheckCircle className="mx-auto text-emerald-600 mb-3" size={48} />
          <p className="text-emerald-700 mb-1 font-medium">{HEALTH_MONITOR_COPY.noActiveTitle}</p>
          <p className="text-sm text-gray-600">
            {HEALTH_MONITOR_COPY.noActiveMessage}
          </p>
        </div>

        {userDeposit && userDeposit.amountSTX > 0 && (
          <div className="mt-4 bg-gray-50/80 rounded-xl p-4 border border-gray-100">
            <div className="text-xs text-gray-500 mb-1">{HEALTH_MONITOR_COPY.totalDepositedLabel}</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatSTX(userDeposit.amountSTX)} STX
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {HEALTH_MONITOR_COPY.availableForBorrowing}
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
          }`} size={22} aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">{HEALTH_MONITOR_COPY.headerTitle}</h3>
          <p className="text-sm text-gray-500">{HEALTH_MONITOR_COPY.headerSubtitleActive}</p>
        </div>
      </div>

      {oracleWarningBanner}

      {/* Health Factor Display */}
      <HealthFactorDisplay 
        healthFactor={healthFactor?.healthFactorPercent} 
        size="lg"
      />

      {/* Collateral Ratio */}
      {collateralRatio && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{HEALTH_MONITOR_COPY.collateralRatioLabel}</span>
            <span className="font-semibold">{collateralRatio.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden" role="progressbar" aria-valuenow={Math.round(collateralRatio)} aria-valuemin={0} aria-valuemax={200} aria-label="Collateralization ratio">
            <div
              className={`h-3 transition-all ${
                collateralRatio >= PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO ? 'bg-emerald-600' :
                collateralRatio >= PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD ? 'bg-amber-500' : 'bg-red-600'
              }`}
              style={{ width: `${Math.min((collateralRatio / 200) * 100, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{HEALTH_MONITOR_COPY.liquidationAt(PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD)}</span>
            <span>{HEALTH_MONITOR_COPY.safeAt(PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO)}</span>
          </div>
        </div>
      )}

      {/* Position Details */}
      <div className="bg-gray-50/80 rounded-xl p-4 space-y-3 border border-gray-100">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">{HEALTH_MONITOR_COPY.positionDetailsTitle}</h4>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{HEALTH_MONITOR_COPY.collateralLabel}</span>
          <span className="font-semibold">{formatSTX(activeLoan.collateralAmountSTX)} STX</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{HEALTH_MONITOR_COPY.borrowedLabel}</span>
          <span className="font-semibold">{formatSTX(activeLoan.amountSTX)} STX</span>
        </div>

        {healthFactor && (
          <>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{HEALTH_MONITOR_COPY.collateralValueLabel}</span>
              <span className="font-semibold">${healthFactor.collateralValueUSD.toLocaleString()}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{HEALTH_MONITOR_COPY.debtValueLabel}</span>
              <span className="font-semibold">${healthFactor.debtValueUSD.toLocaleString()}</span>
            </div>
          </>
        )}

        {distanceToLiquidation !== null && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{HEALTH_MONITOR_COPY.distanceToLiquidationLabel}</span>
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
              {HEALTH_MONITOR_COPY.liquidationRiskTitle}
            </h4>
            <p className="text-xs text-yellow-800">
              {HEALTH_MONITOR_COPY.liquidationRiskMessage}
            </p>
          </div>
        </div>
      )}

      {healthColor === 'red' && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <TrendingDown className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-red-900 mb-1">
              {HEALTH_MONITOR_COPY.criticalRiskTitle}
            </h4>
            <p className="text-xs text-red-800 mb-2">
              {HEALTH_MONITOR_COPY.criticalRiskMessage(PROTOCOL_CONSTANTS.LIQUIDATION_BONUS)}
            </p>
            <p className="text-xs text-red-900 font-medium">
              {HEALTH_MONITOR_COPY.criticalRiskAction}
            </p>
          </div>
        </div>
      )}

      {/* Liquidation Info */}
      <div className="bg-accent-50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-900 mb-2">{HEALTH_MONITOR_COPY.protectionTitle}</h4>
        <div className="text-xs text-gray-700 space-y-1">
          {HEALTH_MONITOR_COPY.protectionItems.map((item) => (
            <p key={item}>{item}</p>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {healthColor !== 'green' && collateralRatio && (
        <div className="bg-purple-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">{HEALTH_MONITOR_COPY.recommendedTitle}</h4>
          <div className="space-y-2">
            {collateralRatio < PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO && (
              <div className="text-sm text-purple-900">
                <span className="font-medium">
                  {HEALTH_MONITOR_COPY.recommendedAddCollateral(formatSTX(
                    (activeLoan.amountSTX * (PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO / 100)) -
                    activeLoan.collateralAmountSTX
                  ))}
                </span>
              </div>
            )}
            <div className="text-sm text-purple-900">
              <span className="font-medium">{HEALTH_MONITOR_COPY.recommendedRepay}</span>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>{HEALTH_MONITOR_COPY.infoHealthUpdates}</p>
        <p>
          {HEALTH_MONITOR_COPY.infoOnChainPrice(
            healthFactor ? healthFactor.stxPriceUSD.toFixed(2) : 'N/A'
          )}
        </p>
        <p>
          {HEALTH_MONITOR_COPY.infoMarketPrice(stxPrice.toFixed(2))}
          {priceIsStale && <span className="text-amber-600 ml-1">{HEALTH_MONITOR_COPY.staleNotice}</span>}
          {priceUpdated && !priceIsStale && (
            <span className="ml-1">{HEALTH_MONITOR_COPY.updatedAt(priceUpdated.toLocaleTimeString())}</span>
          )}
        </p>
        <p>{HEALTH_MONITOR_COPY.liquidationAuto(PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD)}</p>
      </div>
    </div>
  );
};

export default HealthMonitor;

