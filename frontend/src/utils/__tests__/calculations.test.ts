/**
 * Calculations Utility Tests
 * Task 3.6 - Tests for all calculation functions
 */
import { describe, it, expect, vi } from 'vitest';

// Mock the config before importing calculations
vi.mock('../../config/contracts', () => ({
  PROTOCOL_CONSTANTS: {
    MIN_COLLATERAL_RATIO: 150,
    LIQUIDATION_THRESHOLD: 110,
    LIQUIDATION_BONUS: 5,
    BLOCKS_PER_YEAR: 52560,
    BLOCK_TIME_MINUTES: 10,
  },
}));

import {
  calculateHealthFactor,
  calculateHealthFactorUSD,
  isLiquidatable,
  getHealthStatus,
  calculateRequiredCollateral,
  calculateMaxBorrow,
  calculateSimpleInterest,
  calculateCompoundInterest,
  calculateRepaymentAmount,
  calculateAPY,
  calculateLiquidationBonus,
  calculateLiquidationProfit,
  calculateUtilizationRate,
  validateDepositAmount,
  validateWithdrawalAmount,
  validateBorrowAmount,
  validateInterestRate,
  validateLoanTerm,
  calculateDistanceToLiquidation,
  calculateAdditionalCollateralNeeded,
  basisPointsToPercent,
  percentToBasisPoints,
} from '../calculations';

describe('Calculations Utility', () => {
  describe('calculateHealthFactor', () => {
    it('returns Infinity when debt is 0', () => {
      expect(calculateHealthFactor(100, 0)).toBe(Infinity);
    });

    it('calculates 150% for equal collateral:debt at 1.5:1', () => {
      expect(calculateHealthFactor(150, 100)).toBe(150);
    });

    it('calculates 100% for 1:1 ratio', () => {
      expect(calculateHealthFactor(100, 100)).toBe(100);
    });

    it('calculates 200% for 2:1 ratio', () => {
      expect(calculateHealthFactor(200, 100)).toBe(200);
    });

    it('handles fractional values', () => {
      expect(calculateHealthFactor(75.5, 50)).toBeCloseTo(151, 0);
    });
  });

  describe('calculateHealthFactorUSD', () => {
    it('returns correct USD values', () => {
      const result = calculateHealthFactorUSD(100, 50, 2.0);
      expect(result.collateralValueUSD).toBe(200);
      expect(result.debtValueUSD).toBe(100);
      expect(result.healthFactorPercent).toBe(200);
    });

    it('handles zero debt', () => {
      const result = calculateHealthFactorUSD(100, 0, 1.5);
      expect(result.healthFactorPercent).toBe(Infinity);
    });
  });

  describe('isLiquidatable', () => {
    it('returns true when below liquidation threshold', () => {
      expect(isLiquidatable(109)).toBe(true);
    });

    it('returns false when at liquidation threshold', () => {
      expect(isLiquidatable(110)).toBe(false);
    });

    it('returns false when above threshold', () => {
      expect(isLiquidatable(150)).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('returns healthy when >= 150', () => {
      expect(getHealthStatus(150)).toBe('healthy');
      expect(getHealthStatus(200)).toBe('healthy');
    });

    it('returns warning when >= 110 but < 150', () => {
      expect(getHealthStatus(110)).toBe('warning');
      expect(getHealthStatus(149)).toBe('warning');
    });

    it('returns critical when < 110', () => {
      expect(getHealthStatus(109)).toBe('critical');
      expect(getHealthStatus(50)).toBe('critical');
    });
  });

  describe('calculateRequiredCollateral', () => {
    it('calculates 150% collateral requirement', () => {
      expect(calculateRequiredCollateral(100)).toBe(150);
    });

    it('uses custom collateral ratio', () => {
      expect(calculateRequiredCollateral(100, 200)).toBe(200);
    });

    it('handles zero amount', () => {
      expect(calculateRequiredCollateral(0)).toBe(0);
    });
  });

  describe('calculateMaxBorrow', () => {
    it('calculates max borrow from collateral', () => {
      expect(calculateMaxBorrow(150)).toBeCloseTo(100, 2);
    });

    it('uses custom ratio', () => {
      expect(calculateMaxBorrow(200, 200)).toBe(100);
    });

    it('returns 0 for zero collateral', () => {
      expect(calculateMaxBorrow(0)).toBe(0);
    });
  });

  describe('calculateSimpleInterest', () => {
    it('calculates annual interest', () => {
      // 100 STX at 10% for 365 days = 10 STX
      expect(calculateSimpleInterest(100, 10, 365)).toBeCloseTo(10, 2);
    });

    it('calculates partial year interest', () => {
      // 100 STX at 10% for 30 days
      expect(calculateSimpleInterest(100, 10, 30)).toBeCloseTo(0.822, 2);
    });

    it('returns 0 for zero principal', () => {
      expect(calculateSimpleInterest(0, 10, 365)).toBe(0);
    });

    it('returns 0 for zero rate', () => {
      expect(calculateSimpleInterest(100, 0, 365)).toBe(0);
    });
  });

  describe('calculateCompoundInterest', () => {
    it('calculates compound interest for full year', () => {
      const interest = calculateCompoundInterest(100, 10, 365);
      // Compound > simple: should be > 10
      expect(interest).toBeGreaterThan(10);
      expect(interest).toBeCloseTo(10.52, 1);
    });

    it('returns 0 for zero principal', () => {
      expect(calculateCompoundInterest(0, 10, 365)).toBe(0);
    });
  });

  describe('calculateRepaymentAmount', () => {
    it('adds principal and interest', () => {
      expect(calculateRepaymentAmount(100, 10)).toBe(110);
    });

    it('handles zero interest', () => {
      expect(calculateRepaymentAmount(50, 0)).toBe(50);
    });
  });

  describe('calculateAPY', () => {
    it('calculates APY for daily compounding', () => {
      const apy = calculateAPY(10);
      expect(apy).toBeGreaterThan(10);
      expect(apy).toBeCloseTo(10.52, 1);
    });

    it('returns 0 for 0% rate', () => {
      expect(calculateAPY(0)).toBeCloseTo(0, 5);
    });
  });

  describe('calculateLiquidationBonus', () => {
    it('calculates 5% bonus', () => {
      expect(calculateLiquidationBonus(100)).toBe(5);
    });

    it('uses custom bonus percent', () => {
      expect(calculateLiquidationBonus(100, 10)).toBe(10);
    });
  });

  describe('calculateLiquidationProfit', () => {
    it('calculates profit from liquidation', () => {
      // 100 collateral received, paid (80 debt + 4 bonus) = 16 profit
      const profit = calculateLiquidationProfit(100, 80);
      expect(profit).toBe(16);
    });

    it('handles break-even scenario', () => {
      // collateral 100 - (debt 95.238 + bonus 4.762) = 0
      // Exact: debt * 1.05 = 100, so debt = 100/1.05 ≈ 95.238
      const debt = 100 / 1.05;
      const profit = calculateLiquidationProfit(100, debt);
      expect(profit).toBeCloseTo(0, 5);
    });
  });

  describe('calculateUtilizationRate', () => {
    it('calculates utilization percentage', () => {
      expect(calculateUtilizationRate(50, 100)).toBe(50);
    });

    it('returns 0 when no deposits', () => {
      expect(calculateUtilizationRate(0, 0)).toBe(0);
    });

    it('returns 100 when fully utilized', () => {
      expect(calculateUtilizationRate(100, 100)).toBe(100);
    });
  });

  describe('validateDepositAmount', () => {
    it('validates correct amount', () => {
      expect(validateDepositAmount(10, 100)).toEqual({ valid: true });
    });

    it('rejects zero amount', () => {
      const result = validateDepositAmount(0, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('rejects negative amount', () => {
      expect(validateDepositAmount(-1, 100).valid).toBe(false);
    });

    it('rejects amount below minimum', () => {
      const result = validateDepositAmount(0.05, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum deposit');
    });

    it('rejects when insufficient balance for fees', () => {
      const result = validateDepositAmount(100, 100);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient balance');
    });
  });

  describe('validateWithdrawalAmount', () => {
    it('validates correct withdrawal', () => {
      expect(validateWithdrawalAmount(10, 50, 50)).toEqual({ valid: true });
    });

    it('rejects zero withdrawal', () => {
      expect(validateWithdrawalAmount(0, 50, 50).valid).toBe(false);
    });

    it('rejects exceeding deposited amount', () => {
      expect(validateWithdrawalAmount(60, 50, 50).valid).toBe(false);
    });

    it('rejects exceeding available amount', () => {
      const result = validateWithdrawalAmount(30, 50, 20);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('locked as collateral');
    });
  });

  describe('validateBorrowAmount', () => {
    it('validates correct borrow', () => {
      expect(validateBorrowAmount(50, 150)).toEqual({ valid: true });
    });

    it('rejects zero amount', () => {
      expect(validateBorrowAmount(0, 150).valid).toBe(false);
    });

    it('rejects below minimum', () => {
      const result = validateBorrowAmount(0.5, 150);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum borrow');
    });

    it('rejects exceeding max borrow', () => {
      // 150 collateral => max 100 STX at 150% ratio
      const result = validateBorrowAmount(200, 150);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateInterestRate', () => {
    it('validates rate in range', () => {
      expect(validateInterestRate(10)).toEqual({ valid: true });
    });

    it('rejects below minimum', () => {
      const result = validateInterestRate(3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum');
    });

    it('rejects above maximum', () => {
      const result = validateInterestRate(50);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });
  });

  describe('validateLoanTerm', () => {
    it('validates allowed term', () => {
      expect(validateLoanTerm(30)).toEqual({ valid: true });
    });

    it('rejects disallowed term', () => {
      const result = validateLoanTerm(15);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be one of');
    });

    it('validates all allowed terms', () => {
      expect(validateLoanTerm(7).valid).toBe(true);
      expect(validateLoanTerm(30).valid).toBe(true);
      expect(validateLoanTerm(90).valid).toBe(true);
      expect(validateLoanTerm(365).valid).toBe(true);
    });
  });

  describe('calculateDistanceToLiquidation', () => {
    it('returns positive when healthy', () => {
      expect(calculateDistanceToLiquidation(150)).toBe(40);
    });

    it('returns 0 at threshold', () => {
      expect(calculateDistanceToLiquidation(110)).toBe(0);
    });

    it('returns negative when liquidatable', () => {
      expect(calculateDistanceToLiquidation(90)).toBe(-20);
    });
  });

  describe('calculateAdditionalCollateralNeeded', () => {
    it('returns 0 when sufficient collateral', () => {
      expect(calculateAdditionalCollateralNeeded(150, 100)).toBe(0);
    });

    it('calculates needed additional collateral', () => {
      // Need 150 for 100 debt at 150%, have 100 => need 50 more
      expect(calculateAdditionalCollateralNeeded(100, 100)).toBe(50);
    });

    it('returns 0 when over-collateralized', () => {
      expect(calculateAdditionalCollateralNeeded(200, 100)).toBe(0);
    });
  });

  describe('Basis Points Conversion', () => {
    it('converts basis points to percent', () => {
      expect(basisPointsToPercent(1000)).toBe(10);
      expect(basisPointsToPercent(500)).toBe(5);
      expect(basisPointsToPercent(100)).toBe(1);
    });

    it('converts percent to basis points', () => {
      expect(percentToBasisPoints(10)).toBe(1000);
      expect(percentToBasisPoints(5)).toBe(500);
      expect(percentToBasisPoints(1)).toBe(100);
    });

    it('round-trips correctly', () => {
      expect(basisPointsToPercent(percentToBasisPoints(10))).toBe(10);
      expect(percentToBasisPoints(basisPointsToPercent(1000))).toBe(1000);
    });
  });
});
