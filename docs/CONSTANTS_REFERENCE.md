# Constants Reference

> **All constants defined in the BitFlow Lend contract.**

Contract: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

---

## Protocol Constants

### MIN-COLLATERAL-RATIO

```clarity
(define-constant MIN-COLLATERAL-RATIO u150)
```

| Property | Value |
|----------|-------|
| **Value** | 150 |
| **Meaning** | 150% minimum collateral ratio |
| **Used by** | `borrow`, `calculate-required-collateral`, `get-max-borrow-amount` |

**How it works**: To borrow X amount, you must have at least 1.5× that amount deposited as collateral.

| Deposit | Max Borrow | Ratio |
|---------|-----------|-------|
| 15 STX | 10 STX | 150% |
| 10 STX | 6.67 STX | 150% |
| 100 STX | 66.67 STX | 150% |

**Formula**: `max_borrow = deposit × 100 / 150`

---

### LIQUIDATION-THRESHOLD

```clarity
(define-constant LIQUIDATION-THRESHOLD u110)
```

| Property | Value |
|----------|-------|
| **Value** | 110 |
| **Meaning** | 110% health factor threshold for liquidation |
| **Used by** | `is-liquidatable`, `liquidate` |

**How it works**: When a position's health factor drops below 110%, anyone can liquidate it. The health factor decreases as interest accrues.

| Health Factor | Status |
|--------------|--------|
| ≥ 200% | Very safe |
| 150–199% | Safe |
| 111–149% | Warning — monitor closely |
| ≤ 110% | Liquidatable |

**Formula**: `health_factor = (deposit × 100) / (loan_amount + accrued_interest)`

---

### LIQUIDATOR-BONUS

```clarity
(define-constant LIQUIDATOR-BONUS u5)
```

| Property | Value |
|----------|-------|
| **Value** | 5 |
| **Meaning** | 5% bonus on seized collateral |
| **Used by** | `liquidate` |

**How it works**: When a liquidator clears a borrower's debt, they receive the borrower's collateral plus a 5% bonus as incentive.

**Example**:
```
Borrower debt: 10 STX
Collateral seized: 12 STX
Liquidator bonus: 0.6 STX (12 × 5%)
Liquidator receives: 12.6 STX
Liquidator profit: 12.6 - 10 = 2.6 STX
```

---

### MAX-INTEREST-RATE

```clarity
(define-constant MAX-INTEREST-RATE u10000)
```

| Property | Value |
|----------|-------|
| **Value** | 10000 |
| **Meaning** | Maximum 100% APR (in basis points) |
| **Used by** | `borrow` (validation) |

**Basis points reference**:

| BPS | APR | Monthly (approx) |
|-----|-----|-------------------|
| 100 | 1% | 0.083% |
| 500 | 5% | 0.417% |
| 1000 | 10% | 0.833% |
| 2500 | 25% | 2.083% |
| 5000 | 50% | 4.167% |
| 10000 | 100% | 8.333% |

**Formula**: `APR = BPS / 100`

---

### MIN-TERM-DAYS / MAX-TERM-DAYS

```clarity
(define-constant MIN-TERM-DAYS u1)
(define-constant MAX-TERM-DAYS u365)
```

| Property | Min | Max |
|----------|-----|-----|
| **Value** | 1 | 365 |
| **Meaning** | Loan term in days | Maximum 1 year |
| **Used by** | `borrow` (validation) |

**Block conversion**: `term_blocks = term_days × 144`

| Days | Blocks | Purpose |
|------|--------|---------|
| 1 | 144 | Minimum loan term |
| 7 | 1,008 | Short-term |
| 30 | 4,320 | Standard |
| 90 | 12,960 | Medium-term |
| 180 | 25,920 | Half-year |
| 365 | 52,560 | Maximum term |

---

### BLOCKS_PER_YEAR

```clarity
(define-constant BLOCKS_PER_YEAR u52560)
```

| Property | Value |
|----------|-------|
| **Value** | 52560 |
| **Meaning** | Estimated blocks per year (~10 min/block) |
| **Used by** | `get-repayment-amount`, `calculate-health-factor` |

**Derived values**:
- Blocks per day: 144 (52,560 / 365)
- Blocks per hour: 6 (144 / 24)
- Block time: ~10 minutes

**Interest formula**: `interest = principal × rate × elapsed_blocks / (100 × 52,560)`

---

## Error Constants

```clarity
(define-constant ERR-INSUFFICIENT-BALANCE (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-ALREADY-HAS-LOAN (err u103))
(define-constant ERR-INSUFFICIENT-COLLATERAL (err u105))
(define-constant ERR-NO-ACTIVE-LOAN (err u106))
(define-constant ERR-NOT-LIQUIDATABLE (err u107))
(define-constant ERR-SELF-LIQUIDATION (err u108))
(define-constant ERR-OWNER-ONLY (err u109))
(define-constant ERR-INVALID-RATE (err u110))
(define-constant ERR-INVALID-TERM (err u111))
```

See [Error Reference](ERROR_REFERENCE.md) for detailed descriptions.

---

## String Constants

### CONTRACT-VERSION

```clarity
(define-constant CONTRACT-VERSION "1.0.0")
```

Returned by `get-contract-version`. Used for version tracking and migration coordination.

---

## Constants in TypeScript

```typescript
export const BITFLOW_CONSTANTS = {
  MIN_COLLATERAL_RATIO: 150,
  LIQUIDATION_THRESHOLD: 110,
  LIQUIDATOR_BONUS: 5,
  MAX_INTEREST_RATE: 10000,
  MIN_TERM_DAYS: 1,
  MAX_TERM_DAYS: 365,
  BLOCKS_PER_YEAR: 52560,
  BLOCKS_PER_DAY: 144,
  MICRO_STX: 1_000_000,
  CONTRACT_VERSION: '1.0.0',
} as const;
```

---

## Related Documentation

- [Data Model](DATA_MODEL.md) — Data maps and variables
- [Error Reference](ERROR_REFERENCE.md) — Error codes
- [Interest Calculator](INTEREST_CALCULATOR.md) — Interest math
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Health factor explained
