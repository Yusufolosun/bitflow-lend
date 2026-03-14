# Vault Core Contract Documentation

## Overview

The `vault-core` contract is a DeFi lending protocol that enables users to deposit STX, borrow against their collateral, repay loans with interest, and participate in liquidations of undercollateralized positions.

## Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MIN-COLLATERAL-RATIO` | 150 | Minimum collateralization ratio (150%) |
| `LIQUIDATION-THRESHOLD` | 110 | Health factor threshold for liquidation eligibility (110%) |

## Error Codes

| Code | Constant | Description |
|------|----------|-------------|
| u101 | `ERR-INSUFFICIENT-BALANCE` | User's deposit balance is insufficient for withdrawal |
| u102 | `ERR-INVALID-AMOUNT` | Amount must be greater than zero |
| u103 | `ERR-ALREADY-HAS-LOAN` | User already has an active loan |
| u104 | `ERR-LOAN-NOT-FOUND` | No loan found for the user |
| u105 | `ERR-INSUFFICIENT-COLLATERAL` | User's deposit is insufficient for the requested loan |
| u106 | `ERR-NO-ACTIVE-LOAN` | User has no active loan to repay |
| u107 | `ERR-NOT-LIQUIDATABLE` | Position is healthy and cannot be liquidated |
| u108 | `ERR-LIQUIDATE-OWN-LOAN` | Users cannot liquidate their own loans |

---

## Public Functions

### deposit

Deposits STX into the vault, adding to the user's collateral balance.

**Signature:**
```clarity
(define-public (deposit (amount uint)))
```

**Parameters:**
- `amount` (uint): The amount of STX to deposit (must be > 0)

**Returns:**
- `(response bool uint)`: Returns `(ok true)` on success

**Errors:**
- `u102` - Amount must be greater than zero

**Gas Estimate:** ~5,000 - 7,000 units

**Usage Example:**
```clarity
;; Deposit 1000 STX
(contract-call? .vault-core deposit u1000)
;; Returns: (ok true)
```

**State Changes:**
- Transfers STX from caller to contract
- Updates `user-deposits` map for the caller
- Increments `total-deposits` counter

---

### withdraw

Withdraws STX from the vault, reducing the user's collateral balance.

**Signature:**
```clarity
(define-public (withdraw (amount uint)))
```

**Parameters:**
- `amount` (uint): The amount of STX to withdraw

**Returns:**
- `(response bool uint)`: Returns `(ok true)` on success

**Errors:**
- `u101` - Insufficient balance (cannot withdraw more than deposited)

**Gas Estimate:** ~6,000 - 8,000 units

**Usage Example:**
```clarity
;; Withdraw 500 STX
(contract-call? .vault-core withdraw u500)
;; Returns: (ok true)
```

**State Changes:**
- Transfers STX from contract to caller
- Updates `user-deposits` map for the caller
- Decrements `total-deposits` counter

**Notes:**
- Cannot withdraw collateral that is backing an active loan

---

### borrow

Borrows STX against deposited collateral with specified interest rate and term.

**Signature:**
```clarity
(define-public (borrow (amount uint) (interest-rate uint) (term-days uint)))
```

**Parameters:**
- `amount` (uint): The amount of STX to borrow
- `interest-rate` (uint): Annual interest rate as a percentage (e.g., 10 = 10%)
- `term-days` (uint): Loan term in days

**Returns:**
- `(response bool uint)`: Returns `(ok true)` on success

**Errors:**
- `u103` - User already has an active loan
- `u105` - Insufficient collateral (requires 150% collateralization)

**Gas Estimate:** ~8,000 - 10,000 units

**Usage Example:**
```clarity
;; Borrow 1000 STX at 10% annual interest for 30 days
;; Requires 1500 STX deposited as collateral (150%)
(contract-call? .vault-core borrow u1000 u10 u30)
;; Returns: (ok true)
```

**State Changes:**
- Creates loan entry in `user-loans` map with:
  - `amount`: Borrowed amount
  - `interest-rate`: Annual interest rate
  - `start-block`: Current block height
  - `term-end`: Block height when term ends (current + term-days * 144)

**Notes:**
- Requires 150% collateralization (MIN-COLLATERAL-RATIO)
- One active loan per user
- Interest calculated using simple interest formula
- 1 day = 144 blocks, 1 year = 52,560 blocks

---

### repay

Repays the caller's active loan with accrued interest.

**Signature:**
```clarity
(define-public (repay))
```

**Parameters:**
None

**Returns:**
- `(response { principal: uint, interest: uint, total: uint } uint)`
- Success returns tuple with:
  - `principal`: Original loan amount
  - `interest`: Accrued interest
  - `total`: Total repayment amount

**Errors:**
- `u106` - No active loan to repay

**Gas Estimate:** ~10,000 - 12,000 units

**Usage Example:**
```clarity
;; Repay active loan
(contract-call? .vault-core repay)
;; Returns: (ok { principal: u1000, interest: u12, total: u1012 })
```

**State Changes:**
- Transfers repayment amount (principal + interest) from caller to contract
- Deletes loan entry from `user-loans` map
- Increments `total-repaid` counter

**Interest Calculation:**
```
interest = (principal × interest-rate × blocks-elapsed) / (100 × 52,560)

Where:
- blocks-elapsed = current block height - start-block
- 52,560 = blocks per year (365 days × 144 blocks/day)
```

**Notes:**
- Can repay at any time, even before term-end
- Interest accrues from start-block to current block
- Uses simple interest calculation

---

### liquidate

Liquidates an undercollateralized loan position, seizing collateral in exchange for repaying the loan.

**Signature:**
```clarity
(define-public (liquidate (borrower principal) (stx-price uint)))
```

**Parameters:**
- `borrower` (principal): Address of the borrower to liquidate
- `stx-price` (uint): Current STX price in cents (e.g., 100 = $1.00)

**Returns:**
- `(response { seized-collateral: uint, paid: uint, bonus: uint } uint)`
- Success returns tuple with:
  - `seized-collateral`: Amount of collateral seized
  - `paid`: Total amount paid by liquidator
  - `bonus`: Liquidation bonus (5% of loan amount)

**Errors:**
- `u106` - Borrower has no active loan
- `u107` - Position is not liquidatable (health factor ≥ 110%)
- `u108` - Cannot liquidate own loan

**Gas Estimate:** ~15,000 - 18,000 units

**Usage Example:**
```clarity
;; Liquidate undercollateralized position
;; If borrower has 1500 STX collateral and 1000 STX loan
;; and STX price drops to $0.70 (u70)
(contract-call? .vault-core liquidate 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM u70)
;; Returns: (ok { seized-collateral: u1500, paid: u1050, bonus: u50 })
```

**State Changes:**
- Transfers payment (loan + 5% bonus) from liquidator to contract
- Transfers borrower's collateral to liquidator
- Deletes borrower's loan entry
- Sets borrower's deposit to 0
- Decrements `total-deposits` by seized collateral amount
- Increments `total-liquidations` counter

**Liquidation Mechanics:**
- Liquidation bonus: 5% of loan amount
- Total payment: loan amount + bonus
- Liquidator receives all collateral
- Position must have health factor < 110%

**Health Factor Calculation:**
```
health-factor = (collateral × stx-price / 100) × 100 / loan-amount

Example:
- Collateral: 1500 STX
- Loan: 1000 STX
- Price: $0.70 (u70)
- Collateral value: 1500 × 70 / 100 = 1050
- Health factor: 1050 × 100 / 1000 = 105%
- Liquidatable: Yes (105% < 110%)
```

---

## Read-Only Functions

### get-user-deposit

Retrieves the STX deposit balance for a user.

**Signature:**
```clarity
(define-read-only (get-user-deposit (user principal)))
```

**Parameters:**
- `user` (principal): The address to query

**Returns:**
- `uint`: Deposit balance (returns 0 if user has no deposits)

**Gas Estimate:** ~1,000 - 2,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-user-deposit 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
;; Returns: u1500
```

---

### get-total-deposits

Retrieves the total STX deposited across all users.

**Signature:**
```clarity
(define-read-only (get-total-deposits))
```

**Parameters:**
None

**Returns:**
- `uint`: Total deposits in the vault

**Gas Estimate:** ~500 - 1,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-total-deposits)
;; Returns: u5000
```

---

### get-user-loan

Retrieves loan details for a user.

**Signature:**
```clarity
(define-read-only (get-user-loan (user principal)))
```

**Parameters:**
- `user` (principal): The address to query

**Returns:**
- `(optional { amount: uint, interest-rate: uint, start-block: uint, term-end: uint })`
- Returns `none` if user has no active loan
- Returns `some` with loan details:
  - `amount`: Loan principal amount
  - `interest-rate`: Annual interest rate (percentage)
  - `start-block`: Block height when loan was created
  - `term-end`: Block height when term ends

**Gas Estimate:** ~1,000 - 2,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-user-loan 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
;; Returns: (some { amount: u1000, interest-rate: u10, start-block: u100, term-end: u4420 })
```

---

### calculate-required-collateral

Calculates the minimum collateral required for a given borrow amount.

**Signature:**
```clarity
(define-read-only (calculate-required-collateral (borrow-amount uint)))
```

**Parameters:**
- `borrow-amount` (uint): The amount to borrow

**Returns:**
- `uint`: Required collateral amount (150% of borrow amount)

**Gas Estimate:** ~500 - 1,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core calculate-required-collateral u1000)
;; Returns: u1500 (150% of 1000)
```

**Formula:**
```
required-collateral = borrow-amount × 150 / 100
```

---

### get-total-repaid

Retrieves the total amount repaid across all loans.

**Signature:**
```clarity
(define-read-only (get-total-repaid))
```

**Parameters:**
None

**Returns:**
- `uint`: Total repayment amount (principal + interest)

**Gas Estimate:** ~500 - 1,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-total-repaid)
;; Returns: u2050
```

---

### get-total-liquidations

Retrieves the total number of liquidations executed.

**Signature:**
```clarity
(define-read-only (get-total-liquidations))
```

**Parameters:**
None

**Returns:**
- `uint`: Number of liquidations

**Gas Estimate:** ~500 - 1,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-total-liquidations)
;; Returns: u3
```

---

### calculate-health-factor

Calculates the health factor for a user's loan position.

**Signature:**
```clarity
(define-read-only (calculate-health-factor (user principal) (stx-price uint)))
```

**Parameters:**
- `user` (principal): The address to check
- `stx-price` (uint): Current STX price in cents (e.g., 100 = $1.00)

**Returns:**
- `(optional uint)`: Health factor as a percentage
- Returns `none` if user has no active loan
- Returns `some` with health factor value

**Gas Estimate:** ~2,000 - 3,000 units

**Usage Example:**
```clarity
;; Check health factor with STX at $1.00
(contract-call? .vault-core calculate-health-factor 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u100)
;; Returns: (some u150) - Position is 150% collateralized
```

**Formula:**
```
collateral-value = (user-deposit × stx-price) / 100
health-factor = (collateral-value × 100) / loan-amount

Example:
- Deposit: 1500 STX
- Loan: 1000 STX
- Price: $1.00 (u100)
- Collateral value: 1500 × 100 / 100 = 1500
- Health factor: 1500 × 100 / 1000 = 150%
```

**Interpretation:**
- 150%+ : Healthy position
- 110-149% : Warning zone
- <110% : Liquidatable

---

### is-liquidatable

Checks if a user's loan position is eligible for liquidation.

**Signature:**
```clarity
(define-read-only (is-liquidatable (user principal) (stx-price uint)))
```

**Parameters:**
- `user` (principal): The address to check
- `stx-price` (uint): Current STX price in cents

**Returns:**
- `bool`: `true` if position is liquidatable, `false` otherwise
- Returns `false` if user has no active loan

**Gas Estimate:** ~2,000 - 3,000 units

**Usage Example:**
```clarity
;; Check if position is liquidatable at $0.70
(contract-call? .vault-core is-liquidatable 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u70)
;; Returns: true (health factor < 110%)
```

**Logic:**
- Returns `true` when health factor < 110%
- Returns `false` when health factor ≥ 110% or no loan exists

---

### get-repayment-amount

Calculates the total repayment amount for a user's active loan.

**Signature:**
```clarity
(define-read-only (get-repayment-amount (user principal)))
```

**Parameters:**
- `user` (principal): The address to query

**Returns:**
- `(optional { principal: uint, interest: uint, total: uint })`
- Returns `none` if user has no active loan
- Returns `some` with:
  - `principal`: Original loan amount
  - `interest`: Accrued interest to current block
  - `total`: Total repayment required (principal + interest)

**Gas Estimate:** ~2,000 - 3,000 units

**Usage Example:**
```clarity
(contract-call? .vault-core get-repayment-amount 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
;; Returns: (some { principal: u1000, interest: u12, total: u1012 })
```

**Notes:**
- Interest calculated based on blocks elapsed since loan creation
- Useful for previewing repayment before calling `repay`
- Interest continues accruing each block

---

## Usage Workflows

### Basic Deposit & Withdraw

```clarity
;; 1. Deposit 2000 STX
(contract-call? .vault-core deposit u2000)

;; 2. Check balance
(contract-call? .vault-core get-user-deposit tx-sender)
;; Returns: u2000

;; 3. Withdraw 500 STX
(contract-call? .vault-core withdraw u500)

;; 4. Check updated balance
(contract-call? .vault-core get-user-deposit tx-sender)
;; Returns: u1500
```

### Borrow & Repay Workflow

```clarity
;; 1. Deposit collateral (1500 STX)
(contract-call? .vault-core deposit u1500)

;; 2. Calculate required collateral for 1000 STX loan
(contract-call? .vault-core calculate-required-collateral u1000)
;; Returns: u1500 ✓ (user has enough)

;; 3. Borrow 1000 STX at 10% for 30 days
(contract-call? .vault-core borrow u1000 u10 u30)

;; 4. Check loan details
(contract-call? .vault-core get-user-loan tx-sender)
;; Returns: (some { amount: u1000, interest-rate: u10, start-block: u100, term-end: u4420 })

;; 5. Preview repayment amount (after some time)
(contract-call? .vault-core get-repayment-amount tx-sender)
;; Returns: (some { principal: u1000, interest: u15, total: u1015 })

;; 6. Repay loan
(contract-call? .vault-core repay)
;; Returns: (ok { principal: u1000, interest: u15, total: u1015 })
```

### Liquidation Workflow

```clarity
;; Scenario: Borrower's position becomes undercollateralized

;; 1. Check borrower's health factor
(contract-call? .vault-core calculate-health-factor 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u70)
;; Returns: (some u105) - Below 110% threshold

;; 2. Verify position is liquidatable
(contract-call? .vault-core is-liquidatable 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u70)
;; Returns: true

;; 3. Execute liquidation
(contract-call? .vault-core liquidate 
  'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM 
  u70)
;; Returns: (ok { seized-collateral: u1500, paid: u1050, bonus: u50 })
;; Liquidator pays 1050 STX (1000 loan + 50 bonus)
;; Liquidator receives 1500 STX collateral
;; Net profit: 450 STX
```

---

## Interest Calculation Details

The contract uses simple interest with the following formula:

```
interest = (principal × rate × blocks-elapsed) / (100 × 52,560)
```

### Time Conversions

- 1 day = 144 blocks
- 1 month (30 days) = 4,320 blocks
- 1 year (365 days) = 52,560 blocks

### Example Calculations

**Example 1: 30-day loan**
- Principal: 1000 STX
- Rate: 10% annual
- Blocks elapsed: 4,320 (30 days)

```
interest = (1000 × 10 × 4,320) / (100 × 52,560)
interest = 43,200,000 / 5,256,000
interest = 8.22 ≈ 8 STX (integer division)
```

**Example 2: 90-day loan**
- Principal: 2000 STX
- Rate: 12% annual
- Blocks elapsed: 12,960 (90 days)

```
interest = (2000 × 12 × 12,960) / (100 × 52,560)
interest = 311,040,000 / 5,256,000
interest = 59.18 ≈ 59 STX
```

---

## Security Considerations

### Collateralization
- All loans require 150% collateralization minimum
- Users cannot withdraw collateral backing active loans
- Positions become liquidatable below 110% health factor

### Liquidation Protection
- Users cannot liquidate their own positions
- Liquidators must pay loan amount + 5% bonus
- Only unhealthy positions (< 110%) can be liquidated

### Access Control
- Users can only manage their own deposits and loans
- Anyone can liquidate unhealthy positions (permissionless)
- No admin functions or privileged roles

### Reentrancy
- All state changes occur after external calls complete
- STX transfers use `try!` for atomic operations
- Map deletions occur after successful transfers

---

## Gas Optimization Tips

1. **Batch Operations**: Combine deposits before borrowing to save gas
2. **Read-Only Queries**: Use read-only functions for previews (free)
3. **Timing**: Repay loans promptly to minimize interest accrual
4. **Liquidations**: Monitor positions off-chain, execute on-chain only when profitable

---

## Testing

All contract functions are comprehensively tested. See [vault-core.test.ts](../tests/vault-core.test.ts) for:
- 18 test cases covering all functions
- Edge case validation
- Error condition testing
- Multi-user scenarios
- Interest calculation verification
- Liquidation mechanics validation

Run tests with:
```bash
npm test
```

---

## Gas Costs

Estimated transaction costs for each contract function on mainnet.

| Function | Estimated Cost | Notes |
|----------|---------------|-------|
| `deposit` | ~0.01 STX | STX transfer + map write |
| `withdraw` | ~0.01 STX | Balance check + STX transfer + map update |
| `borrow` | ~0.015 STX | Collateral check + STX transfer + map write |
| `repay` | ~0.02 STX | Interest calc + STX transfer + map delete |
| `liquidate` | ~0.025 STX | Health factor calc + three STX transfers + cleanup |
| `initialize` | ~0.005 STX | Single variable write (one-time only) |

### Cost Factors

- **Map reads**: `map-get?` costs ~0.001 STX per look-up
- **Map writes**: `map-set` or `map-delete` costs ~0.002 STX per operation
- **STX transfers**: `stx-transfer?` costs ~0.003 STX per transfer
- **Arithmetic**: Negligible (sub-0.001 STX for all calculations)
- **Read-only calls**: Free — no gas cost

> **Note**: Actual gas costs vary with network congestion. These are estimates based on typical mainnet conditions. The Stacks network uses a fee market, so costs increase during periods of high demand.

---

## Common Patterns

### Deposit → Borrow Flow

The most common usage: deposit collateral, then borrow against it.

```clarity
;; Step 1: Deposit 15 STX as collateral
(contract-call? .bitflow-vault-core deposit u15000000)

;; Step 2: Borrow up to 66.67% of deposit
(contract-call? .bitflow-vault-core borrow u10000000 u500 u30)
```

**Important**: Both calls must come from the same `tx-sender`. You cannot deposit from one wallet and borrow from another.

### Check Before Borrow

Always check available collateral before borrowing:

```clarity
;; Read-only: check max borrow amount
(contract-call? .bitflow-vault-core get-max-borrow-amount tx-sender)

;; Read-only: check required collateral for a desired borrow
(contract-call? .bitflow-vault-core calculate-required-collateral u5000000)
```

### Monitor → Repay Flow

Check loan status before repaying:

```clarity
;; Read-only: check current repayment obligation
(contract-call? .bitflow-vault-core get-repayment-amount tx-sender)

;; If satisfied, repay (no args — reads loan from map)
(contract-call? .bitflow-vault-core repay)
```

### Liquidation Pattern

Liquidators scan for undercollateralized positions:

```clarity
;; Read-only: check if a borrower is liquidatable
(contract-call? .bitflow-vault-core is-liquidatable 'SP_BORROWER)

;; If true, execute liquidation
(contract-call? .bitflow-vault-core liquidate 'SP_BORROWER)
```

**Liquidator economics**: You pay the borrower's debt and receive their collateral + 5% bonus.

### Incremental Deposits

Users can deposit multiple times. Deposits are additive:

```clarity
(contract-call? .bitflow-vault-core deposit u5000000)  ;; Balance: 5 STX
(contract-call? .bitflow-vault-core deposit u5000000)  ;; Balance: 10 STX
(contract-call? .bitflow-vault-core deposit u5000000)  ;; Balance: 15 STX
```

---

## Version History

- **v1.0.0** - Initial release with deposit, withdraw, borrow, repay, and liquidation functionality
- **v2.0.0** - Enhanced vault with precision interest, penalties, migration support, and admin controls

---

## Staking Pool Contract (`bitflow-staking-pool`)

### Overview

STX staking pool with checkpoint-based reward distribution. Users stake STX to earn protocol rewards proportional to their share of the pool.

### Key Features

- **Checkpoint accounting**: Rewards accrue per-block without iterating over all stakers
- **Cooldown period**: ~1 day unstaking cooldown (144 blocks) prevents flash-stake attacks
- **Emergency unstake**: When pool is paused, users can withdraw immediately (forfeiting rewards)
- **Estimated APY**: On-chain `get-estimated-apy-bps` function for frontend display

### Error Codes (u201–u210)

| Code | Constant | Description |
|------|----------|-------------|
| u201 | `ERR-INSUFFICIENT-BALANCE` | Unstake amount exceeds staked balance |
| u202 | `ERR-INVALID-AMOUNT` | Below minimum stake (1 STX) |
| u203 | `ERR-NO-STAKE` | No staked balance found |
| u204 | `ERR-COOLDOWN-ACTIVE` | Cooldown period not yet expired |
| u205 | `ERR-NO-REWARDS` | No pending rewards to claim |
| u206 | `ERR-OWNER-ONLY` | Admin-only function |
| u207 | `ERR-PROTOCOL-PAUSED` | Pool is paused or not initialized |
| u208 | `ERR-ZERO-AMOUNT` | Amount must be > 0 |
| u209 | `ERR-MAX-STAKE-EXCEEDED` | Exceeds 5M STX per-user cap |
| u210 | `ERR-INVALID-PARAM` | Parameter out of valid range |

### Public Functions

| Function | Description |
|----------|-------------|
| `stake (amount)` | Stake STX into the pool |
| `request-unstake` | Start cooldown timer for unstaking |
| `unstake (amount)` | Withdraw STX after cooldown expires |
| `claim-rewards` | Claim accumulated staking rewards |
| `emergency-unstake` | Withdraw all stake when pool is paused (no cooldown) |

### Admin Functions

| Function | Description |
|----------|-------------|
| `initialize-pool` | One-time pool initialization |
| `set-reward-rate (rate)` | Set rewards per block (max 100 STX/block) |
| `fund-rewards (amount)` | Transfer STX into reward pool |
| `pause-pool` / `unpause-pool` | Emergency pause toggle |

### Read-Only Functions

| Function | Returns |
|----------|---------|
| `get-staker-balance (staker)` | Staked balance |
| `get-total-staked` | Total pool TVL |
| `get-pending-rewards (staker)` | Unclaimed reward amount |
| `get-staker-share (staker)` | Pool share in basis points |
| `get-estimated-apy-bps` | Estimated annual yield in bps |
| `get-pool-stats` | Full pool statistics tuple |
| `get-staker-info (staker)` | Complete staker details |

---

## Oracle Registry Contract (`bitflow-oracle-registry`)

### Overview

Multi-source price oracle for STX/USD feeds. Aggregates price submissions from whitelisted reporters with deviation and staleness thresholds.

### Key Features

- **Whitelisted reporters**: Up to 10 authorized price feed sources
- **Deviation guard**: Rejects prices that deviate too far from current aggregate (default 20%)
- **Staleness detection**: Prices expire after ~2 days (288 blocks)
- **Admin override**: Emergency price setting for bootstrapping or reporter failure
- **Submission tracking**: Per-reporter submission counts and rejection metrics

### Error Codes (u301–u311)

| Code | Constant | Description |
|------|----------|-------------|
| u301 | `ERR-OWNER-ONLY` | Admin-only function |
| u302 | `ERR-NOT-REPORTER` | Caller is not a whitelisted reporter |
| u303 | `ERR-INVALID-PRICE` | Price is 0 or exceeds sanity bound |
| u304 | `ERR-STALE-PRICE` | Aggregated price is too old |
| u305 | `ERR-DEVIATION-TOO-HIGH` | Price deviates too far from aggregate |
| u306 | `ERR-ALREADY-REPORTER` | Reporter already registered |
| u307 | `ERR-REPORTER-NOT-FOUND` | Reporter not in whitelist |
| u308 | `ERR-MIN-REPORTERS` | Cannot remove below minimum reporter count |
| u309 | `ERR-PAUSED` | Oracle is paused |
| u310 | `ERR-INVALID-PARAM` | Parameter out of valid range |
| u311 | `ERR-NO-PRICES` | No price data available |

### Reporter Functions

| Function | Description |
|----------|-------------|
| `submit-price (price)` | Submit a price observation (reporters only) |

### Admin Functions

| Function | Description |
|----------|-------------|
| `initialize-oracle` | One-time oracle initialization |
| `add-reporter (reporter)` | Whitelist a new price reporter |
| `remove-reporter (reporter)` | Remove a reporter from whitelist |
| `set-min-reporters (n)` | Set minimum required reporters (1–10) |
| `set-max-deviation (bps)` | Set max deviation threshold (0–5000 bps) |
| `set-max-price-age (blocks)` | Set staleness threshold (72–2016 blocks) |
| `admin-set-price (price)` | Emergency admin price override |
| `pause-oracle` / `unpause-oracle` | Emergency pause toggle |

### Read-Only Functions

| Function | Returns |
|----------|---------|
| `get-aggregated-price` | Price, block, and freshness tuple |
| `get-price` | Current aggregated price |
| `get-price-age` | Blocks since last price update |
| `get-is-price-fresh` | Boolean freshness check |
| `get-reporter-price (reporter)` | Individual reporter's last submission |
| `is-active-reporter (addr)` | Whether an address is a reporter |
| `get-oracle-params` | Configuration parameters tuple |
| `get-oracle-stats` | Aggregate statistics tuple |

