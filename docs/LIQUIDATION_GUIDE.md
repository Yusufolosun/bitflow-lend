# Liquidation Prevention Guide

> **Understand how liquidation works and how to prevent it.**

Liquidation is the most important risk to understand when borrowing on BitFlow Lend. This guide explains the mechanics, shows you how to avoid it, and what to do if it happens.

---

## What Is Liquidation?

Liquidation is a safety mechanism that protects the protocol when a loan becomes undercollateralized. When your **health factor drops below 110%**, any third-party user can liquidate your loan.

In simple terms: if your collateral is no longer worth enough to safely back your loan, someone else can pay off your debt and take your collateral as a reward.

---

## How Liquidation Works

### The Process

```
1. You have a loan with health factor < 110%

2. A liquidator calls: liquidate(your-address, stx-price)

3. Contract verifies:
   ├── Liquidator ≠ borrower (can't self-liquidate)
   ├── Borrower has an active loan
   └── Health factor < 110% at given price

4. Contract calculates:
   ├── Accrued interest
   ├── Total debt = principal + interest
   └── Liquidator bonus = 5% of total debt

5. Liquidator pays: total debt + 5% bonus → vault

6. Liquidator receives: ALL of borrower's collateral

7. Borrower's state is reset:
   ├── Loan is deleted
   └── Deposit is set to 0
```

### Key Parameters

| Parameter | Value | Meaning |
|---|---|---|
| Minimum collateral ratio | 150% | Required when borrowing |
| Liquidation threshold | 110% | Below this, liquidation is possible |
| Liquidator bonus | 5% | Bonus paid by liquidator on top of debt |
| Liquidation type | Full | Entire position is liquidated (no partial) |

---

## Health Factor Explained

Your health factor represents how safe your loan is:

```
                    collateral value
Health Factor = ─────────────────────── × 100
                     total debt
```

In the contract, this is calculated using STX price:

```clarity
(define-read-only (calculate-health-factor (user principal) (stx-price uint))
  ;; health = (deposit × stx-price × 100) / loan-amount
)
```

### Health Factor Zones

```
  ┌──────────────────────────────────────────────────────┐
  │                 HEALTH FACTOR ZONES                  │
  │                                                      │
  │  ◄─────── DANGER ────────┤                           │
  │  0%              110%    │                           │
  │  ████████████████████    │                           │
  │  [Liquidation possible]  │                           │
  │                          │                           │
  │                 110%─────┤──── WARNING ─────┤         │
  │                          │    110% - 150%   │         │
  │                          │    ▓▓▓▓▓▓▓▓▓▓    │         │
  │                          │    [Monitor!]    │         │
  │                          │                  │         │
  │                          │         150%─────┤── SAFE  │
  │                          │                  │  > 150% │
  │                          │                  │  ░░░░░  │
  │                          │                  │ [OK!]   │
  └──────────────────────────────────────────────────────┘
```

---

## Why Liquidation Happens

### Cause 1: Borrowing Too Much

If you borrow close to the maximum (66.67% of deposit), your health factor starts at exactly 150% — right at the edge of the warning zone. Any negative movement pushes you toward liquidation.

**Example:**
- Deposit: 15 STX
- Borrow: 10 STX (maximum allowed at 150%)
- Starting health factor: 150%
- After 30 days of interest at 5% APR: ~149.4%
- More interest accrual → slides toward 110%

### Cause 2: Interest Accrual

Interest on your loan increases your total debt over time, which gradually decreases your health factor — even if nothing else changes.

**Example (borrow 10 STX at 8% APR):**

| Time | Interest Accrued | Total Debt | Health Factor (15 STX deposit) |
|---|---|---|---|
| Day 0 | 0 STX | 10.00 STX | 150.0% |
| Day 30 | 0.066 STX | 10.066 STX | 149.0% |
| Day 90 | 0.197 STX | 10.197 STX | 147.1% |
| Day 180 | 0.395 STX | 10.395 STX | 144.3% |
| Day 365 | 0.800 STX | 10.800 STX | 138.9% |

### Cause 3: Oracle Price Movement (Future Risk)

In the current implementation, the liquidator provides the STX price. In future versions with oracle integration, price drops would directly reduce your health factor.

---

## How to Prevent Liquidation

### Strategy 1: Borrow Conservatively

The safest approach is to never borrow more than 50% of your deposit:

| Deposit | Max Borrow (66.67%) | Recommended Borrow (50%) | Health at Recommended |
|---|---|---|---|
| 10 STX | 6.67 STX | 5.00 STX | 200% |
| 20 STX | 13.33 STX | 10.00 STX | 200% |
| 50 STX | 33.33 STX | 25.00 STX | 200% |

At 50% borrow, your starting health factor is 200%, giving you a 90-percentage-point buffer before liquidation.

### Strategy 2: Add Collateral When Warning

If your health factor drops into the warning zone (110%–150%), deposit additional STX:

```
Before: Deposit 15 STX, Debt 10.5 STX → Health = 142.9%
Action: Deposit 5 more STX
After:  Deposit 20 STX, Debt 10.5 STX → Health = 190.5%
```

### Strategy 3: Repay Early

Don't wait until the due date. Repaying early reduces your debt and eliminates liquidation risk:

```
Before: Deposit 15 STX, Debt 10.5 STX → Health = 142.9%
Action: Repay loan (10.5 STX + interest)
After:  Deposit 15 STX, Debt 0 STX → No loan, no risk
```

### Strategy 4: Use Shorter Loan Terms

Shorter loans accrue less interest, keeping your health factor higher:

| Term | Interest at 5% APR on 10 STX | Health Impact |
|---|---|---|
| 7 days | 0.010 STX | Minimal |
| 30 days | 0.041 STX | Low |
| 90 days | 0.123 STX | Moderate |
| 365 days | 0.500 STX | Significant |

### Strategy 5: Monitor Regularly

Check your health factor on the dashboard:
- **Daily** if health factor is 150–200%
- **Multiple times per day** if health factor is 110–150%
- **Immediately act** if health factor drops below 130%

---

## Liquidation Economics

### For the Borrower (You)

When you get liquidated, here's what happens to your assets:

```
  BEFORE LIQUIDATION:
  ├── Wallet:    10 STX (originally borrowed)
  ├── Deposit:   15 STX (locked as collateral)
  └── Loan:      10 STX + interest (owed)

  AFTER LIQUIDATION:
  ├── Wallet:    10 STX (you keep borrowed amount)
  ├── Deposit:   0 STX  (seized by liquidator)
  └── Loan:      deleted (paid by liquidator)

  NET RESULT:
  ├── Lost:      15 STX (deposit/collateral)
  ├── Kept:      10 STX (borrowed amount)
  └── Net loss:  5 STX + interest
```

### For the Liquidator

Liquidators are incentivized by the 5% bonus:

```
  LIQUIDATOR PAYS:
  ├── Borrower's debt:  10.50 STX (principal + interest)
  └── 5% bonus:          0.53 STX
  ├── Total paid:       11.03 STX

  LIQUIDATOR RECEIVES:
  └── Borrower's collateral: 15.00 STX

  LIQUIDATOR PROFIT:
  └── 15.00 - 11.03 = 3.97 STX
```

---

## Recovery After Liquidation

If you've been liquidated, here's what to do:

### Step 1: Understand What Happened

1. Check the Stacks Explorer for the liquidation transaction
2. Verify that your deposit is now 0 and your loan is deleted
3. Note that the STX you originally borrowed is still in your wallet

### Step 2: Restart Safely

1. Deposit STX again (you can start fresh immediately)
2. This time, borrow more conservatively
3. Target a health factor of 200%+ at origination
4. Set up more frequent monitoring

### Step 3: Learn From It

| What Went Wrong | What To Do Next Time |
|---|---|---|
| Borrowed too much | Borrow ≤ 50% of deposit |
| Didn't monitor | Check health factor daily |
| Interest ate the buffer | Use shorter loan terms |
| No emergency plan | Keep reserve STX for repayment |

---

## Liquidation FAQ

**Q: Can I be partially liquidated?**
A: No. BitFlow v1.x liquidates the entire position — full loan deletion and full collateral seizure.

**Q: Can I liquidate myself?**
A: No. The contract enforces `ERR-LIQUIDATE-OWN-LOAN` (u108). Another address must perform the liquidation.

**Q: Who are the liquidators?**
A: Anyone with a Stacks wallet. Some run automated bots that monitor health factors.

**Q: Is there a warning before liquidation?**
A: The dashboard shows a yellow warning when your health drops below 150% and a red alert below 110%. There's no on-chain warning system.

**Q: Can I reverse a liquidation?**
A: No. Liquidation is a permanent, irreversible on-chain action.

**Q: What's the worst-case loss?**
A: Your full deposit minus the amount you borrowed. For example, deposit 15 STX, borrow 10 STX → worst case lose 5 STX + accrued interest.

---

## Real Scenarios

Five example cases that illustrate different liquidation situations.

### Scenario 1: The Maximum Borrower

**Alice** deposits 30 STX and borrows the maximum: 20 STX at 5% APR for 90 days.

```
Day 0:
  Deposit:       30.000 STX
  Debt:          20.000 STX
  Health Factor: 150.0%  ← Right at the boundary

Day 45:
  Interest:       0.123 STX
  Debt:          20.123 STX
  Health Factor: 149.1%  ← Sliding into warning

Day 75:
  Interest:       0.205 STX
  Debt:          20.205 STX
  Health Factor: 148.5%

Day 90 (term end):
  Interest:       0.247 STX
  Debt:          20.247 STX
  Health Factor: 148.2%
```

**Result:** Alice doesn't get liquidated because interest alone doesn't push her below 110% in 90 days. However, she's been in the warning zone the entire time — risky.

**Lesson:** Borrowing the maximum is stressful but survivable for short terms at low rates.

### Scenario 2: The High-Rate Borrower

**Bob** deposits 15 STX and borrows 9 STX at 50% APR (rate = 5000) for 365 days.

```
Day 0:
  Deposit:       15.000 STX
  Debt:           9.000 STX
  Health Factor: 166.7%

Day 90:
  Interest:       1.110 STX
  Debt:          10.110 STX
  Health Factor: 148.4%  ← Warning zone

Day 180:
  Interest:       2.219 STX
  Debt:          11.219 STX
  Health Factor: 133.7%  ← Deep warning

Day 270:
  Interest:       3.329 STX
  Debt:          12.329 STX
  Health Factor: 121.7%  ← Approaching danger

Day 310 (approx):
  Interest:       3.822 STX
  Debt:          12.822 STX
  Health Factor: 117.0%  ← Critical

Day 340 (approx):
  Interest:       4.192 STX
  Debt:          13.192 STX
  Health Factor: 113.7%  ← Near liquidation

~Day 370:
  Interest:       4.562 STX
  Debt:          13.562 STX
  Health Factor: 110.6%  ← Just above threshold
```

**Result:** Bob barely avoids liquidation by the end of his 365-day term, but is extremely close. If a liquidator checks at the right moment with the right price input, Bob could be liquidated.

**Lesson:** High interest rates are dangerous for long-term loans. Bob should have used a lower rate or shorter term.

### Scenario 3: The Early Repayer

**Carol** deposits 20 STX and borrows 12 STX at 8% APR for 90 days.

```
Day 0:
  Health Factor: 166.7%

Day 15:
  Interest accrued: 0.040 STX
  Carol checks dashboard: health factor = 166.3%
  Carol decides to repay early.
  
  Total repayment: 12.040 STX
  Carol pays from wallet balance.
  
Day 15 (after repayment):
  Deposit: 20 STX (now unlocked)
  Loan: none
  Risk: zero
```

**Result:** Carol played it safe. She repaid after 15 days, paid only 0.040 STX in interest, and never entered the warning zone.

**Lesson:** Early repayment is the safest strategy. Interest cost is minimal for short durations.

### Scenario 4: The Liquidation Event

**Dave** deposits 10 STX and borrows 6 STX at 10% APR for 365 days.

```
Day 0:
  Deposit:       10.000 STX
  Debt:           6.000 STX
  Health Factor: 166.7%

Day 200:
  Interest:       0.329 STX
  Debt:           6.329 STX  
  Health Factor: 158.0%
  
Dave stops checking the dashboard...

Day 350:
  Interest:       0.575 STX
  Debt:           6.575 STX
  Health Factor: 152.1%
  
Dave is still not monitoring...

Hypothetical: A liquidator provides a price that calculates 
Dave's health factor below 110%.

Liquidator executes:
  Total debt:          6.575 STX
  Liquidator bonus:    0.329 STX (5%)
  Liquidator pays:     6.904 STX
  Liquidator receives: 10.000 STX (Dave's collateral)
  Liquidator profit:   3.096 STX

Dave's result:
  Deposit: 0 STX (seized)
  Loan: deleted
  Wallet: still has the 6 STX he borrowed
  Net loss: 10 - 6 = 4 STX + 0.575 interest he avoided paying
```

**Lesson:** Not monitoring your position is dangerous. Dave lost 4 STX because he forgot about his loan.

### Scenario 5: The Smart Collateral Manager

**Eve** deposits 50 STX and borrows 20 STX at 5% APR for 90 days. She actively manages her position.

```
Day 0:
  Deposit:       50.000 STX
  Debt:          20.000 STX
  Health Factor: 250.0%  ← Very safe

Day 30:
  Interest:       0.082 STX
  Debt:          20.082 STX
  Health Factor: 248.9%
  Eve checks: "Still very safe."

Day 60:
  Interest:       0.164 STX
  Debt:          20.164 STX
  Health Factor: 248.0%
  Eve checks: "Dropping slowly, but fine."

Day 85 (5 days before due):
  Interest:       0.233 STX
  Debt:          20.233 STX
  Health Factor: 247.1%
  Eve decides to repay.

  Total repayment: 20.233 STX
  Eve pays from wallet.

After repayment:
  Deposit: 50 STX (unlocked)
  Eve withdraws 50 STX.
  Net cost: only 0.233 STX in interest.
```

**Result:** Eve started with a safe buffer (250%), monitored regularly, and repaid on time. Her only cost was 0.233 STX in interest — less than 1.2% of her deposit.

**Lesson:** Conservative borrowing + regular monitoring + timely repayment = lowest cost and zero liquidation risk.

---

## Related Documentation

- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Deep dive into health factors
- [Interest Calculator](INTEREST_CALCULATOR.md) — Calculate your interest costs
- [Safety Best Practices](SAFETY.md) — Protect your funds
- [Troubleshooting](TROUBLESHOOTING.md) — Fix common issues
- [FAQ](FAQ.md) — Frequently asked questions
