# Bitflow Vault Read-Only API Reference

This document provides detailed API documentation for all read-only functions in the `bitflow-vault-core` contract. Read-only functions can be called without consuming gas and do not modify contract state.

## Table of Contents

- [User Data Queries](#user-data-queries)
  - [get-user-deposit](#get-user-deposit)
  - [get-user-loan](#get-user-loan)
  - [get-repayment-amount](#get-repayment-amount)
- [Risk & Liquidation Queries](#risk--liquidation-queries)
  - [calculate-health-factor](#calculate-health-factor)
  - [is-liquidatable](#is-liquidatable)
- [Utility Functions](#utility-functions)
  - [calculate-required-collateral](#calculate-required-collateral)
- [Global Statistics](#global-statistics)
  - [get-total-deposits](#get-total-deposits)
  - [get-total-repaid](#get-total-repaid)
  - [get-total-liquidations](#get-total-liquidations)

---

## User Data Queries

### get-user-deposit

Retrieves the current STX deposit balance for a specific user.

**Function Signature:**
```clarity
(define-read-only (get-user-deposit (user principal)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | principal | The wallet address to query |

**Return Type:** `uint`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-user-deposit 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

**Example Responses:**

```clarity
;; User with deposits
u1500

;; User with no deposits
u0
```

**Use Cases:**
- Check available collateral before borrowing
- Display user's vault balance in UI
- Verify deposit transactions were successful
- Calculate maximum borrowing capacity

**Integration Example:**
```typescript
// Using @stacks/transactions
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-user-deposit',
  functionArgs: [principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

console.log(cvToValue(result)); // 1500
```

---

### get-user-loan

Retrieves detailed information about a user's active loan.

**Function Signature:**
```clarity
(define-read-only (get-user-loan (user principal)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | principal | The wallet address to query |

**Return Type:** `(optional { amount: uint, interest-rate: uint, start-block: uint, term-end: uint })`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-user-loan 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

**Example Responses:**

```clarity
;; User with active loan
(some {
  amount: u1000,
  interest-rate: u10,
  start-block: u1000,
  term-end: u5320
})

;; User with no active loan
none
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `amount` | uint | Principal loan amount in STX |
| `interest-rate` | uint | Annual interest rate (percentage) |
| `start-block` | uint | Block height when loan was created |
| `term-end` | uint | Block height when loan term ends |

**Use Cases:**
- Display loan details in user dashboard
- Check if user has an active loan before allowing new borrow
- Calculate time remaining on loan term
- Monitor loan status across multiple users

**Calculating Time Remaining:**
```clarity
;; Get loan details
(match (contract-call? .bitflow-vault-core get-user-loan tx-sender)
  loan
    (let (
      (current-block block-height)
      (term-end (get term-end loan))
      (blocks-remaining (- term-end current-block))
      (days-remaining (/ blocks-remaining u144))
    )
      days-remaining
    )
  u0
)
```

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-user-loan',
  functionArgs: [principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const loanData = cvToValue(result);
if (loanData !== null) {
  console.log('Loan amount:', loanData.amount);
  console.log('Interest rate:', loanData['interest-rate'], '%');
  console.log('Start block:', loanData['start-block']);
  console.log('Term end:', loanData['term-end']);
}
```

---

### get-repayment-amount

Calculates the total amount required to repay a user's active loan, including accrued interest.

**Function Signature:**
```clarity
(define-read-only (get-repayment-amount (user principal)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | principal | The wallet address to query |

**Return Type:** `(optional { principal: uint, interest: uint, total: uint })`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-repayment-amount 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```

**Example Responses:**

```clarity
;; User with active loan (after 30 days)
(some {
  principal: u1000,
  interest: u8,
  total: u1008
})

;; User with active loan (just borrowed)
(some {
  principal: u1000,
  interest: u0,
  total: u1000
})

;; User with no active loan
none
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `principal` | uint | Original loan amount |
| `interest` | uint | Accrued interest to current block |
| `total` | uint | Total repayment required (principal + interest) |

**Interest Calculation:**
```clarity
interest = (principal × interest-rate × blocks-elapsed) / (100 × 52,560)

Where:
- blocks-elapsed = current-block - start-block
- 52,560 = blocks per year (365 × 144)
```

**Example Scenarios:**

```clarity
;; Scenario 1: 1000 STX at 10% for 1 day (144 blocks)
;; interest = (1000 × 10 × 144) / (100 × 52,560)
;; interest = 1,440,000 / 5,256,000 = 0.27 ≈ 0 STX
(some { principal: u1000, interest: u0, total: u1000 })

;; Scenario 2: 1000 STX at 10% for 30 days (4,320 blocks)
;; interest = (1000 × 10 × 4,320) / (100 × 52,560)
;; interest = 43,200,000 / 5,256,000 = 8.22 ≈ 8 STX
(some { principal: u1000, interest: u8, total: u1008 })

;; Scenario 3: 2000 STX at 12% for 90 days (12,960 blocks)
;; interest = (2000 × 12 × 12,960) / (100 × 52,560)
;; interest = 311,040,000 / 5,256,000 = 59.18 ≈ 59 STX
(some { principal: u2000, interest: u59, total: u2059 })

;; Scenario 4: 5000 STX at 8% for 365 days (52,560 blocks)
;; interest = (5000 × 8 × 52,560) / (100 × 52,560)
;; interest = 2,102,400,000 / 5,256,000 = 400 STX
(some { principal: u5000, interest: u400, total: u5400 })
```

**Use Cases:**
- Preview repayment amount before executing repayment
- Display real-time interest accrual in UI
- Calculate profitability of early repayment
- Monitor debt across portfolio

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-repayment-amount',
  functionArgs: [principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM')],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const repayment = cvToValue(result);
if (repayment !== null) {
  console.log('Principal:', repayment.principal, 'STX');
  console.log('Interest:', repayment.interest, 'STX');
  console.log('Total to repay:', repayment.total, 'STX');
}
```

---

## Risk & Liquidation Queries

### calculate-health-factor

Calculates the health factor for a user's loan position based on current STX price.

**Function Signature:**
```clarity
(define-read-only (calculate-health-factor (user principal) (stx-price uint)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | principal | The wallet address to query |
| `stx-price` | uint | Current STX price in cents (e.g., 100 = $1.00) |

**Return Type:** `(optional uint)`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core calculate-health-factor 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u100)
```

**Example Responses:**

```clarity
;; Healthy position (1500 collateral, 1000 loan, $1.00 price)
(some u150)

;; Warning zone (1500 collateral, 1000 loan, $0.75 price)
(some u112)

;; Liquidatable position (1500 collateral, 1000 loan, $0.70 price)
(some u105)

;; User with no loan
none
```

**Health Factor Calculation:**
```clarity
collateral-value = (deposit × stx-price) / 100
health-factor = (collateral-value × 100) / loan-amount

Example:
- Deposit: 1500 STX
- Loan: 1000 STX
- Price: $1.00 (u100)
- Collateral value: (1500 × 100) / 100 = 1500
- Health factor: (1500 × 100) / 1000 = 150%
```

**Health Factor Interpretation:**

| Health Factor | Status | Description |
|--------------|--------|-------------|
| ≥ 150% | Healthy | Meets minimum collateralization |
| 110-149% | Warning | Below minimum but not liquidatable |
| < 110% | Danger | Eligible for liquidation |
| No loan | N/A | Returns `none` |

**Example Scenarios:**

```clarity
;; Scenario 1: Strong position
;; Collateral: 2000 STX, Loan: 1000 STX, Price: $1.00
;; Health: (2000 × 100 / 100) × 100 / 1000 = 200%
(some u200)

;; Scenario 2: Minimum safe position
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $1.00
;; Health: (1500 × 100 / 100) × 100 / 1000 = 150%
(some u150)

;; Scenario 3: Price decline - warning
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.80
;; Health: (1500 × 80 / 100) × 100 / 1000 = 120%
(some u120)

;; Scenario 4: Price decline - liquidatable
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.70
;; Health: (1500 × 70 / 100) × 100 / 1000 = 105%
(some u105)

;; Scenario 5: Severe price decline
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.50
;; Health: (1500 × 50 / 100) × 100 / 1000 = 75%
(some u75)
```

**Use Cases:**
- Real-time risk monitoring in dashboards
- Alert users when health factor drops below thresholds
- Identify liquidation opportunities
- Portfolio risk analysis
- Margin call warnings

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'calculate-health-factor',
  functionArgs: [
    principalCV('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'),
    uintCV(100) // $1.00
  ],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const healthFactor = cvToValue(result);
if (healthFactor !== null) {
  console.log('Health Factor:', healthFactor, '%');
  
  if (healthFactor >= 150) {
    console.log('Status: Healthy');
  } else if (healthFactor >= 110) {
    console.log('Status: Warning - Consider adding collateral');
  } else {
    console.log('Status: DANGER - Liquidation risk!');
  }
}
```

---

### is-liquidatable

Determines whether a user's loan position is eligible for liquidation.

**Function Signature:**
```clarity
(define-read-only (is-liquidatable (user principal) (stx-price uint)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `user` | principal | The wallet address to check |
| `stx-price` | uint | Current STX price in cents |

**Return Type:** `bool`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core is-liquidatable 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u70)
```

**Example Responses:**

```clarity
;; Position is liquidatable (health factor < 110%)
true

;; Position is healthy (health factor ≥ 110%)
false

;; User has no loan
false
```

**Liquidation Logic:**
```clarity
is-liquidatable = health-factor < 110%

Where:
- Returns true if health factor exists and is below 110%
- Returns false if health factor ≥ 110% or user has no loan
```

**Example Scenarios:**

```clarity
;; Scenario 1: Healthy position
;; Collateral: 2000 STX, Loan: 1000 STX, Price: $1.00
;; Health: 200% → Not liquidatable
false

;; Scenario 2: Borderline healthy
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.75
;; Health: 112.5% → Not liquidatable (just above threshold)
false

;; Scenario 3: Just liquidatable
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.73
;; Health: 109.5% → Liquidatable
true

;; Scenario 4: Severely undercollateralized
;; Collateral: 1500 STX, Loan: 1000 STX, Price: $0.50
;; Health: 75% → Liquidatable
true

;; Scenario 5: No active loan
;; User has deposits but no loan
false
```

**Price Threshold Calculation:**

For a given collateral and loan amount, calculate the price where liquidation becomes possible:

```clarity
liquidation-price = (loan-amount × 110 × 100) / (collateral × 100)

Example:
- Collateral: 1500 STX
- Loan: 1000 STX
- Liquidation price = (1000 × 110 × 100) / (1500 × 100)
- Liquidation price = 11,000,000 / 150,000 = 73.33 cents
- STX must drop below $0.733 for liquidation
```

**Use Cases:**
- Liquidation bot monitoring
- User risk alerts
- Position health dashboards
- Automated liquidation triggers
- Market opportunity scanning

**Integration Example:**
```typescript
// Monitor for liquidation opportunities
async function checkLiquidatable(userAddress: string, stxPrice: number) {
  const result = await callReadOnlyFunction({
    contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    contractName: 'bitflow-vault-core',
    functionName: 'is-liquidatable',
    functionArgs: [
      principalCV(userAddress),
      uintCV(stxPrice)
    ],
    network: new StacksMainnet(),
    senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  });

  return cvToValue(result) === true;
}

// Scan multiple positions
const positions = [
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
  // ... more addresses
];

const currentPrice = 70; // $0.70

for (const address of positions) {
  const liquidatable = await checkLiquidatable(address, currentPrice);
  if (liquidatable) {
    console.log(`Liquidation opportunity: ${address}`);
  }
}
```

---

## Utility Functions

### calculate-required-collateral

Calculates the minimum collateral required to borrow a specific amount.

**Function Signature:**
```clarity
(define-read-only (calculate-required-collateral (borrow-amount uint)))
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `borrow-amount` | uint | The amount of STX to borrow |

**Return Type:** `uint`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core calculate-required-collateral u1000)
```

**Example Responses:**

```clarity
;; Borrow 1000 STX
u1500  ;; Requires 1500 STX collateral (150%)

;; Borrow 500 STX
u750   ;; Requires 750 STX collateral (150%)

;; Borrow 2000 STX
u3000  ;; Requires 3000 STX collateral (150%)

;; Borrow 100 STX
u150   ;; Requires 150 STX collateral (150%)
```

**Calculation Formula:**
```clarity
required-collateral = (borrow-amount × 150) / 100
```

**Example Calculations:**

| Borrow Amount | Required Collateral | Calculation |
|---------------|---------------------|-------------|
| 100 STX | 150 STX | 100 × 150 / 100 |
| 500 STX | 750 STX | 500 × 150 / 100 |
| 1,000 STX | 1,500 STX | 1000 × 150 / 100 |
| 2,000 STX | 3,000 STX | 2000 × 150 / 100 |
| 5,000 STX | 7,500 STX | 5000 × 150 / 100 |
| 10,000 STX | 15,000 STX | 10000 × 150 / 100 |

**Reverse Calculation (Max Borrow from Collateral):**
```clarity
max-borrow = (collateral × 100) / 150

Example:
- Collateral: 1500 STX
- Max borrow: (1500 × 100) / 150 = 1000 STX
```

**Use Cases:**
- Validate user has enough collateral before borrow attempt
- Display maximum borrowing capacity in UI
- Calculate required deposits for desired loan
- Pre-transaction validation

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'calculate-required-collateral',
  functionArgs: [uintCV(1000)],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const required = cvToValue(result);
console.log(`To borrow 1000 STX, you need ${required} STX collateral`);

// Calculate max borrow from current deposits
async function calculateMaxBorrow(userAddress: string) {
  const depositResult = await callReadOnlyFunction({
    contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    contractName: 'bitflow-vault-core',
    functionName: 'get-user-deposit',
    functionArgs: [principalCV(userAddress)],
    network: new StacksMainnet(),
    senderAddress: userAddress,
  });

  const deposit = cvToValue(depositResult);
  const maxBorrow = Math.floor((deposit * 100) / 150);
  
  console.log(`Current deposit: ${deposit} STX`);
  console.log(`Maximum borrow: ${maxBorrow} STX`);
  
  return maxBorrow;
}
```

---

## Global Statistics

### get-total-deposits

Retrieves the total STX deposited across all users in the vault.

**Function Signature:**
```clarity
(define-read-only (get-total-deposits))
```

**Parameters:** None

**Return Type:** `uint`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-total-deposits)
```

**Example Responses:**

```clarity
;; Multiple users with deposits
u10000

;; Empty vault
u0
```

**Use Cases:**
- Display vault TVL (Total Value Locked)
- Monitor vault growth over time
- Calculate vault utilization rates
- Dashboard metrics

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-total-deposits',
  functionArgs: [],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const tvl = cvToValue(result);
console.log(`Total Value Locked: ${tvl} STX ($${tvl * stxPrice})`);
```

---

### get-total-repaid

Retrieves the cumulative amount repaid across all loans (principal + interest).

**Function Signature:**
```clarity
(define-read-only (get-total-repaid))
```

**Parameters:** None

**Return Type:** `uint`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-total-repaid)
```

**Example Responses:**

```clarity
;; After multiple loan repayments
u5250

;; No repayments yet
u0
```

**Use Cases:**
- Track protocol revenue (total interest earned)
- Calculate total interest: `total-repaid - total-borrowed`
- Historical performance metrics
- Protocol analytics

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-total-repaid',
  functionArgs: [],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const totalRepaid = cvToValue(result);
console.log(`Total repaid: ${totalRepaid} STX`);
```

---

### get-total-liquidations

Retrieves the total number of liquidation events executed.

**Function Signature:**
```clarity
(define-read-only (get-total-liquidations))
```

**Parameters:** None

**Return Type:** `uint`

**Example Request:**
```clarity
(contract-call? .bitflow-vault-core get-total-liquidations)
```

**Example Responses:**

```clarity
;; After 5 liquidations
u5

;; No liquidations yet
u0
```

**Use Cases:**
- Track protocol liquidation frequency
- Risk analysis and monitoring
- Historical liquidation events
- Protocol health metrics

**Integration Example:**
```typescript
const result = await callReadOnlyFunction({
  contractAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  contractName: 'bitflow-vault-core',
  functionName: 'get-total-liquidations',
  functionArgs: [],
  network: new StacksMainnet(),
  senderAddress: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

const liquidations = cvToValue(result);
console.log(`Total liquidations: ${liquidations}`);
```

---

## Complete Integration Example

Here's a comprehensive example showing how to build a user dashboard:

```typescript
import { 
  callReadOnlyFunction, 
  principalCV, 
  uintCV,
  cvToValue 
} from '@stacks/transactions';
import { StacksMainnet } from '@stacks/network';

interface UserPosition {
  deposit: number;
  loan: {
    amount: number;
    interestRate: number;
    startBlock: number;
    termEnd: number;
  } | null;
  repaymentAmount: {
    principal: number;
    interest: number;
    total: number;
  } | null;
  healthFactor: number | null;
  isLiquidatable: boolean;
  maxBorrow: number;
}

async function getUserPosition(
  userAddress: string, 
  stxPrice: number
): Promise<UserPosition> {
  const contractAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  const contractName = 'vault-core';
  const network = new StacksMainnet();

  // Fetch deposit
  const depositResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-user-deposit',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });
  const deposit = cvToValue(depositResult);

  // Fetch loan
  const loanResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-user-loan',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });
  const loan = cvToValue(loanResult);

  // Fetch repayment amount
  const repaymentResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-repayment-amount',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });
  const repaymentAmount = cvToValue(repaymentResult);

  // Fetch health factor
  const healthResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'calculate-health-factor',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    network,
    senderAddress: userAddress,
  });
  const healthFactor = cvToValue(healthResult);

  // Check if liquidatable
  const liquidatableResult = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'is-liquidatable',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    network,
    senderAddress: userAddress,
  });
  const isLiquidatable = cvToValue(liquidatableResult);

  // Calculate max borrow
  const maxBorrow = Math.floor((deposit * 100) / 150);

  return {
    deposit,
    loan: loan ? {
      amount: loan.amount,
      interestRate: loan['interest-rate'],
      startBlock: loan['start-block'],
      termEnd: loan['term-end'],
    } : null,
    repaymentAmount: repaymentAmount ? {
      principal: repaymentAmount.principal,
      interest: repaymentAmount.interest,
      total: repaymentAmount.total,
    } : null,
    healthFactor,
    isLiquidatable,
    maxBorrow,
  };
}

// Usage
const position = await getUserPosition(
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  100 // $1.00 STX price
);

console.log('User Position:', position);
```

---

## Response Codes Reference

| Function | Success Type | Empty/None Case |
|----------|-------------|-----------------|
| get-user-deposit | uint | u0 |
| get-user-loan | some {...} | none |
| get-repayment-amount | some {...} | none |
| calculate-health-factor | some uint | none |
| is-liquidatable | bool | false |
| calculate-required-collateral | uint | N/A (always returns) |
| get-total-deposits | uint | u0 |
| get-total-repaid | uint | u0 |
| get-total-liquidations | uint | u0 |

---

## Rate Limiting & Performance

All read-only functions:
- **Cost:** Free (no gas fees)
- **Rate Limits:** No hard limits, but API providers may impose restrictions
- **Caching:** Results can be cached but may become stale
- **Real-time:** Query on-demand for most current data

**Best Practices:**
- Cache global statistics (total-deposits, total-repaid, total-liquidations)
- Refresh user-specific data on each page load
- Poll health factors frequently for active positions
- Use websockets or event listeners for real-time updates

---

## Error Handling

Read-only functions don't throw errors but may return `none` or `false`:

```typescript
// Handle optional responses
const loan = await getLoan(userAddress);
if (loan === null) {
  console.log('User has no active loan');
} else {
  console.log('Loan amount:', loan.amount);
}

// Handle boolean responses
const liquidatable = await isLiquidatable(userAddress, price);
if (liquidatable) {
  console.log('Position can be liquidated!');
} else {
  console.log('Position is healthy or no loan exists');
}
```

---

## Additional Resources

- [Contract Functions Documentation](./CONTRACTS.md) - Full contract reference
- [Test Suite](../tests/bitflow-vault-core.test.ts) - Example usage in tests
- [Stacks Documentation](https://docs.stacks.co/) - Stacks blockchain docs
- [@stacks/transactions](https://github.com/hirosystems/stacks.js/tree/main/packages/transactions) - Transaction library

---

## Related Documentation

- [API Examples](API_EXAMPLES.md) — Code examples for every function
- [SDK Documentation](SDK.md) — Client library usage
- [TypeScript Types](TYPESCRIPT_TYPES.md) — Type definitions
- [Error Reference](ERROR_REFERENCE.md) — Error codes explained
