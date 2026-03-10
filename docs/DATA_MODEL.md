# Data Model Reference

> **Complete reference for all on-chain data structures in the BitFlow Lend protocol.**

Contract: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

---

## Data Maps

### user-deposits

Stores collateral balances for each user.

```clarity
(define-map user-deposits principal uint)
```

| Field | Type | Description |
|-------|------|-------------|
| **key** | `principal` | User's Stacks address |
| **value** | `uint` | Deposit balance in microSTX |

**Behavior**:
- Created on first `deposit()` call
- Updated (incremented) on subsequent deposits
- Updated (decremented) on `withdraw()`
- Deleted on `liquidate()` (borrower's deposit is seized)
- Multiple deposits are additive

**Example entries**:

| Key | Value | Meaning |
|-----|-------|---------|
| `SP_ALICE` | `15000000` | Alice has 15 STX deposited |
| `SP_BOB` | `0` | Bob withdrew everything |
| `SP_CAROL` | `25000000` | Carol has 25 STX deposited |

---

### user-loans

Stores active loan data for each user. One loan per user.

```clarity
(define-map user-loans principal {
  amount: uint,
  interest-rate: uint,
  start-block: uint,
  term-end: uint
})
```

| Field | Type | Range | Description |
|-------|------|-------|-------------|
| **key** | `principal` | — | Borrower's Stacks address |
| **amount** | `uint` | > 0 | Loan principal in microSTX |
| **interest-rate** | `uint` | 1–10000 | Annual rate in basis points |
| **start-block** | `uint` | — | Block height when loan was created |
| **term-end** | `uint` | — | Block height when term expires |

**Behavior**:
- Created on `borrow()` — one entry per user (error u103 if exists)
- Read during `repay()` to calculate interest
- Read during `liquidate()` to calculate debt
- Deleted on `repay()` or `liquidate()`
- Interest is NOT stored — it's calculated at read-time from `start-block`

**Example entries**:

| Key | amount | interest-rate | start-block | term-end |
|-----|--------|--------------|-------------|----------|
| `SP_ALICE` | `5000000` | `500` | `150000` | `154320` |
| `SP_BOB` | `10000000` | `1000` | `148000` | `200560` |

**Term calculation**: `term-end = start-block + (termDays × 144)`

**Interest calculation**: `interest = amount × interest-rate × (current-block - start-block) / (100 × 52560)`

---

## Data Variables

### contract-owner

```clarity
(define-data-var contract-owner principal tx-sender)
```

The deployer's address. Used in `initialize()` for authorization (error u109 if not owner). Set once at deployment, never changed.

### initialized

```clarity
(define-data-var initialized bool false)
```

Tracks whether `initialize()` has been called. Prevents re-initialization. Set to `true` after first successful `initialize()` call.

### total-deposits

```clarity
(define-data-var total-deposits uint u0)
```

Running total of all STX ever deposited (cumulative, not net). Incremented on every `deposit()` call by the deposit amount.

### total-repaid

```clarity
(define-data-var total-repaid uint u0)
```

Running total of all STX repaid (principal + interest). Incremented on every `repay()` call by the total repayment amount.

### total-liquidations

```clarity
(define-data-var total-liquidations uint u0)
```

Running total of all STX seized in liquidations. Incremented on every `liquidate()` call by the seized collateral amount.

### last-activity-block

```clarity
(define-data-var last-activity-block uint u0)
```

Block height of the most recent deposit, borrow, repay, or liquidation. Updated on every public function call (except `initialize()`).

---

## Constants

```clarity
(define-constant MIN-COLLATERAL-RATIO u150)    ;; 150%
(define-constant LIQUIDATION-THRESHOLD u110)    ;; 110%
(define-constant LIQUIDATOR-BONUS u5)           ;; 5%
(define-constant MAX-INTEREST-RATE u10000)       ;; 100% APR
(define-constant MIN-TERM-DAYS u1)              ;; 1 day
(define-constant MAX-TERM-DAYS u365)            ;; 365 days
(define-constant BLOCKS_PER_YEAR u52560)        ;; ~10 min blocks
```

See [Contracts Guide](CONTRACTS.md) for detailed explanations.

---

## State Transitions

### Deposit State Machine

```
                    ┌──────────────────┐
                    │ No Deposit       │
                    │ (map entry DNE)  │
                    └────────┬─────────┘
                             │ deposit(amount)
                             ▼
                    ┌──────────────────┐
                    │ Has Deposit      │◄─── deposit(amount)
                    │ (balance > 0)    │     [balance += amount]
                    └────────┬─────────┘
                             │ withdraw(full balance)
                             ▼
                    ┌──────────────────┐
                    │ Zero Balance     │
                    │ (balance = 0)    │
                    └──────────────────┘
```

### Loan State Machine

```
                    ┌──────────────────┐
                    │ No Loan          │
                    │ (map entry DNE)  │
                    └────────┬─────────┘
                             │ borrow(amount, rate, term)
                             │ [requires deposit >= 150% of amount]
                             ▼
                    ┌──────────────────┐
                    │ Active Loan      │
                    │ (interest        │
                    │  accruing)       │
                    └───┬──────────┬───┘
                        │          │
           repay()      │          │ health factor drops
           [pay P+I]    │          │ below 110%
                        ▼          ▼
              ┌────────────┐  ┌───────────────┐
              │ Loan Repaid │  │ Liquidatable   │
              │ (map entry  │  │ (awaiting      │
              │  deleted)   │  │  liquidator)   │
              └─────────────┘  └───────┬───────┘
                                       │ liquidate(borrower)
                                       │ [by third party]
                                       ▼
                               ┌───────────────┐
                               │ Liquidated     │
                               │ (loan deleted, │
                               │  deposit       │
                               │  seized)       │
                               └───────────────┘
```

### Protocol Lifecycle

```
  Deploy ──► initialize() ──► Active Protocol
                                    │
                               ┌────┴────┐
                               │         │
                          Deposits    Borrows
                               │         │
                          Withdrawals  Repayments
                                         │
                                    Liquidations
```

### Variable Update Matrix

Which variables change on each operation:

| Operation | total-deposits | total-repaid | total-liquidations | last-activity-block |
|-----------|:-:|:-:|:-:|:-:|
| `deposit` | +amount | — | — | updated |
| `withdraw` | — | — | — | — |
| `borrow` | — | — | — | updated |
| `repay` | — | +total | — | updated |
| `liquidate` | — | — | +seized | updated |
| `initialize` | — | — | — | — |

---

## Map Access Patterns

| Function | user-deposits | user-loans | Access Type |
|----------|:---:|:---:|:----|
| `deposit` | write | — | `map-set` |
| `withdraw` | read+write | — | `map-get?` + `map-set` |
| `borrow` | read | write | `map-get?` + `map-set` |
| `repay` | — | read+delete | `map-get?` + `map-delete` |
| `liquidate` | read+delete | read+delete | `map-get?` + `map-delete` (both) |
| `get-user-deposit` | read | — | `default-to u0 (map-get?)` |
| `get-user-loan` | — | read | `map-get?` |

---

## Related Documentation

- [Architecture](ARCHITECTURE.md) — System architecture
- [Error Reference](ERROR_REFERENCE.md) — Error codes
- [Contracts Guide](CONTRACTS.md) — Full contract documentation
