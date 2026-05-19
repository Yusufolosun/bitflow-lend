/**
 * Formatters Utility Tests
 * Task 3.6 - Tests for all formatting functions
 */
import { describe, it, expect } from 'vitest';
import {
  formatSTX,
  formatMicroSTX,
  formatUSD,
  formatPercentage,
  formatAddress,
  formatDate,
  formatDateTime,
  formatTimestamp,
  formatDuration,
  formatAPY,
  formatCompactNumber,
  formatTxHash,
  formatBlockHeight,
  truncateText,
  formatInterestRate,
  formatHealthFactor,
  formatCollateralRatio,
} from '../formatters';

describe('Formatters Utility', () => {
  describe('formatSTX', () => {
    it('formats zero as 0.00', () => {
      expect(formatSTX(0)).toBe('0.00');
    });

    it('formats small amounts', () => {
      expect(formatSTX(0.001)).toBe('<0.01');
    });

    it('formats normal amounts with 2 decimals', () => {
      expect(formatSTX(123.456)).toBe('123.46');
    });

    it('formats large amounts with commas', () => {
      expect(formatSTX(1000000)).toBe('1,000,000.00');
    });

    it('accepts custom decimal places', () => {
      expect(formatSTX(1.23456, 4)).toBe('1.2346');
    });

    it('handles bigint input', () => {
      expect(formatSTX(BigInt(100))).toBe('100.00');
    });
  });

  describe('formatMicroSTX', () => {
    it('converts microSTX to STX', () => {
      expect(formatMicroSTX(1000000)).toBe('1.00');
    });

    it('handles bigint', () => {
      expect(formatMicroSTX(BigInt(5000000))).toBe('5.00');
    });

    it('formats with custom decimals', () => {
      expect(formatMicroSTX(1234567, 4)).toBe('1.2346');
    });
  });

  describe('formatUSD', () => {
    it('formats with dollar sign', () => {
      expect(formatUSD(100)).toBe('$100.00');
    });

    it('formats large numbers', () => {
      expect(formatUSD(1000000)).toBe('$1,000,000.00');
    });

    it('formats with custom decimals', () => {
      expect(formatUSD(1.5, 0)).toBe('$2');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage with 1 decimal', () => {
      expect(formatPercentage(50)).toBe('50.0%');
    });

    it('formats with custom decimals', () => {
      expect(formatPercentage(33.333, 2)).toBe('33.33%');
    });

    it('handles zero', () => {
      expect(formatPercentage(0)).toBe('0.0%');
    });
  });

  describe('formatAddress', () => {
    it('shortens long addresses', () => {
      expect(formatAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'))
        .toBe('ST1PQH...GZGM');
    });

    it('returns empty string for empty input', () => {
      expect(formatAddress('')).toBe('');
    });

    it('returns short addresses unchanged', () => {
      expect(formatAddress('ST1ABC')).toBe('ST1ABC');
    });

    it('accepts custom start and end chars', () => {
      expect(formatAddress('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', 4, 6))
        .toBe('ST1P...TPGZGM');
    });
  });

  describe('formatDate', () => {
    it('formats timestamp in seconds', () => {
      // 2025-01-01 00:00:00 UTC
      const result = formatDate(1735689600);
      expect(result).toContain('2025');
    });

    it('formats timestamp in milliseconds', () => {
      const result = formatDate(1735689600000);
      expect(result).toContain('2025');
    });
  });

  describe('formatDateTime', () => {
    it('includes time in output', () => {
      const result = formatDateTime(1735689600);
      expect(result).toContain('2025');
    });
  });

  describe('formatTimestamp', () => {
    it('returns just now for recent timestamps', () => {
      const now = Date.now();
      expect(formatTimestamp(now)).toBe('just now');
    });

    it('returns minutes ago', () => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      expect(formatTimestamp(fiveMinutesAgo)).toBe('5 minutes ago');
    });

    it('returns hours ago', () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      expect(formatTimestamp(twoHoursAgo)).toBe('2 hours ago');
    });

    it('returns days ago', () => {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
      expect(formatTimestamp(threeDaysAgo)).toBe('3 days ago');
    });

    it('handles singular form', () => {
      const oneMinuteAgo = Date.now() - 60 * 1000;
      expect(formatTimestamp(oneMinuteAgo)).toBe('1 minute ago');
    });
  });

  describe('formatDuration', () => {
    it('formats days and hours', () => {
      expect(formatDuration(90000)).toBe('1d 1h');
    });

    it('formats hours and minutes', () => {
      expect(formatDuration(3700)).toBe('1h 1m');
    });

    it('formats seconds only', () => {
      expect(formatDuration(30)).toBe('30s');
    });

    it('returns 0s for zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });
  });

  describe('formatAPY', () => {
    it('formats APY string', () => {
      expect(formatAPY(10.5)).toBe('10.50% APY');
    });

    it('accepts custom decimals', () => {
      expect(formatAPY(10.5, 0)).toBe('11% APY');
    });
  });

  describe('formatCompactNumber', () => {
    it('formats thousands', () => {
      expect(formatCompactNumber(1500)).toBe('1.5K');
    });

    it('formats millions', () => {
      expect(formatCompactNumber(2500000)).toBe('2.5M');
    });

    it('formats billions', () => {
      expect(formatCompactNumber(1200000000)).toBe('1.2B');
    });

    it('returns small numbers as-is', () => {
      expect(formatCompactNumber(500)).toBe('500.0');
    });
  });

  describe('formatTxHash', () => {
    it('shortens long hashes', () => {
      expect(formatTxHash('0xabcdef1234567890abcdef'))
        .toBe('0xabcd...abcdef');
    });

    it('returns empty string for empty input', () => {
      expect(formatTxHash('')).toBe('');
    });

    it('returns short hashes unchanged', () => {
      expect(formatTxHash('0xabc')).toBe('0xabc');
    });
  });

  describe('formatBlockHeight', () => {
    it('formats with thousand separators', () => {
      expect(formatBlockHeight(123456)).toBe('123,456');
    });

    it('formats small numbers', () => {
      expect(formatBlockHeight(100)).toBe('100');
    });
  });

  describe('truncateText', () => {
    it('truncates long text', () => {
      expect(truncateText('Hello World, this is a long text', 15))
        .toBe('Hello World,...');
    });

    it('returns short text unchanged', () => {
      expect(truncateText('Hi', 10)).toBe('Hi');
    });
  });

  describe('formatInterestRate', () => {
    it('converts basis points to percentage', () => {
      expect(formatInterestRate(1000)).toBe('10.00%');
    });

    it('handles zero', () => {
      expect(formatInterestRate(0)).toBe('0.00%');
    });
  });

  describe('formatHealthFactor', () => {
    it('formats as percentage', () => {
      expect(formatHealthFactor(150)).toBe('150.0%');
    });
  });

  describe('formatCollateralRatio', () => {
    it('converts decimal to percentage', () => {
      expect(formatCollateralRatio(1.5)).toBe('150.0%');
    });
  });
});

