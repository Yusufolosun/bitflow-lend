# Interest Calculation Guide

> **Understand exactly how much interest you'll pay on your BitFlow loan.**

BitFlow Lend uses simple interest calculated on a per-block basis. This guide explains the formula, provides examples for every loan term, and includes comparison tables so you can make informed borrowing decisions.

---

## The Formula

Interest in BitFlow is calculated using simple interest:

```
                principal × rate × blocks_elapsed
Interest = ─────────────────────────────────────────
                       100 × 52,560
```

Where:
- **principal** — The loan amount in microSTX
- **rate** — Annual interest rate in basis points (100 = 1%, 500 = 5%)
- **blocks_elapsed** — Number of Stacks blocks since the loan was created
- **52,560** — Blocks per year (365 days × 144 blocks/day)
- **100** — Scaling factor for basis points

### Time Conversions

| Duration | Blocks |
|---|---|
| 1 hour | ~6 blocks |
| 1 day | 144 blocks |
| 7 days | 1,008 blocks |
| 30 days | 4,320 blocks |
| 90 days | 12,960 blocks |
| 180 days | 25,920 blocks |
| 365 days | 52,560 blocks |

---

## Examples for Each Loan Term

All examples use a **10 STX** principal (10,000,000 microSTX).

### 7-Day Loan

| Rate (APR) | Basis Points | Interest | Total Repayment |
|---|---|---|---|
| 1% | 100 | 0.00192 STX | 10.00192 STX |
| 3% | 300 | 0.00575 STX | 10.00575 STX |
| 5% | 500 | 0.00959 STX | 10.00959 STX |
| 8% | 800 | 0.01534 STX | 10.01534 STX |
| 10% | 1000 | 0.01918 STX | 10.01918 STX |
| 20% | 2000 | 0.03836 STX | 10.03836 STX |

**Worked example (5% APR, 7 days):**
```
interest = 10,000,000 × 500 × 1,008 / (100 × 52,560)
         = 5,040,000,000,000 / 5,256,000
         = 958,904 microSTX
         ≈ 0.00959 STX (truncated due to integer division)
```

### 30-Day Loan

| Rate (APR) | Basis Points | Interest | Total Repayment |
|---|---|---|---|
| 1% | 100 | 0.00822 STX | 10.00822 STX |
| 3% | 300 | 0.02466 STX | 10.02466 STX |
| 5% | 500 | 0.04110 STX | 10.04110 STX |
| 8% | 800 | 0.06575 STX | 10.06575 STX |
| 10% | 1000 | 0.08219 STX | 10.08219 STX |
| 20% | 2000 | 0.16438 STX | 10.16438 STX |

**Worked example (8% APR, 30 days):**
```
interest = 10,000,000 × 800 × 4,320 / (100 × 52,560)
         = 34,560,000,000,000 / 5,256,000
         = 6,575,342 microSTX
         ≈ 0.06575 STX
```

### 90-Day Loan

| Rate (APR) | Basis Points | Interest | Total Repayment |
|---|---|---|---|
| 1% | 100 | 0.02466 STX | 10.02466 STX |
| 3% | 300 | 0.07397 STX | 10.07397 STX |
| 5% | 500 | 0.12329 STX | 10.12329 STX |
| 8% | 800 | 0.19726 STX | 10.19726 STX |
| 10% | 1000 | 0.24658 STX | 10.24658 STX |
| 20% | 2000 | 0.49315 STX | 10.49315 STX |

### 365-Day Loan

| Rate (APR) | Basis Points | Interest | Total Repayment |
|---|---|---|---|
| 1% | 100 | 0.10000 STX | 10.10000 STX |
| 3% | 300 | 0.30000 STX | 10.30000 STX |
| 5% | 500 | 0.50000 STX | 10.50000 STX |
| 8% | 800 | 0.80000 STX | 10.80000 STX |
| 10% | 1000 | 1.00000 STX | 11.00000 STX |
| 20% | 2000 | 2.00000 STX | 12.00000 STX |

> **Note:** For a 365-day loan, the interest over a full year equals exactly `principal × rate / 10000` because 52,560 blocks / 52,560 = 1.

---

## Comparison Table: Total Cost by Term and Rate

How much interest you pay on a **10 STX** loan:

| Rate \ Term | 7 days | 30 days | 90 days | 365 days |
|---|---|---|---|---|
| 1% APR | 0.002 | 0.008 | 0.025 | 0.100 |
| 3% APR | 0.006 | 0.025 | 0.074 | 0.300 |
| 5% APR | 0.010 | 0.041 | 0.123 | 0.500 |
| 8% APR | 0.015 | 0.066 | 0.197 | 0.800 |
| 10% APR | 0.019 | 0.082 | 0.247 | 1.000 |
| 20% APR | 0.038 | 0.164 | 0.493 | 2.000 |
| 50% APR | 0.096 | 0.411 | 1.233 | 5.000 |

*All values in STX, rounded to 3 decimal places.*

---

## How Interest Rate Basis Points Work

The interest rate in BitFlow is specified in **basis points**:

| Basis Points | Percentage | Meaning |
|---|---|---|
| 100 | 1% APR | Very low — almost free |
| 300 | 3% APR | Low — typical savings account |
| 500 | 5% APR | Moderate — typical DeFi lending |
| 800 | 8% APR | Above average |
| 1000 | 10% APR | High |
| 2000 | 20% APR | Very high |
| 5000 | 50% APR | Extremely high |
| 10000 | 100% APR | Maximum allowed |

**Conversion:** Divide basis points by 100 to get the percentage.
- 500 basis points ÷ 100 = 5%
- 1500 basis points ÷ 100 = 15%

---

## Early Repayment Savings

You can repay your loan at any time before the term ends. Interest is calculated based on actual time elapsed, not the full term.

**Example: 90-day loan repaid after 15 days**

```
Original plan:     10 STX at 5% for 90 days → 0.123 STX interest
Early repayment:   10 STX at 5% for 15 days → 0.021 STX interest
Savings:           0.123 - 0.021 = 0.102 STX saved (83% less)
```

**The takeaway:** Repaying early saves you proportionally. The interest formula only uses actual blocks elapsed, not the term length.

---

## Impact on Health Factor

Interest accrual gradually increases your total debt, which decreases your health factor:

**Example: 20 STX deposit, 10 STX borrow at 5% APR**

| Day | Accrued Interest | Total Debt | Health Factor |
|---|---|---|---|
| 0 | 0.000 STX | 10.000 STX | 200.0% |
| 30 | 0.041 STX | 10.041 STX | 199.2% |
| 90 | 0.123 STX | 10.123 STX | 197.6% |
| 180 | 0.247 STX | 10.247 STX | 195.2% |
| 365 | 0.500 STX | 10.500 STX | 190.5% |

At 5% APR with a 200% starting health factor, it would take many years for interest alone to push health below 110%.

---

## Calculator: Do It Yourself

### Step 1: Convert Your Inputs

```
principal_micro = principal_STX × 1,000,000
blocks = days × 144
```

### Step 2: Calculate Interest

```
interest_micro = principal_micro × rate_bps × blocks / (100 × 52,560)
interest_STX = interest_micro / 1,000,000
```

### Step 3: Calculate Total Repayment

```
total = principal_STX + interest_STX
```

### Quick JavaScript Calculator

```javascript
function calculateInterest(principalSTX, rateBPS, days) {
  const principalMicro = principalSTX * 1_000_000;
  const blocks = days * 144;
  const interestMicro = Math.floor(
    (principalMicro * rateBPS * blocks) / (100 * 52_560)
  );
  const interestSTX = interestMicro / 1_000_000;
  return {
    interest: interestSTX,
    total: principalSTX + interestSTX,
    dailyCost: interestSTX / days,
  };
}

// Example: 10 STX at 5% for 30 days
console.log(calculateInterest(10, 500, 30));
// { interest: 0.041095, total: 10.041095, dailyCost: 0.001370 }
```

---

## Frequently Asked Questions

**Q: Is interest compounded?**
A: No. BitFlow uses simple interest only. Interest is not added to the principal.

**Q: When is interest paid?**
A: All at once, when you repay. There are no periodic interest payments.

**Q: Can the interest rate change after borrowing?**
A: No. The rate is fixed at the time of borrowing and stored on-chain.

**Q: What happens to interest if I'm liquidated?**
A: The liquidator pays the accumulated interest as part of the total debt.

**Q: Is there a minimum interest?**
A: Technically yes — due to integer division, very small loans for very short periods at low rates may round to 0 interest.

---

## Related Documentation

- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — How interest affects your health
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — When interest leads to liquidation
- [Quick Start Guide](QUICKSTART.md) — Getting started with BitFlow
- [Contracts Reference](CONTRACTS.md) — Technical function documentation
- [FAQ](FAQ.md) — Frequently asked questions
