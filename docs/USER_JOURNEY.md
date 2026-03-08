# Visual User Journey Guide

> **Follow each flow visually from start to finish with ASCII diagrams.**

This guide maps every user interaction with the BitFlow Lend protocol. Each flow shows the exact sequence of steps, on-chain actions, and state changes.

---

## Overview: The Four Core Flows

```
                        ┌──────────────┐
                        │  BitFlow     │
                        │  Protocol    │
                        └──────┬───────┘
                               │
            ┌──────────┬───────┴───────┬──────────┐
            ▼          ▼               ▼          ▼
      ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
      │ DEPOSIT  │ │ BORROW   │ │  REPAY   │ │ WITHDRAW │
      │   Flow   │ │   Flow   │ │   Flow   │ │   Flow   │
      └──────────┘ └──────────┘ └──────────┘ └──────────┘
           │            │             │            │
           ▼            ▼             ▼            ▼
      Add STX to    Take loan    Return loan   Remove STX
      collateral    vs deposit   + interest    from vault
```

---

## Flow 1: Deposit

**Goal:** Add STX to your vault as collateral.

```
  ┌─────────────────────────────────────────────────────────┐
  │                    DEPOSIT FLOW                         │
  └─────────────────────────────────────────────────────────┘

  User                    Frontend                  Contract
  ────                    ────────                  ────────
   │                         │                         │
   │  1. Enter amount        │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │                         │  2. Validate             │
   │                         │  • Amount > 0?           │
   │                         │  • Sufficient balance?   │
   │                         │                         │
   │  3. Click "Deposit"     │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  4. Wallet popup        │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  5. Confirm TX          │                         │
   │  ───────────────────►   │                         │
   │                         │  6. contract-call        │
   │                         │  ───────────────────►   │
   │                         │                         │
   │                         │                 7. Checks:
   │                         │                 • amount > 0
   │                         │                         │
   │                         │                 8. Actions:
   │                         │                 • stx-transfer!
   │                         │                 • update user-deposits map
   │                         │                 • increment total-deposits
   │                         │                 • increment counter
   │                         │                 • add to volume
   │                         │                 • update last-activity
   │                         │                         │
   │                         │  9. (ok true)            │
   │                         │  ◄───────────────────   │
   │                         │                         │
   │  10. Success toast      │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  11. Updated balance    │                         │
   │  ◄───────────────────   │                         │
   ▼                         ▼                         ▼
```

### State Changes After Deposit

```
  Before                          After
  ──────                          ─────
  user-deposits[Alice] = 0        user-deposits[Alice] = 5,000,000
  total-deposits = 10,000,000     total-deposits = 15,000,000
  deposit-count = 3               deposit-count = 4
  deposit-volume = 30,000,000     deposit-volume = 35,000,000
  Alice wallet = 10.50 STX        Alice wallet = 5.50 STX
```

---

## Flow 2: Borrow

**Goal:** Take a loan against your deposited collateral.

```
  ┌─────────────────────────────────────────────────────────┐
  │                    BORROW FLOW                          │
  └─────────────────────────────────────────────────────────┘

  User                    Frontend                  Contract
  ────                    ────────                  ────────
   │                         │                         │
   │  1. Enter borrow amount │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  2. Select term         │                         │
   │     (7/30/90/365 days)  │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  3. Set interest rate   │                         │
   │     (e.g., 500 = 5%)    │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │                         │  4. Pre-flight check     │
   │                         │  • Has existing loan?    │
   │                         │  • Enough collateral?    │
   │                         │  • Rate valid (≤100%)?   │
   │                         │  • Term valid (1-365)?   │
   │                         │                         │
   │  5. Click "Borrow"      │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  6. Wallet popup        │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  7. Confirm TX          │                         │
   │  ───────────────────►   │                         │
   │                         │  8. contract-call        │
   │                         │  ───────────────────►   │
   │                         │                         │
   │                         │           9. Validations:
   │                         │           • rate ≤ 10000
   │                         │           • term 1..365
   │                         │           • no existing loan
   │                         │           • deposit ≥ 150%
   │                         │             of borrow
   │                         │                         │
   │                         │           10. Actions:
   │                         │           • stx-transfer!
   │                         │             (vault → user)
   │                         │           • store loan data
   │                         │           • increment counter
   │                         │           • add to volume
   │                         │                         │
   │                         │  11. (ok true)           │
   │                         │  ◄───────────────────   │
   │                         │                         │
   │  12. Loan active card   │                         │
   │  ◄───────────────────   │                         │
   ▼                         ▼                         ▼
```

### Collateral Check Diagram

```
  ┌─────────────────────────────────────────────┐
  │         COLLATERAL RATIO CHECK              │
  │                                             │
  │  deposit = 5,000,000 (5 STX)                │
  │  borrow  = 3,000,000 (3 STX)               │
  │                                             │
  │  required = borrow × 150 / 100              │
  │          = 3,000,000 × 150 / 100            │
  │          = 4,500,000 (4.5 STX)              │
  │                                             │
  │  deposit (5,000,000) >= required (4,500,000) │
  │  ──► ✓ PASS                                 │
  │                                             │
  │  If borrow = 3,500,000 (3.5 STX):           │
  │  required = 5,250,000 (5.25 STX)            │
  │  deposit (5,000,000) < required (5,250,000)  │
  │  ──► ✗ FAIL (ERR-INSUFFICIENT-COLLATERAL)   │
  └─────────────────────────────────────────────┘
```

### Loan Data Stored On-Chain

```
  user-loans[Alice] = {
    amount:        3,000,000    ← principal (3 STX)
    interest-rate:       500    ← 5% APR in basis points
    start-block:     180,000    ← block when borrowed
    term-end:        180,000 + (30 × 144) = 184,320
                                ← due in 30 days
  }
```

---

## Flow 3: Repay

**Goal:** Repay your loan (principal + interest) and unlock your collateral.

```
  ┌─────────────────────────────────────────────────────────┐
  │                    REPAY FLOW                           │
  └─────────────────────────────────────────────────────────┘

  User                    Frontend                  Contract
  ────                    ────────                  ────────
   │                         │                         │
   │  1. View loan details   │                         │
   │  ───────────────────►   │                         │
   │                         │  2. Fetch repayment     │
   │                         │  ───────────────────►   │
   │                         │                         │
   │                         │  3. Calculate:           │
   │                         │  interest =              │
   │                         │    principal × rate ×    │
   │                         │    blocks / (100×52560)  │
   │                         │                         │
   │                         │  4. Return amounts       │
   │                         │  ◄───────────────────   │
   │                         │                         │
   │  5. See breakdown:      │                         │
   │     Principal: 3.00     │                         │
   │     Interest:  0.012    │                         │
   │     Total:     3.012    │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  6. Click "Repay"       │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  7. Wallet popup        │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  8. Confirm TX          │                         │
   │  ───────────────────►   │                         │
   │                         │  9. contract-call        │
   │                         │  ───────────────────►   │
   │                         │                         │
   │                         │           10. Actions:
   │                         │           • calc interest
   │                         │           • stx-transfer!
   │                         │             (user → vault)
   │                         │           • delete loan
   │                         │           • add to total-
   │                         │             repaid
   │                         │           • update counters
   │                         │                         │
   │                         │  11. (ok {              │
   │                         │    principal, interest,  │
   │                         │    total                 │
   │                         │  })                      │
   │                         │  ◄───────────────────   │
   │                         │                         │
   │  12. Loan cleared!      │                         │
   │  ◄───────────────────   │                         │
   ▼                         ▼                         ▼
```

### Interest Calculation Example

```
  ┌──────────────────────────────────────────────┐
  │           INTEREST CALCULATION               │
  │                                              │
  │  Principal:    3,000,000 microSTX (3 STX)    │
  │  Rate:         500 basis points (5% APR)     │
  │  Elapsed:      4,320 blocks (30 days)        │
  │                                              │
  │  interest = principal × rate × blocks        │
  │             ─────────────────────────         │
  │                   100 × 52,560               │
  │                                              │
  │           = 3,000,000 × 500 × 4,320          │
  │             ─────────────────────────         │
  │                   5,256,000                   │
  │                                              │
  │           = 6,480,000,000,000                 │
  │             ─────────────────                 │
  │                 5,256,000                     │
  │                                              │
  │           = 1,232,876 microSTX               │
  │           ≈ 1.23 STX                         │
  │                                              │
  │  Total repayment = 3,000,000 + 1,232,876     │
  │                  = 4,232,876 microSTX         │
  │                  ≈ 4.23 STX                   │
  └──────────────────────────────────────────────┘
```

---

## Flow 4: Withdraw

**Goal:** Remove your STX from the vault back to your wallet.

```
  ┌─────────────────────────────────────────────────────────┐
  │                   WITHDRAW FLOW                         │
  └─────────────────────────────────────────────────────────┘

  User                    Frontend                  Contract
  ────                    ────────                  ────────
   │                         │                         │
   │  1. Enter amount        │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │                         │  2. Validate             │
   │                         │  • Has active loan?      │
   │                         │    → Cannot withdraw     │
   │                         │  • Amount ≤ deposit?     │
   │                         │                         │
   │  3. Click "Withdraw"    │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  4. Wallet popup        │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  5. Confirm TX          │                         │
   │  ───────────────────►   │                         │
   │                         │  6. contract-call        │
   │                         │  ───────────────────►   │
   │                         │                         │
   │                         │           7. Checks:
   │                         │           • amount > 0
   │                         │           • amount ≤ balance
   │                         │                         │
   │                         │           8. Actions:
   │                         │           • stx-transfer!
   │                         │             (vault → user)
   │                         │           • update deposits
   │                         │           • decrement total
   │                         │           • update counters
   │                         │                         │
   │                         │  9. (ok true)            │
   │                         │  ◄───────────────────   │
   │                         │                         │
   │  10. Balance updated    │                         │
   │  ◄───────────────────   │                         │
   ▼                         ▼                         ▼
```

---

## Flow 5: Liquidation

**Goal:** A third party liquidates an undercollateralized loan.

```
  ┌─────────────────────────────────────────────────────────┐
  │                  LIQUIDATION FLOW                       │
  └─────────────────────────────────────────────────────────┘

  Liquidator               Contract                 Borrower
  ──────────               ────────                 ────────
   │                         │                         │
   │  1. Check health factor │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │  2. health < 110%?      │                         │
   │  ◄───────────────────   │                         │
   │                         │                         │
   │  Yes → proceed          │                         │
   │                         │                         │
   │  3. Call liquidate       │                         │
   │     (borrower, price)   │                         │
   │  ───────────────────►   │                         │
   │                         │                         │
   │                   4. Validations:                  │
   │                   • Not self-liquidation           │
   │                   • Has active loan               │
   │                   • Health < 110%                  │
   │                         │                         │
   │                   5. Calculate:                    │
   │                   • interest owed                  │
   │                   • total debt                     │
   │                   • 5% liquidator bonus            │
   │                         │                         │
   │                   6. Actions:                      │
   │                   • Liquidator pays                │
   │                     (debt + 5% bonus)              │
   │                   • Seize borrower's               │
   │                     collateral                     │
   │                   • Delete loan                    │
   │                   • Reset borrower's               │
   │                     deposit to 0                   │
   │                         │                         │
   │  7. (ok {               │                         │
   │    seized-collateral,   │     8. Loan deleted      │
   │    paid,                │     ──────────────►      │
   │    bonus                │     Deposit zeroed       │
   │  })                     │                         │
   │  ◄───────────────────   │                         │
   ▼                         ▼                         ▼
```

### Liquidation Economics

```
  ┌──────────────────────────────────────────────┐
  │          LIQUIDATION EXAMPLE                 │
  │                                              │
  │  Bob's Position:                             │
  │    Deposit:     5.00 STX (collateral)        │
  │    Loan:        3.50 STX (principal)         │
  │    Interest:    0.10 STX (accrued)           │
  │    Total debt:  3.60 STX                     │
  │                                              │
  │  STX price drops → health factor < 110%      │
  │                                              │
  │  Alice (liquidator) calls liquidate:         │
  │    • Alice pays: 3.60 + 5% = 3.78 STX       │
  │    • Alice receives: 5.00 STX (collateral)   │
  │    • Alice profit: 5.00 - 3.78 = 1.22 STX   │
  │                                              │
  │  Bob's result:                               │
  │    • Loan deleted                            │
  │    • Deposit zeroed (collateral seized)      │
  │    • Keeps the originally borrowed 3.50 STX  │
  │    • Net loss: 5.00 - 3.50 = 1.50 STX       │
  └──────────────────────────────────────────────┘
```

---

## Complete User Lifecycle

```
  ┌─────┐
  │START│
  └──┬──┘
     │
     ▼
  ┌──────────────────┐
  │ Connect Wallet   │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐     ┌──────────────────┐
  │ Deposit STX      │────►│ Monitor Balance  │◄──┐
  └────────┬─────────┘     └──────────────────┘   │
           │                                       │
           ▼                                       │
  ┌──────────────────┐                             │
  │ Borrow STX       │                             │
  │ (optional)       │                             │
  └────────┬─────────┘                             │
           │                                       │
           ▼                                       │
  ┌──────────────────┐     ┌──────────────────┐   │
  │ Monitor Health   │────►│ Add Collateral   │───┘
  │ Factor           │     │ (if needed)      │
  └────────┬─────────┘     └──────────────────┘
           │
           ▼
  ┌──────────────────┐
  │ Repay Loan       │
  │ (principal +     │
  │  interest)       │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Withdraw STX     │
  │ (all or partial) │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────┐
  │ Disconnect or    │
  │ repeat cycle     │
  └──────────────────┘
```

---

## Decision Trees

### Should I Borrow?

```
  Do you have STX deposited?
  │
  ├─ No ──► Deposit first
  │
  └─ Yes ─► Do you have an active loan?
             │
             ├─ Yes ──► Repay first (1 loan at a time)
             │
             └─ No ──► Is your deposit ≥ 150% of borrow?
                        │
                        ├─ No ──► Deposit more or borrow less
                        │
                        └─ Yes ──► ✓ You can borrow!
```

### What Should I Do When Health Factor Drops?

```
  Health Factor
  │
  ├─ > 200% ──► No action needed. You're very safe.
  │
  ├─ 150-200% ──► Monitor regularly. Consider adding collateral.
  │
  ├─ 110-150% ──► ⚠️ WARNING: Add collateral or repay part of loan.
  │
  └─ < 110% ──► 🚨 DANGER: Repay immediately! Liquidation possible.
```

---

## Related Documentation

- [Quick Start Guide](QUICKSTART.md) — 5-minute setup
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Understanding health factors
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — How liquidation works
- [Interest Calculator](INTEREST_CALCULATOR.md) — Calculate your costs
- [API Reference](API.md) — Contract function details
