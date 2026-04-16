import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validateStxAmount,
  validateLoanTerm,
  validateStacksAddress,
  validateContractId,
  sanitizeString,
  validateSufficientBalance,
  validateHealthFactor,
  RateLimiter,
} from '../validation';

describe('validateStxAmount', () => {
  it('rejects empty input', () => {
    const result = validateStxAmount('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount is required');
  });

  it('rejects non-numeric input', () => {
    const result = validateStxAmount('abc');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Amount must be a valid number');
  });

  it('rejects zero or negative amounts', () => {
    const result1 = validateStxAmount('0');
    expect(result1.isValid).toBe(false);

    const result2 = validateStxAmount('-10');
    expect(result2.isValid).toBe(false);
  });

  it('accepts valid positive amounts', () => {
    const result = validateStxAmount('100.5');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects amounts exceeding maximum', () => {
    const result = validateStxAmount('1000', 0, 500);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot exceed');
  });

  it('rejects amounts with too many decimals', () => {
    const result = validateStxAmount('100.1234567');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Maximum 6 decimal places allowed');
  });

  it('accepts amounts with up to 6 decimals', () => {
    const result = validateStxAmount('100.123456');
    expect(result.isValid).toBe(true);
  });
});

describe('validateLoanTerm', () => {
  it('rejects empty input', () => {
    const result = validateLoanTerm('');
    expect(result.isValid).toBe(false);
  });

  it('rejects non-numeric input', () => {
    const result = validateLoanTerm('abc');
    expect(result.isValid).toBe(false);
  });

  it('rejects terms below minimum', () => {
    const result = validateLoanTerm('0', 1, 365);
    expect(result.isValid).toBe(false);
  });

  it('rejects terms above maximum', () => {
    const result = validateLoanTerm('400', 1, 365);
    expect(result.isValid).toBe(false);
  });

  it('rejects decimal values', () => {
    const result = validateLoanTerm('30.5');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('whole number');
  });

  it('accepts valid term', () => {
    const result = validateLoanTerm('30', 1, 365);
    expect(result.isValid).toBe(true);
  });
});

describe('validateStacksAddress', () => {
  it('rejects empty address', () => {
    const result = validateStacksAddress('');
    expect(result.isValid).toBe(false);
  });

  it('accepts valid testnet address', () => {
    const result = validateStacksAddress('ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0');
    expect(result.isValid).toBe(true);
  });

  it('accepts valid mainnet address', () => {
    const result = validateStacksAddress('SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid address format', () => {
    const result = validateStacksAddress('ABC123');
    expect(result.isValid).toBe(false);
  });

  it('rejects address with invalid prefix', () => {
    const result = validateStacksAddress('XX1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0');
    expect(result.isValid).toBe(false);
  });
});

describe('validateContractId', () => {
  it('rejects empty contract ID', () => {
    const result = validateContractId('');
    expect(result.isValid).toBe(false);
  });

  it('rejects contract ID without dot separator', () => {
    const result = validateContractId('ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0');
    expect(result.isValid).toBe(false);
  });

  it('accepts valid contract ID', () => {
    const result = validateContractId('ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core-v2');
    expect(result.isValid).toBe(true);
  });

  it('rejects invalid contract name', () => {
    const result = validateContractId('ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.InvalidName!');
    expect(result.isValid).toBe(false);
  });

  it('rejects contract name starting with number', () => {
    const result = validateContractId('ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.1contract');
    expect(result.isValid).toBe(false);
  });
});

describe('sanitizeString', () => {
  it('encodes HTML tags to prevent XSS', () => {
    const result = sanitizeString('<div>test</div>');
    expect(result).toBe('&lt;div&gt;test&lt;&#x2F;div&gt;');
  });

  it('encodes script tags to prevent XSS', () => {
    const result = sanitizeString('<script>alert("xss")</script>');
    expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('encodes special characters', () => {
    const result = sanitizeString('<>&"\'');
    expect(result).toBe('&lt;&gt;&amp;&quot;&#x27;');
  });

  it('handles empty input', () => {
    const result = sanitizeString('');
    expect(result).toBe('');
  });

  it('preserves normal text', () => {
    const result = sanitizeString('Hello World');
    expect(result).toBe('Hello World');
  });
});

describe('validateSufficientBalance', () => {
  it('rejects when amount exceeds balance', () => {
    const result = validateSufficientBalance(100, 50);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Insufficient balance');
  });

  it('accounts for reserve amount', () => {
    const result = validateSufficientBalance(99, 100, 2);
    expect(result.isValid).toBe(false);
  });

  it('accepts when balance is sufficient', () => {
    const result = validateSufficientBalance(50, 100, 0.1);
    expect(result.isValid).toBe(true);
  });
});

describe('validateHealthFactor', () => {
  it('rejects operations below liquidation threshold', () => {
    const result = validateHealthFactor(105, 'borrow');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('liquidation');
  });

  it('rejects borrow when health factor too low', () => {
    const result = validateHealthFactor(140, 'borrow', 150);
    expect(result.isValid).toBe(false);
  });

  it('rejects withdraw when health factor too low', () => {
    const result = validateHealthFactor(140, 'withdraw', 150);
    expect(result.isValid).toBe(false);
  });

  it('accepts operation when health factor is safe', () => {
    const result = validateHealthFactor(200, 'borrow', 150);
    expect(result.isValid).toBe(true);
  });
});

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows calls within limit', () => {
    const limiter = new RateLimiter(3, 1000);
    
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
    expect(limiter.canProceed()).toBe(true);
  });

  it('blocks calls exceeding limit', () => {
    const limiter = new RateLimiter(2, 1000);
    
    limiter.canProceed();
    limiter.canProceed();
    
    expect(limiter.canProceed()).toBe(false);
  });

  it('allows calls after time window expires', () => {
    const limiter = new RateLimiter(2, 1000);
    
    limiter.canProceed();
    limiter.canProceed();
    
    expect(limiter.canProceed()).toBe(false);
    
    vi.advanceTimersByTime(1100);
    
    expect(limiter.canProceed()).toBe(true);
  });

  it('calculates time until next call', () => {
    const limiter = new RateLimiter(1, 1000);
    
    limiter.canProceed();
    
    const timeUntil = limiter.getTimeUntilNextCall();
    expect(timeUntil).toBeGreaterThan(0);
    expect(timeUntil).toBeLessThanOrEqual(1000);
  });

  it('resets properly', () => {
    const limiter = new RateLimiter(1, 1000);
    
    limiter.canProceed();
    expect(limiter.canProceed()).toBe(false);
    
    limiter.reset();
    expect(limiter.canProceed()).toBe(true);
  });
});
