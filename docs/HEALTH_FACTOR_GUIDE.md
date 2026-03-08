# Health Factor Guide

> **Your complete guide to understanding, calculating, and managing your health factor.**

The health factor is the single most important number to monitor when you have an active loan on BitFlow Lend. It determines whether your position is safe or at risk of liquidation.

---

## What Is the Health Factor?

The health factor is a ratio that measures how well your collateral (deposit) covers your debt (loan + interest). It's expressed as a percentage:

```
                    deposit value
Health Factor = ─────────────────── × 100
                    total debt
```

A health factor of 150% means your collateral is worth 1.5x your total debt. The higher the health factor, the safer your position.

---

## Health Factor Zones

| Zone | Range | Color | What It Means | Action Required |
|---|---|---|---|---|
| Safe | > 150% | Green | Well-collateralized | None — you're good |
| Warning | 110% – 150% | Amber | Buffer is shrinking | Monitor closely, consider adding collateral |
| Danger | < 110% | Red | Liquidation possible | **Repay immediately** or add collateral |

### Visual Scale

```
  0%          50%         110%        150%        200%        300%+
  ├───────────┼────────────┤───────────┤───────────┤───────────┤
  │        DANGER          │  WARNING  │       SAFE            │
  │   Liquidation zone     │  Monitor  │   No action needed    │
  │   (red)                │  (amber)  │   (green)             │
  └────────────────────────┴───────────┴───────────────────────┘
```

---

## How It Changes Over Time

Your health factor can decrease for two reasons:

### 1. Interest Accrual (Gradual)

As interest accumulates on your loan, your total debt increases, which lowers the health factor.

```
  Health Factor
  300% ┤
       │  ●
  250% ┤    ●
       │       ●
  200% ┤          ●
       │             ●
  150% ┤─ ─ ─ ─ ─ ─ ─ ─●─ ─ ─ ─ ─  (minimum borrow requirement)
       │                   ●
  110% ┤─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ●─ ─  (liquidation threshold)
       │                       ●
       ├───┬───┬───┬───┬───┬───┬───
       0   30  60  90  120 150 180  days
```

The rate of decline depends on your interest rate and how much you borrowed.

### 2. Adding Collateral (Increase)

Depositing more STX increases the numerator, raising your health factor:

```
  Health Factor
  300% ┤
       │
  250% ┤      ● (deposit more STX)
       │      ↑
  200% ┤      │
       │  ●───┘
  150% ┤    (health was declining)
       │
  110% ┤
       ├───┬───┬───
       0   15  30    days
```

---

## Health Factor by Borrow Ratio

This table shows your starting health factor based on how much you borrow:

| Deposit | Borrow | Borrow Ratio | Starting Health Factor | Safety Rating |
|---|---|---|---|---|
| 10 STX | 2 STX | 20% | 500% | Excellent |
| 10 STX | 3.33 STX | 33% | 300% | Very Safe |
| 10 STX | 5 STX | 50% | 200% | Safe |
| 10 STX | 6 STX | 60% | 166.7% | Moderate |
| 10 STX | 6.67 STX | 66.67% | 150% | Risky (minimum) |

**Recommendation:** Target a starting health factor of at least 200% (50% borrow ratio) to leave room for interest accrual.

---

## Monitoring Strategies

### Strategy 1: Dashboard Monitoring

The BitFlow dashboard shows your health factor in real-time on the Health Monitor card:

- **Green indicator:** You're safe (> 150%)
- **Amber indicator:** You should pay attention (110%–150%)
- **Red indicator:** Immediate action required (< 110%)

### Strategy 2: Direct Contract Query

For programmatic monitoring, call the read-only function:

```typescript
import { callReadOnlyFunction, uintCV, principalCV } from '@stacks/transactions';

const healthFactor = await callReadOnlyFunction({
  contractAddress: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
  contractName: 'bitflow-vault-core',
  functionName: 'calculate-health-factor',
  functionArgs: [
    principalCV('SP...YOUR_ADDRESS'),
    uintCV(1000000) // STX price in micro units
  ],
  senderAddress: 'SP...YOUR_ADDRESS',
  network: 'mainnet',
});
```

### Strategy 3: Monitoring Schedule

| Health Factor | Check Frequency | Rationale |
|---|---|---|
| > 200% | Weekly | Large buffer, slow decline |
| 150–200% | Every 2–3 days | Moderate buffer |
| 130–150% | Daily | Warning zone, act soon |
| 110–130% | Every few hours | Near liquidation |
| < 110% | **Act immediately** | Liquidatable now |

### Strategy 4: Set Personal Alerts

While BitFlow doesn't have built-in alerts (planned for Phase 3), you can:

1. Set calendar reminders to check your health factor
2. Write a simple script that queries the contract and sends a notification
3. Use a blockchain monitoring service that watches your address

---

## Improving Your Health Factor

### Option 1: Deposit More Collateral

Adding more STX to your deposit directly increases your health factor.

**Before:** Deposit 15 STX, Debt 10 STX → Health = 150%
**Action:** Deposit 5 more STX
**After:** Deposit 20 STX, Debt 10 STX → Health = 200%

Each additional STX deposited raises your health factor proportionally.

### Option 2: Repay Your Loan

Repaying eliminates your debt entirely (BitFlow doesn't support partial repayment in v1):

**Before:** Deposit 15 STX, Debt 10.5 STX → Health = 142.9%
**Action:** Repay (10.5 STX + interest)
**After:** Deposit 15 STX, Debt 0 → No loan, infinite health factor

### Which Is Better?

| Situation | Best Action | Why |
|---|---|---|
| Health > 130% | Add collateral | Buys time without closing position |
| Health 110–130% | Repay if possible | Eliminates risk entirely |
| Health < 110% | Repay immediately | You're already liquidatable |
| Have STX in wallet | Either works | Choose based on preference |
| No STX in wallet | Buy/transfer STX, then repay | Urgent action needed |

---

## Manual Calculation

Step-by-step examples for calculating your health factor by hand.

### The Formula

```
                    deposit (microSTX) × price × 100
Health Factor = ──────────────────────────────────────
                         loan amount (microSTX)
```

In the contract, price is a scaling factor. When price = 100 (1:1 ratio), the formula simplifies to:

```
                    deposit × 100
Health Factor = ─────────────────
                   loan amount
```

### Example 1: Basic Calculation

**Given:**
- Deposit: 15 STX (15,000,000 microSTX)
- Loan: 10 STX (10,000,000 microSTX)
- No interest accrued yet

**Calculation:**
```
Health Factor = (15,000,000 × 100) / 10,000,000
              = 1,500,000,000 / 10,000,000
              = 150
              → 150%
```

**Interpretation:** Exactly at the minimum collateral ratio. Safe from liquidation (> 110%) but no margin for error.

### Example 2: With Interest Accrual

**Given:**
- Deposit: 20 STX (20,000,000 microSTX)
- Original loan: 10 STX (10,000,000 microSTX)
- Interest rate: 500 basis points (5% APR)
- Time elapsed: 60 days (8,640 blocks)

**Step 1 — Calculate interest:**
```
interest = principal × rate × blocks / (100 × 52,560)
         = 10,000,000 × 500 × 8,640 / (100 × 52,560)
         = 43,200,000,000,000 / 5,256,000
         = 8,219,178 microSTX
         ≈ 0.082 STX
```

**Step 2 — Calculate total debt:**
```
total debt = 10,000,000 + 82,191 = 10,082,191 microSTX
```

**Step 3 — Calculate health factor:**
```
Health Factor = (20,000,000 × 100) / 10,082,191
              = 2,000,000,000 / 10,082,191
              ≈ 198.4
              → 198.4%
```

**Interpretation:** Still very safe. The 60 days of interest only reduced health from 200% to 198.4%.

### Example 3: Finding the Liquidation Point

**Question:** With 20 STX deposit and 10 STX borrow at 5% APR, after how many days does health factor reach 110%?

**Setup:** We need `deposit × 100 / debt = 110`

```
110 = (20,000,000 × 100) / (10,000,000 + interest)

Solving for total debt:
total debt = 2,000,000,000 / 110
           = 18,181,818 microSTX

So interest must reach:
interest = 18,181,818 - 10,000,000
         = 8,181,818 microSTX (≈ 8.18 STX)
```

**Finding the time:**
```
8,181,818 = 10,000,000 × 500 × blocks / (100 × 52,560)

blocks = 8,181,818 × 5,256,000 / (10,000,000 × 500)
       = 43,003,636,608,000 / 5,000,000,000
       = 8,600 blocks

days = 8,600 / 144 ≈ 59.7 days... 

Wait — that's only ~60 days? Let me recheck.

Actually with deposit 20 STX and borrow 10 STX, starting HF = 200%.
At 5% APR, annual interest = 0.5 STX on 10 STX.
To drop from 200% to 110%:
  debt must reach: 20/1.1 = 18.18 STX
  interest needed: 18.18 - 10 = 8.18 STX
  at 5% APR: 8.18 / (10 × 0.05) = 16.36 years

Actually it would take over 16 years — the position is very safe.
```

**Correct calculation with proper units:**
```
interest per year = 10,000,000 × 500 / (100 × 100)
                  = 500,000 microSTX (0.5 STX/year)
                  
years to reach 110% = 8.18 STX / 0.5 STX/year = 16.36 years

At 5% APR with a 200% starting health, it would take over 16 years 
of interest accrual to reach the liquidation threshold.
```

**Lesson:** Conservative borrowing (50% ratio) with low rates creates enormous safety margins.

### Example 4: How Much Can I Borrow Safely?

**Given:**
- Deposit: 25 STX
- Target health factor: 200% (safe buffer)

**Calculation:**
```
200 = (25,000,000 × 100) / loan
loan = 2,500,000,000 / 200
loan = 12,500,000 microSTX
loan = 12.5 STX
```

**Answer:** Borrow up to 12.5 STX to start with a 200% health factor.

For comparison:
- Maximum borrow (150%): 25 / 1.5 = 16.67 STX
- Safe borrow (200%): 25 / 2.0 = 12.50 STX
- Very safe borrow (250%): 25 / 2.5 = 10.00 STX

### Example 5: How Much Collateral to Add?

**Given:**
- Current deposit: 15 STX
- Current debt: 12 STX (principal + interest)
- Current health: 125% (warning zone)
- Target health: 200%

**Calculation:**
```
200 = ((15,000,000 + X) × 100) / 12,000,000

Solving for X:
1,500,000,000 + 100X = 2,400,000,000
100X = 900,000,000
X = 9,000,000 microSTX
X = 9 STX
```

**Answer:** Deposit 9 more STX to reach a health factor of 200%.

### Quick Reference Formulas

| What You Want | Formula |
|---|---|
| Health Factor | `deposit × 100 / debt` |
| Max Borrow (150%) | `deposit / 1.5` |
| Safe Borrow (200%) | `deposit / 2.0` |
| Collateral needed for target HF | `(target_HF × debt / 100) - current_deposit` |
| Daily interest (microSTX) | `principal × rate / (100 × 365 × 100)` |
| Days until HF reaches threshold | Complex — use the interest formula above |

---

## Related Documentation

- [Liquidation Guide](LIQUIDATION_GUIDE.md) — What happens at liquidation
- [Interest Calculator](INTEREST_CALCULATOR.md) — How interest affects your health
- [Quick Start Guide](QUICKSTART.md) — Getting started with BitFlow
- [Safety Best Practices](SAFETY.md) — Keep your funds safe
- [FAQ](FAQ.md) — Frequently asked questions
