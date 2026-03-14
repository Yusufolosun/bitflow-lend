/**
 * TypeScript Type Definitions for BitFlow Vault
 * Defines interfaces for all vault-related data structures
 */

/**
 * User Deposit Information
 */
export interface UserDeposit {
  /** Total amount deposited in microSTX */
  amount: bigint;
  /** Amount in STX (converted from microSTX) */
  amountSTX: number;
  /** Amount available for withdrawal (not locked as collateral) */
  availableToWithdraw: bigint;
  /** Amount available in STX */
  availableToWithdrawSTX: number;
}

/**
 * User Loan Information
 */
export interface UserLoan {
  /** Principal loan amount in microSTX */
  amount: bigint;
  /** Principal in STX */
  amountSTX: number;
  /** Interest rate in basis points (1000 = 10%) */
  interestRate: number;
  /** Interest rate as percentage */
  interestRatePercent: number;
  /** Block height when loan started */
  startBlock: number;
  /** Block height when loan term ends */
  termEnd: number;
  /** Loan duration in days (calculated) */
  durationDays: number;
  /** Timestamp when loan started (in seconds) */
  startTimestamp: number;
  /** Collateral locked for this loan */
  collateralAmount: bigint;
  /** Collateral in STX */
  collateralAmountSTX: number;
}

/**
 * Repayment Amount Details
 */
export interface RepaymentAmount {
  /** Principal amount to repay in microSTX */
  principal: bigint;
  /** Principal in STX */
  principalSTX: number;
  /** Interest accrued in microSTX */
  interest: bigint;
  /** Interest in STX */
  interestSTX: number;
  /** Late penalty in microSTX (0 if loan not overdue) */
  penalty: bigint;
  /** Penalty in STX */
  penaltySTX: number;
  /** Total repayment amount (principal + interest + penalty) in microSTX */
  total: bigint;
  /** Total in STX */
  totalSTX: number;
}

/**
 * Health Factor Information
 */
export interface HealthFactor {
  /** Health factor as percentage (150 = 150%) */
  value: number;
  /** Health status classification */
  status: 'healthy' | 'warning' | 'danger';
  /** Is position liquidatable */
  isLiquidatable: boolean;
  /** Collateral value in USD */
  collateralValueUSD: number;
  /** Loan value in USD */
  loanValueUSD: number;
}

/**
 * Liquidation Data
 */
export interface LiquidationData {
  /** Borrower being liquidated */
  borrower: string;
  /** Collateral seized in microSTX */
  seizedCollateral: bigint;
  /** Collateral seized in STX */
  seizedCollateralSTX: number;
  /** Amount paid by liquidator in microSTX */
  paid: bigint;
  /** Amount paid in STX */
  paidSTX: number;
  /** Liquidation bonus in microSTX */
  bonus: bigint;
  /** Bonus in STX */
  bonusSTX: number;
  /** Transaction ID */
  txId: string;
}

/**
 * Protocol Metrics (from analytics)
 */
export interface ProtocolMetrics {
  /** Total number of deposits */
  totalDeposits: number;
  /** Total number of withdrawals */
  totalWithdrawals: number;
  /** Total number of borrows */
  totalBorrows: number;
  /** Total number of repayments */
  totalRepayments: number;
  /** Total number of liquidations */
  totalLiquidations: number;
}

/**
 * Volume Metrics (from analytics)
 */
export interface VolumeMetrics {
  /** Total deposit volume in microSTX */
  depositVolume: bigint;
  /** Total borrow volume in microSTX */
  borrowVolume: bigint;
  /** Total repay volume in microSTX */
  repayVolume: bigint;
  /** Total liquidation volume in microSTX */
  liquidationVolume: bigint;
}

/**
 * Transaction Status
 */
export interface TransactionStatus {
  /** Transaction ID */
  txId: string;
  /** Current status */
  status: 'pending' | 'success' | 'failed';
  /** Error message if failed */
  error?: string;
  /** Result data if success */
  result?: any;
}

/**
 * Wallet Connection State
 */
export interface WalletState {
  /** Is wallet connected */
  isConnected: boolean;
  /** User's STX address */
  address: string | null;
  /** User's STX balance in microSTX */
  balance: bigint;
  /** Balance in STX */
  balanceSTX: number;
}

/**
 * Borrow Parameters
 */
export interface BorrowParams {
  /** Amount to borrow in microSTX */
  amount: bigint;
  /** Interest rate in basis points */
  interestRate: number;
  /** Loan term in days */
  termDays: number;
}

/**
 * Deposit Parameters
 */
export interface DepositParams {
  /** Amount to deposit in microSTX */
  amount: bigint;
}

/**
 * Withdraw Parameters
 */
export interface WithdrawParams {
  /** Amount to withdraw in microSTX */
  amount: bigint;
}

/**
 * Helper type for contract call responses
 */
export interface ContractCallResponse<T = any> {
  /** Was the call successful */
  success: boolean;
  /** Transaction ID if successful */
  txId?: string;
  /** Error message if failed */
  error?: string;
  /** Response data */
  data?: T;
}

/**
 * Loan Term Option
 */
export interface LoanTermOption {
  /** Term in days */
  days: number;
  /** Display label */
  label: string;
  /** Estimated interest rate (example) */
  suggestedRate?: number;
}

/**
 * Common loan terms
 */
export const LOAN_TERMS: LoanTermOption[] = [
  { days: 7, label: '7 days', suggestedRate: 5 },
  { days: 30, label: '30 days', suggestedRate: 10 },
  { days: 90, label: '90 days', suggestedRate: 15 },
  { days: 365, label: '1 year', suggestedRate: 20 },
];

/**
 * Protocol-specific constants
 */
export const STX_DECIMALS = 6;
export const MICRO_STX = 1_000_000;
