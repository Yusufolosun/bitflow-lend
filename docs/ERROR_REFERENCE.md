# Error Code Reference

> **Complete reference for all error codes in the BitFlow Lend protocol.**

Contract: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

---

## Error Code Table

| Code | Constant | Triggered By | Description |
|------|----------|-------------|-------------|
| `u101` | `ERR-INSUFFICIENT-BALANCE` | `withdraw` | Withdrawal amount exceeds deposit balance |
| `u102` | `ERR-INVALID-AMOUNT` | `deposit`, `withdraw`, `borrow` | Amount is zero or negative |
| `u103` | `ERR-ALREADY-HAS-LOAN` | `borrow` | User already has an active loan |
| `u105` | `ERR-INSUFFICIENT-COLLATERAL` | `borrow` | Deposit is less than 150% of borrow amount |
| `u106` | `ERR-NO-ACTIVE-LOAN` | `repay` | No loan found for this user |
| `u107` | `ERR-NOT-LIQUIDATABLE` | `liquidate` | Health factor is above 110% |
| `u108` | `ERR-SELF-LIQUIDATION` | `liquidate` | Cannot liquidate your own position |
| `u109` | `ERR-OWNER-ONLY` | `initialize` | Caller is not the contract owner |
| `u110` | `ERR-INVALID-RATE` | `borrow` | Interest rate exceeds 10000 BPS (100%) |
| `u111` | `ERR-INVALID-TERM` | `borrow` | Term is less than 1 day or more than 365 days |

> **Note**: Error code `u104` is not used in the current contract version.

---

## Detailed Error Descriptions

### u101 — ERR-INSUFFICIENT-BALANCE

**Function**: `withdraw`

**Cause**: The requested withdrawal amount is larger than the user's deposit balance.

**Clarity source**:
```clarity
(asserts! (<= amount current-balance) (err u101))
```

**Resolution**:
1. Check your deposit balance with `get-user-deposit`
2. Reduce the withdrawal amount to your current balance or less
3. If you have an active loan, your collateral may be locked — repay the loan first

**Example**:
```
Deposit: 10 STX
Withdraw request: 15 STX
Result: (err u101)
```

---

### u102 — ERR-INVALID-AMOUNT

**Functions**: `deposit`, `withdraw`, `borrow`

**Cause**: The amount parameter is zero.

**Clarity source**:
```clarity
(asserts! (> amount u0) (err u102))
```

**Resolution**:
- Ensure the amount is greater than zero
- Check for UI bugs that might submit `0` or `NaN`

---

### u103 — ERR-ALREADY-HAS-LOAN

**Function**: `borrow`

**Cause**: The user already has an active loan entry in the `user-loans` map.

**Clarity source**:
```clarity
(asserts! (is-none (map-get? user-loans tx-sender)) (err u103))
```

**Resolution**:
1. Repay your existing loan with `repay`
2. Then create a new borrow

**Design note**: The protocol enforces one loan per user. This simplifies collateral management and health factor calculation.

---

### u105 — ERR-INSUFFICIENT-COLLATERAL

**Function**: `borrow`

**Cause**: The user's deposit is less than 150% of the requested borrow amount.

**Clarity source**:
```clarity
(asserts! (>= current-deposit required-collateral) (err u105))
```

Where `required-collateral = (amount × 150) / 100`.

**Resolution**:
1. Deposit more collateral
2. Or reduce the borrow amount
3. Check maximum borrow with `get-max-borrow-amount`

**Example**:
```
Deposit: 10 STX
Borrow request: 8 STX
Required collateral: 12 STX (8 × 1.5)
Result: (err u105) — need 2 more STX
```

---

### u106 — ERR-NO-ACTIVE-LOAN

**Function**: `repay`

**Cause**: No loan entry exists in `user-loans` for this user.

**Clarity source**:
```clarity
(asserts! (is-some loan-data) (err u106))
```

**Resolution**:
- You may have already repaid, or never borrowed
- Check loan status with `get-user-loan`

---

### u107 — ERR-NOT-LIQUIDATABLE

**Function**: `liquidate`

**Cause**: The target user's health factor is at or above 110%. Their position is healthy.

**Clarity source**:
```clarity
(asserts! (< health-factor u110) (err u107))
```

**Resolution**:
- The position cannot be liquidated yet
- Wait for interest to accrue and reduce the health factor
- Check with `is-liquidatable` or `calculate-health-factor`

---

### u108 — ERR-SELF-LIQUIDATION

**Function**: `liquidate`

**Cause**: The caller (`tx-sender`) is attempting to liquidate their own loan.

**Clarity source**:
```clarity
(asserts! (not (is-eq tx-sender borrower)) (err u108))
```

**Resolution**:
- Use `repay` to close your own loan
- Only third parties can liquidate a position

---

### u109 — ERR-OWNER-ONLY

**Function**: `initialize`

**Cause**: The caller is not the contract deployer (stored in `contract-owner`).

**Clarity source**:
```clarity
(asserts! (is-eq tx-sender (var-get contract-owner)) (err u109))
```

**Resolution**:
- Only the deployer wallet can call `initialize`
- This is a one-time setup function

---

### u110 — ERR-INVALID-RATE

**Function**: `borrow`

**Cause**: The interest rate exceeds 10000 basis points (100% APR).

**Clarity source**:
```clarity
(asserts! (<= interest-rate u10000) (err u110))
```

**Resolution**:
- Use a rate between 1 and 10000
- 500 = 5% APR, 1000 = 10% APR, 10000 = 100% APR

---

### u111 — ERR-INVALID-TERM

**Function**: `borrow`

**Cause**: The term is less than 1 day or more than 365 days.

**Clarity source**:
```clarity
(asserts! (and (>= term-days u1) (<= term-days u365)) (err u111))
```

**Resolution**:
- Use a term between 1 and 365 (inclusive)

---

## Error Handling in Code

### TypeScript

```typescript
const ERROR_MAP: Record<number, string> = {
  101: 'Insufficient balance for withdrawal',
  102: 'Invalid amount (must be > 0)',
  103: 'You already have an active loan',
  105: 'Not enough collateral',
  106: 'No active loan found',
  107: 'Position is not liquidatable',
  108: 'Cannot liquidate your own position',
  109: 'Only contract owner can call this',
  110: 'Interest rate too high (max 100%)',
  111: 'Invalid term (1-365 days)',
};

function handleContractError(errorCode: number): string {
  return ERROR_MAP[errorCode] || `Unknown error: u${errorCode}`;
}
```

### Clarity

```clarity
;; Errors are returned as (err uint)
;; Check with match:
(match (contract-call? .bitflow-vault-core deposit u1000000)
  ok-val (print "success")
  err-val (print err-val))
```

---

## Errors by Function

| Function | Possible Errors |
|----------|----------------|
| `deposit` | u102 |
| `withdraw` | u101, u102 |
| `borrow` | u102, u103, u105, u110, u111 |
| `repay` | u106 |
| `liquidate` | u106, u107, u108 |
| `initialize` | u109 |

---

## Related Documentation

- [Troubleshooting](TROUBLESHOOTING.md) — Common issues and fixes
- [API Examples](API_EXAMPLES.md) — Error handling code examples
- [Contracts Guide](CONTRACTS.md) — Full contract documentation
- [TypeScript Types](TYPESCRIPT_TYPES.md) — Error type definitions
