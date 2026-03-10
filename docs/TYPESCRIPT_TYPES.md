# TypeScript Types Reference

> **Complete type definitions for integrating with the BitFlow Lend protocol.**

All types match the on-chain Clarity contract data structures. Use these interfaces to ensure type safety in your application.

---

## Contract Types

### Addresses

```typescript
/** Stacks principal address */
type StacksAddress = string;

/** Contract identifier: address.name */
type ContractId = `${StacksAddress}.${string}`;

/** BitFlow mainnet contract */
const BITFLOW_CONTRACT: ContractId =
  'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core';

/** BitFlow testnet contract */
const BITFLOW_TESTNET_CONTRACT: ContractId =
  'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core';
```

### Amounts

```typescript
/** Amount in microSTX (1 STX = 1,000,000 microSTX) */
type MicroSTX = number;

/** Interest rate in basis points (1% = 100 BPS) */
type BasisPoints = number;

/** Block height on the Stacks chain */
type BlockHeight = number;

/** Number of days for loan terms */
type TermDays = number;
```

---

## Data Map Types

These match the on-chain `define-map` structures.

### User Deposit

```typescript
/**
 * Matches: (define-map user-deposits principal uint)
 */
interface UserDeposit {
  /** Depositor address */
  user: StacksAddress;
  /** Deposit amount in microSTX */
  amount: MicroSTX;
}
```

### User Loan

```typescript
/**
 * Matches: (define-map user-loans principal {
 *   amount: uint,
 *   interest-rate: uint,
 *   start-block: uint,
 *   term-end: uint
 * })
 */
interface UserLoan {
  /** Loan principal in microSTX */
  amount: MicroSTX;
  /** Annual interest rate in basis points (max 10000 = 100%) */
  interestRate: BasisPoints;
  /** Block height when loan was created */
  startBlock: BlockHeight;
  /** Block height when term expires */
  termEnd: BlockHeight;
}
```

---

## Response Types

### Transaction Responses

```typescript
/** Successful deposit/withdraw/borrow response */
interface OkBoolResponse {
  type: 'ok';
  value: boolean;
}

/** Successful repay response */
interface RepayResponse {
  type: 'ok';
  value: {
    principal: MicroSTX;
    interest: MicroSTX;
    total: MicroSTX;
  };
}

/** Successful liquidation response */
interface LiquidateResponse {
  type: 'ok';
  value: {
    debt: MicroSTX;
    collateralSeized: MicroSTX;
    liquidatorBonus: MicroSTX;
  };
}

/** Error response from contract */
interface ErrResponse {
  type: 'err';
  value: ErrorCode;
}

/** Any contract response */
type ContractResponse =
  | OkBoolResponse
  | RepayResponse
  | LiquidateResponse
  | ErrResponse;
```

### Read-Only Responses

```typescript
/** get-user-deposit response */
type DepositResponse = MicroSTX; // uint

/** get-user-loan response */
type LoanResponse = UserLoan | null; // (optional {tuple})

/** get-repayment-amount response */
interface RepaymentAmount {
  principal: MicroSTX;
  interest: MicroSTX;
  total: MicroSTX;
}

/** calculate-health-factor response */
type HealthFactor = number; // uint (percentage, e.g. 200 = 200%)

/** is-liquidatable response */
type IsLiquidatable = boolean;

/** get-max-borrow-amount response */
type MaxBorrow = MicroSTX;

/** calculate-required-collateral response */
type RequiredCollateral = MicroSTX;

/** get-user-position-summary response */
interface PositionSummary {
  deposit: MicroSTX;
  loanAmount: MicroSTX;
  interestRate: BasisPoints;
  healthFactor: number;
  isLiquidatable: boolean;
}
```

### Protocol Stats

```typescript
/** get-protocol-stats response */
interface ProtocolStats {
  totalDeposits: MicroSTX;
  totalRepaid: MicroSTX;
  totalLiquidations: MicroSTX;
}

/** get-protocol-metrics response */
interface ProtocolMetrics {
  protocolAge: BlockHeight;
  timeSinceLastActivity: BlockHeight;
}

/** get-volume-metrics response */
interface VolumeMetrics {
  totalDeposits: MicroSTX;
  totalRepaid: MicroSTX;
  totalLiquidations: MicroSTX;
}
```

---

## Error Types

```typescript
/**
 * All contract error codes.
 * Maps to (define-constant ERR-*) in the contract.
 */
enum ErrorCode {
  ERR_INSUFFICIENT_BALANCE = 101,
  ERR_INVALID_AMOUNT = 102,
  ERR_ALREADY_HAS_LOAN = 103,
  ERR_INSUFFICIENT_COLLATERAL = 105,
  ERR_NO_ACTIVE_LOAN = 106,
  ERR_NOT_LIQUIDATABLE = 107,
  ERR_SELF_LIQUIDATION = 108,
  ERR_OWNER_ONLY = 109,
  ERR_INVALID_RATE = 110,
  ERR_INVALID_TERM = 111,
}

/** Human-readable error messages */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.ERR_INSUFFICIENT_BALANCE]: 'Your deposit is too low for this withdrawal',
  [ErrorCode.ERR_INVALID_AMOUNT]: 'Amount must be greater than zero',
  [ErrorCode.ERR_ALREADY_HAS_LOAN]: 'You already have an active loan — repay it first',
  [ErrorCode.ERR_INSUFFICIENT_COLLATERAL]: 'Not enough collateral for this borrow amount',
  [ErrorCode.ERR_NO_ACTIVE_LOAN]: 'No active loan found to repay',
  [ErrorCode.ERR_NOT_LIQUIDATABLE]: 'Position health factor is above liquidation threshold',
  [ErrorCode.ERR_SELF_LIQUIDATION]: 'You cannot liquidate your own position',
  [ErrorCode.ERR_OWNER_ONLY]: 'Only the contract owner can call this function',
  [ErrorCode.ERR_INVALID_RATE]: 'Interest rate exceeds maximum (10000 BPS = 100%)',
  [ErrorCode.ERR_INVALID_TERM]: 'Term must be between 1 and 365 days',
};

/** Type guard for contract errors */
function isContractError(response: ContractResponse): response is ErrResponse {
  return response.type === 'err';
}

/** Get human-readable error message */
function getErrorMessage(code: number): string {
  return ERROR_MESSAGES[code as ErrorCode] || `Unknown error: ${code}`;
}
```

---

## Function Parameter Types

```typescript
/** Parameters for the deposit function */
interface DepositParams {
  amount: MicroSTX; // (uint) — must be > 0
}

/** Parameters for the withdraw function */
interface WithdrawParams {
  amount: MicroSTX; // (uint) — must be <= deposit balance
}

/** Parameters for the borrow function */
interface BorrowParams {
  amount: MicroSTX;       // (uint) — must be > 0, within collateral limits
  interestRate: BasisPoints; // (uint) — 1-10000 (0.01% to 100%)
  termDays: TermDays;       // (uint) — 1-365
}

/** No parameters needed for repay — reads from user's loan */
type RepayParams = Record<string, never>;

/** Parameters for the liquidate function */
interface LiquidateParams {
  borrower: StacksAddress; // (principal) — cannot be tx-sender
}

/** Parameters for the initialize function (owner only) */
type InitializeParams = Record<string, never>;
```

---

## Constants

```typescript
/** Protocol constants matching on-chain values */
const PROTOCOL_CONSTANTS = {
  /** Minimum collateral ratio: 150% */
  MIN_COLLATERAL_RATIO: 150,

  /** Liquidation threshold: 110% health factor */
  LIQUIDATION_THRESHOLD: 110,

  /** Liquidator bonus: 5% of seized collateral */
  LIQUIDATOR_BONUS: 5,

  /** Maximum interest rate: 10000 BPS (100% APR) */
  MAX_INTEREST_RATE: 10000,

  /** Minimum loan term: 1 day */
  MIN_TERM_DAYS: 1,

  /** Maximum loan term: 365 days */
  MAX_TERM_DAYS: 365,

  /** Blocks per year (for interest calculation) */
  BLOCKS_PER_YEAR: 52560,

  /** Blocks per day (10-minute block time) */
  BLOCKS_PER_DAY: 144,

  /** microSTX per STX */
  MICRO_STX_PER_STX: 1_000_000,
} as const;
```

---

## Utility Types

```typescript
/** Vault operation type */
type VaultOperation = 'deposit' | 'withdraw' | 'borrow' | 'repay' | 'liquidate';

/** Health factor zone for UI display */
type HealthZone = 'critical' | 'warning' | 'safe' | 'very-safe';

function getHealthZone(healthFactor: number): HealthZone {
  if (healthFactor <= 110) return 'critical';
  if (healthFactor <= 130) return 'warning';
  if (healthFactor <= 200) return 'safe';
  return 'very-safe';
}

/** Transaction status */
type TransactionStatus = 'pending' | 'confirmed' | 'failed';

/** Formatted position for UI rendering */
interface FormattedPosition {
  depositSTX: string;
  borrowedSTX: string;
  interestRatePercent: string;
  healthFactor: number;
  healthZone: HealthZone;
  daysRemaining: number;
  isLiquidatable: boolean;
}
```

---

## Related Documentation

- [API Examples](API_EXAMPLES.md) — Code examples using these types
- [Integration Guide](INTEGRATION.md) — Framework integration
- [SDK Documentation](SDK.md) — SDK methods and options
- [Error Codes](ERROR_REFERENCE.md) — Detailed error explanations
