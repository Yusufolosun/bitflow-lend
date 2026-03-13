/**
 * Utility Functions for Calculations
 * Business logic for health factors, interest, and validation
 */

import { PROTOCOL_CONSTANTS } from '../config/contracts';

/**
 * Calculate health factor percentage
 * @param collateralSTX - Collateral amount in STX
 * @param debtSTX - Debt amount in STX
 * @returns Health factor as percentage (150% = healthy)
 */
export function calculateHealthFactor(collateralSTX: number, debtSTX: number): number {
  if (debtSTX === 0) return Infinity;
  return (collateralSTX / debtSTX) * 100;
}

/**
 * Calculate health factor with USD values
 * @param collateralSTX - Collateral amount in STX
 * @param debtSTX - Debt amount in STX
 * @param stxPriceUSD - Current STX price in USD
 * @returns Object with health factor and USD values
 */
export function calculateHealthFactorUSD(
  collateralSTX: number,
  debtSTX: number,
  stxPriceUSD: number
): {
  healthFactorPercent: number;
  collateralValueUSD: number;
  debtValueUSD: number;
} {
  const collateralValueUSD = collateralSTX * stxPriceUSD;
  const debtValueUSD = debtSTX * stxPriceUSD;
  const healthFactorPercent = calculateHealthFactor(collateralSTX, debtSTX);

  return {
    healthFactorPercent,
    collateralValueUSD,
    debtValueUSD,
  };
}

/**
 * Check if a position is liquidatable
 * @param healthFactor - Current health factor percentage
 * @returns True if position can be liquidated
 */
export function isLiquidatable(healthFactor: number): boolean {
  return healthFactor < PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD;
}

/**
 * Get health status based on health factor
 * @param healthFactor - Health factor percentage
 * @returns Status: 'healthy', 'warning', or 'critical'
 */
export function getHealthStatus(healthFactor: number): 'healthy' | 'warning' | 'critical' {
  if (healthFactor >= PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO) {
    return 'healthy';
  }
  if (healthFactor >= PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD) {
    return 'warning';
  }
  return 'critical';
}

/**
 * Calculate required collateral for a loan
 * @param loanAmountSTX - Desired loan amount in STX
 * @param collateralRatio - Collateral ratio (default: MIN_COLLATERAL_RATIO)
 * @returns Required collateral in STX
 */
export function calculateRequiredCollateral(
  loanAmountSTX: number,
  collateralRatio: number = PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO
): number {
  return loanAmountSTX * (collateralRatio / 100);
}

/**
 * Calculate maximum borrow amount based on collateral
 * @param collateralSTX - Available collateral in STX
 * @param collateralRatio - Collateral ratio (default: MIN_COLLATERAL_RATIO)
 * @returns Maximum borrow amount in STX
 */
export function calculateMaxBorrow(
  collateralSTX: number,
  collateralRatio: number = PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO
): number {
  return collateralSTX / (collateralRatio / 100);
}

/**
 * Calculate simple interest
 * @param principal - Principal amount in STX
 * @param ratePercent - Annual interest rate as percentage (e.g., 10 for 10%)
 * @param durationDays - Loan duration in days
 * @returns Interest amount in STX
 */
export function calculateSimpleInterest(
  principal: number,
  ratePercent: number,
  durationDays: number
): number {
  const rateDecimal = ratePercent / 100;
  const years = durationDays / 365;
  return principal * rateDecimal * years;
}

/**
 * Calculate compound interest
 * @param principal - Principal amount in STX
 * @param ratePercent - Annual interest rate as percentage
 * @param durationDays - Loan duration in days
 * @param compoundFrequency - Number of times interest compounds per year (default: 365 for daily)
 * @returns Total amount with interest in STX
 */
export function calculateCompoundInterest(
  principal: number,
  ratePercent: number,
  durationDays: number,
  compoundFrequency: number = 365
): number {
  const rateDecimal = ratePercent / 100;
  const years = durationDays / 365;
  const amount = principal * Math.pow(1 + rateDecimal / compoundFrequency, compoundFrequency * years);
  return amount - principal;
}

/**
 * Calculate total repayment amount
 * @param principal - Principal amount in STX
 * @param interest - Interest amount in STX
 * @returns Total repayment amount
 */
export function calculateRepaymentAmount(principal: number, interest: number): number {
  return principal + interest;
}

/**
 * Calculate APY (Annual Percentage Yield)
 * @param ratePercent - Interest rate as percentage
 * @param compoundFrequency - Number of times interest compounds per year
 * @returns APY as percentage
 */
export function calculateAPY(ratePercent: number, compoundFrequency: number = 365): number {
  const rateDecimal = ratePercent / 100;
  const apy = (Math.pow(1 + rateDecimal / compoundFrequency, compoundFrequency) - 1) * 100;
  return apy;
}

/**
 * Calculate liquidation bonus amount
 * @param collateralSTX - Collateral amount in STX
 * @param bonusPercent - Liquidation bonus percentage (default: from protocol constants)
 * @returns Bonus amount in STX
 */
export function calculateLiquidationBonus(
  collateralSTX: number,
  bonusPercent: number = PROTOCOL_CONSTANTS.LIQUIDATION_BONUS
): number {
  return collateralSTX * (bonusPercent / 100);
}

/**
 * Calculate profit from liquidation
 * @param collateralSTX - Collateral seized in STX
 * @param debtSTX - Debt to be repaid in STX
 * @param bonusPercent - Liquidation bonus percentage
 * @returns Profit in STX
 */
export function calculateLiquidationProfit(
  collateralSTX: number,
  debtSTX: number,
  bonusPercent: number = PROTOCOL_CONSTANTS.LIQUIDATION_BONUS
): number {
  const bonus = calculateLiquidationBonus(collateralSTX, bonusPercent);
  const totalReceived = collateralSTX + bonus;
  return totalReceived - debtSTX;
}

/**
 * Calculate utilization rate
 * @param totalBorrowed - Total borrowed amount
 * @param totalDeposited - Total deposited amount
 * @returns Utilization rate as percentage
 */
export function calculateUtilizationRate(totalBorrowed: number, totalDeposited: number): number {
  if (totalDeposited === 0) return 0;
  return (totalBorrowed / totalDeposited) * 100;
}

/**
 * Validate deposit amount
 * @param amount - Amount to deposit
 * @param balance - User's wallet balance
 * @param minDeposit - Minimum deposit amount (default: 0.1)
 * @returns Validation result
 */
export function validateDepositAmount(
  amount: number,
  balance: number,
  minDeposit: number = 0.1
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount < minDeposit) {
    return { valid: false, error: `Minimum deposit is ${minDeposit} STX` };
  }
  if (amount > balance - 0.1) {
    return { valid: false, error: 'Insufficient balance (reserve 0.1 STX for fees)' };
  }
  return { valid: true };
}

/**
 * Validate withdrawal amount
 * @param amount - Amount to withdraw
 * @param deposited - User's total deposited amount
 * @param availableToWithdraw - Amount available for withdrawal (not locked as collateral)
 * @returns Validation result
 */
export function validateWithdrawalAmount(
  amount: number,
  deposited: number,
  availableToWithdraw: number
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > deposited) {
    return { valid: false, error: 'Amount exceeds deposited balance' };
  }
  if (amount > availableToWithdraw) {
    return { valid: false, error: 'Amount exceeds available balance (some is locked as collateral)' };
  }
  return { valid: true };
}

/**
 * Validate borrow amount
 * @param amount - Amount to borrow
 * @param collateralSTX - Available collateral
 * @param minBorrow - Minimum borrow amount (default: 0.1 STX, matching MIN-BORROW-AMOUNT u100000)
 * @returns Validation result
 */
export function validateBorrowAmount(
  amount: number,
  collateralSTX: number,
  minBorrow: number = 0.1
): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount < minBorrow) {
    return { valid: false, error: `Minimum borrow is ${minBorrow} STX` };
  }

  const maxBorrow = calculateMaxBorrow(collateralSTX);
  if (amount > maxBorrow) {
    return { valid: false, error: `Maximum borrow is ${maxBorrow.toFixed(2)} STX with current collateral` };
  }

  const requiredCollateral = calculateRequiredCollateral(amount);
  if (requiredCollateral > collateralSTX) {
    return { valid: false, error: 'Insufficient collateral' };
  }

  return { valid: true };
}

/**
 * Validate interest rate
 * @param ratePercent - Interest rate as percentage
 * @param minRate - Minimum allowed rate (default: 5)
 * @param maxRate - Maximum allowed rate (default: 30)
 * @returns Validation result
 */
export function validateInterestRate(
  ratePercent: number,
  minRate: number = 5,
  maxRate: number = 30
): { valid: boolean; error?: string } {
  if (ratePercent < minRate) {
    return { valid: false, error: `Minimum interest rate is ${minRate}%` };
  }
  if (ratePercent > maxRate) {
    return { valid: false, error: `Maximum interest rate is ${maxRate}%` };
  }
  return { valid: true };
}

/**
 * Validate loan term
 * @param termDays - Loan term in days
 * @param allowedTerms - Array of allowed term lengths (default: [7, 30, 90, 365])
 * @returns Validation result
 */
export function validateLoanTerm(
  termDays: number,
  allowedTerms: number[] = [7, 30, 90, 365]
): { valid: boolean; error?: string } {
  if (!allowedTerms.includes(termDays)) {
    return { valid: false, error: `Loan term must be one of: ${allowedTerms.join(', ')} days` };
  }
  return { valid: true };
}

/**
 * Calculate distance to liquidation
 * @param currentHealthFactor - Current health factor percentage
 * @returns Distance to liquidation threshold (positive = safe, negative = at risk)
 */
export function calculateDistanceToLiquidation(currentHealthFactor: number): number {
  return currentHealthFactor - PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD;
}

/**
 * Calculate additional collateral needed to reach target health factor
 * @param currentCollateralSTX - Current collateral amount
 * @param debtSTX - Current debt amount
 * @param targetHealthFactor - Target health factor percentage
 * @returns Additional collateral needed in STX
 */
export function calculateAdditionalCollateralNeeded(
  currentCollateralSTX: number,
  debtSTX: number,
  targetHealthFactor: number = PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO
): number {
  const targetCollateral = debtSTX * (targetHealthFactor / 100);
  const additionalNeeded = targetCollateral - currentCollateralSTX;
  return Math.max(0, additionalNeeded);
}

/**
 * Convert basis points to percentage
 * @param basisPoints - Value in basis points (100 = 1%)
 * @returns Percentage value
 */
export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

/**
 * Convert percentage to basis points
 * @param percent - Percentage value
 * @returns Basis points value
 */
export function percentToBasisPoints(percent: number): number {
  return percent * 100;
}
