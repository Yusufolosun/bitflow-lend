/**
 * Protocol Constants for BitFlow Lend
 * 
 * These constants define the core parameters and configuration
 * for the DeFi lending protocol on Stacks blockchain
 */

// Network Configuration
export const NETWORK = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
  DEVNET: 'devnet',
} as const;

export const CURRENT_NETWORK = import.meta.env.VITE_NETWORK || NETWORK.TESTNET;

// Contract Addresses
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '';
export const CONTRACT_NAME = 'bitflow-vault-core';

// Validate required env vars on startup so misconfiguration fails fast
// instead of producing cryptic contract call errors at runtime.
// Skip validation during test runs where VITE_ vars are not injected.
const REQUIRED_ENV_VARS = ['VITE_CONTRACT_ADDRESS'] as const;

if (import.meta.env.MODE !== 'test') {
  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      throw new Error(
        `Missing required environment variable: ${key}. ` +
        'Copy .env.example to .env and fill in the values before starting the app.'
      );
    }
  }
}

// API Endpoints
export const API_URLS = {
  testnet: 'https://api.testnet.hiro.so',
  mainnet: 'https://api.hiro.so',
  devnet: 'http://localhost:3999',
} as const;

export const STACKS_API_URL = import.meta.env.VITE_STACKS_API_URL || API_URLS[CURRENT_NETWORK as keyof typeof API_URLS];

// Protocol parameters are defined once in config/contracts.ts (PROTOCOL_CONSTANTS)
// to match the on-chain Clarity constants. Import from there directly.
//
// Additional protocol-level settings that don't exist on-chain:
export const PROTOCOL_PARAMS = {
  INTEREST_RATE_BP: 10, // 0.1% per 52,560 blocks (~1 year)
  MIN_BORROW_AMOUNT: 100, // minimum borrow in STX
  MAX_LTV: 66.67, // 1/1.5 = ~66.67%
  PROTOCOL_FEE_BP: 25, // 0.25%
} as const;

// STX Token Configuration
export const STX_CONFIG = {
  DECIMALS: 6,
  SYMBOL: 'STX',
  NAME: 'Stacks',
  MICRO_STX_PER_STX: 1_000_000,
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw',
  BORROW: 'borrow',
  REPAY: 'repay',
  LIQUIDATION: 'liquidation',
} as const;

// Transaction Status
export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

// Health Factor Thresholds
export const HEALTH_THRESHOLDS = {
  CRITICAL: 110,  // Below this = liquidatable
  WARNING: 150,   // Below this = at risk
  SAFE: 150,      // Above this = healthy
} as const;

// Health Factor Colors
export const HEALTH_COLORS = {
  CRITICAL: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    badge: 'badge-danger',
  },
  WARNING: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    badge: 'badge-warning',
  },
  SAFE: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    badge: 'badge-success',
  },
} as const;

// UI Configuration
export const UI_CONFIG = {
  // Pagination
  ITEMS_PER_PAGE: 10,
  
  // Refresh intervals (ms)
  PRICE_REFRESH_INTERVAL: 30000, // 30 seconds
  BALANCE_REFRESH_INTERVAL: 10000, // 10 seconds
  TRANSACTION_REFRESH_INTERVAL: 5000, // 5 seconds
  
  // Toast durations (ms)
  TOAST_SUCCESS_DURATION: 3000,
  TOAST_ERROR_DURATION: 5000,
  TOAST_INFO_DURATION: 4000,
  
  // Animation durations (ms)
  ANIMATION_DURATION: 300,
  
  // Debounce delays (ms)
  INPUT_DEBOUNCE: 500,
  SEARCH_DEBOUNCE: 300,
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  WALLET_DATA: 'bitflow_wallet_data',
  USER_PREFERENCES: 'bitflow_user_preferences',
  TRANSACTION_HISTORY: 'bitflow_transaction_history',
  LAST_PRICE_UPDATE: 'bitflow_last_price_update',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet first',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INSUFFICIENT_COLLATERAL: 'Insufficient collateral',
  INVALID_AMOUNT: 'Invalid amount',
  AMOUNT_TOO_LOW: 'Amount is below minimum',
  AMOUNT_TOO_HIGH: 'Amount exceeds maximum',
  TRANSACTION_FAILED: 'Transaction failed',
  NETWORK_ERROR: 'Network error occurred',
  CONTRACT_ERROR: 'Contract call failed',
  LOAN_NOT_FOUND: 'Loan not found',
  ALREADY_HEALTHY: 'Position is already healthy',
  NOT_LIQUIDATABLE: 'Position cannot be liquidated',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  DEPOSIT_SUCCESS: 'Deposit successful',
  WITHDRAW_SUCCESS: 'Withdrawal successful',
  BORROW_SUCCESS: 'Borrow successful',
  REPAY_SUCCESS: 'Repayment successful',
  LIQUIDATION_SUCCESS: 'Liquidation successful',
  WALLET_CONNECTED: 'Wallet connected successfully',
  WALLET_DISCONNECTED: 'Wallet disconnected',
} as const;

// Feature Flags
export const FEATURES = {
  ENABLE_LIQUIDATIONS: import.meta.env.VITE_ENABLE_LIQUIDATIONS === 'true',
  ENABLE_NOTIFICATIONS: import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true',
  ENABLE_ANALYTICS: false, // To be implemented
  ENABLE_GOVERNANCE: false, // Future feature
} as const;

// Contract Function Names — must match the Clarity contract exactly
export const CONTRACT_FUNCTIONS = {
  DEPOSIT: 'deposit',
  WITHDRAW: 'withdraw',
  BORROW: 'borrow',
  REPAY: 'repay',
  LIQUIDATE: 'liquidate',
  GET_DEPOSIT: 'get-user-deposit',
  GET_LOAN: 'get-user-loan',
  GET_TOTAL_DEPOSITS: 'get-total-deposits',
} as const;

// Decimal Precision
export const DECIMAL_PRECISION = {
  STX_AMOUNT: 2,
  USD_AMOUNT: 2,
  PERCENTAGE: 2,
  HEALTH_FACTOR: 2,
  INTEREST_RATE: 4,
} as const;

// Chart Configuration
export const CHART_CONFIG = {
  COLORS: {
    primary: '#3B82F6',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#6366F1',
  },
  DEFAULT_DAYS: 7,
  MAX_DATA_POINTS: 100,
} as const;

// Export all constants as default object
export default {
  NETWORK,
  CURRENT_NETWORK,
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  API_URLS,
  STACKS_API_URL,
  PROTOCOL_PARAMS,
  STX_CONFIG,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  HEALTH_THRESHOLDS,
  HEALTH_COLORS,
  UI_CONFIG,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURES,
  CONTRACT_FUNCTIONS,
  DECIMAL_PRECISION,
  CHART_CONFIG,
} as const;
