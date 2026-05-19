/**
 * Input validation utilities
 * Sanitizes and validates user input before contract interactions
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates STX amount input
 */
export const validateStxAmount = (
  amount: string,
  min: number = 0,
  max?: number
): ValidationResult => {
  // Check for empty input
  if (!amount || amount.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }

  // Check for non-numeric input
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }

  // Check for negative or zero
  if (numAmount <= min) {
    return { isValid: false, error: `Amount must be greater than ${min} STX` };
  }

  // Check maximum if specified
  if (max !== undefined && numAmount > max) {
    return { isValid: false, error: `Amount cannot exceed ${max} STX` };
  }

  // Check for too many decimal places (STX uses 6 decimals)
  const parts = amount.split('.');
  if (parts[1] && parts[1].length > 6) {
    return { isValid: false, error: 'Maximum 6 decimal places allowed' };
  }

  return { isValid: true };
};

/**
 * Validates loan term input (in days)
 */
export const validateLoanTerm = (
  term: string,
  minDays: number = 1,
  maxDays: number = 365
): ValidationResult => {
  if (!term || term.trim() === '') {
    return { isValid: false, error: 'Loan term is required' };
  }

  // Check if input contains decimal point
  if (term.includes('.')) {
    return { isValid: false, error: 'Loan term must be a whole number of days' };
  }

  const numTerm = parseInt(term, 10);
  if (isNaN(numTerm)) {
    return { isValid: false, error: 'Loan term must be a valid number' };
  }

  if (numTerm < minDays) {
    return { isValid: false, error: `Loan term must be at least ${minDays} day(s)` };
  }

  if (numTerm > maxDays) {
    return { isValid: false, error: `Loan term cannot exceed ${maxDays} days` };
  }

  return { isValid: true };
};

/**
 * Validates Stacks address format
 */
export const validateStacksAddress = (address: string): ValidationResult => {
  if (!address || address.trim() === '') {
    return { isValid: false, error: 'Address is required' };
  }

  // Testnet addresses start with ST, Mainnet with SP
  const addressPattern = /^(ST|SP)[0-9A-Z]{38,41}$/;
  
  if (!addressPattern.test(address)) {
    return { isValid: false, error: 'Invalid Stacks address format' };
  }

  return { isValid: true };
};

/**
 * Validates contract identifier format (address.contract-name)
 */
export const validateContractId = (contractId: string): ValidationResult => {
  if (!contractId || contractId.trim() === '') {
    return { isValid: false, error: 'Contract ID is required' };
  }

  const parts = contractId.split('.');
  if (parts.length !== 2) {
    return { isValid: false, error: 'Contract ID must be in format: address.contract-name' };
  }

  const [address, contractName] = parts;

  // Validate address part
  const addressValidation = validateStacksAddress(address);
  if (!addressValidation.isValid) {
    return addressValidation;
  }

  // Validate contract name (alphanumeric, hyphens, underscores)
  const contractNamePattern = /^[a-z][a-z0-9-_]{0,39}$/;
  if (!contractNamePattern.test(contractName)) {
    return { 
      isValid: false, 
      error: 'Contract name must start with a letter and contain only lowercase letters, numbers, hyphens, and underscores' 
    };
  }

  return { isValid: true };
};

/**
 * Sanitizes string input to prevent XSS
 */
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  
  // Encode special characters first
  const sanitized = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return sanitized.trim();
};

/**
 * Validates that user has sufficient balance for an operation
 */
export const validateSufficientBalance = (
  amount: number,
  balance: number,
  reserveAmount: number = 0.1 // Reserve for transaction fees
): ValidationResult => {
  if (amount + reserveAmount > balance) {
    return { 
      isValid: false, 
      error: `Insufficient balance. You need at least ${(amount + reserveAmount).toFixed(2)} STX (including ${reserveAmount} STX for fees)` 
    };
  }

  return { isValid: true };
};

/**
 * Rate limiting helper - tracks function call frequency
 */
export class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number; // in milliseconds

  constructor(maxCalls: number, timeWindowMs: number) {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMs;
  }

  /**
   * Checks if an action can be performed within rate limits
   */
  canProceed(): boolean {
    const now = Date.now();
    
    // Remove calls outside the time window
    this.calls = this.calls.filter(time => now - time < this.timeWindow);
    
    // Check if we're under the limit
    if (this.calls.length < this.maxCalls) {
      this.calls.push(now);
      return true;
    }
    
    return false;
  }

  /**
   * Gets time until next call is allowed (in milliseconds)
   */
  getTimeUntilNextCall(): number {
    if (this.calls.length < this.maxCalls) return 0;
    
    const oldestCall = Math.min(...this.calls);
    const timeUntilExpiry = this.timeWindow - (Date.now() - oldestCall);
    
    return Math.max(0, timeUntilExpiry);
  }

  /**
   * Resets the rate limiter
   */
  reset(): void {
    this.calls = [];
  }
}

/**
 * Validates health factor to determine if action is safe
 */
export const validateHealthFactor = (
  healthFactor: number,
  operation: 'borrow' | 'withdraw',
  minSafeHealthFactor: number = 150
): ValidationResult => {
  if (healthFactor < 110) {
    return { 
      isValid: false, 
      error: 'Your position is at risk of liquidation. Cannot perform this action.' 
    };
  }

  if (operation === 'borrow' && healthFactor < minSafeHealthFactor) {
    return { 
      isValid: false, 
      error: `Health factor too low. Maintain at least ${minSafeHealthFactor}% to borrow safely.` 
    };
  }

  if (operation === 'withdraw' && healthFactor < minSafeHealthFactor) {
    return { 
      isValid: false, 
      error: `Health factor too low. Maintain at least ${minSafeHealthFactor}% to withdraw safely.` 
    };
  }

  return { isValid: true };
};

