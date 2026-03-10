# Quick Start Guide

> **Get from zero to your first deposit in 5 minutes.**

BitFlow Lend is a decentralized lending protocol on the Stacks blockchain. You deposit STX as collateral, borrow against it, and repay with interest — all without intermediaries.

**Mainnet Contract:** `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

---

## Prerequisites

Before you start, you need:

| Requirement | Where to Get It |
|---|---|
| Stacks wallet | [Leather Wallet](https://leather.io) or [Xverse](https://xverse.app) |
| STX tokens | Purchase on [OKX](https://okx.com), [Binance](https://binance.com), or [Gate.io](https://gate.io) |
| A modern browser | Chrome, Firefox, Brave, or Edge |

---

## Step 1: Connect Your Wallet (1 min)

1. Open the BitFlow Lend app in your browser
2. Click **"Connect Wallet"** in the top-right corner
3. Select your wallet provider (Leather or Xverse)
4. Approve the connection in the wallet popup
5. Your STX balance appears next to your address

> **Tip:** Make sure your wallet is set to **Mainnet**. If you see `ST...` addresses, you're on testnet.

**What you'll see after connecting:**

```
┌─────────────────────────────────────┐
│  Connected: SP1M4...G193            │
│  Balance: 10.50 STX                 │
│  [Disconnect]                       │
└─────────────────────────────────────┘
```

---

## Step 2: Make Your First Deposit (2 min)

1. Find the **"Deposit STX"** card on the dashboard
2. Enter the amount you want to deposit (e.g., `5`)
3. Click **"Deposit STX"**
4. Review the transaction in your wallet popup:
   - **Amount:** 5.000000 STX
   - **Contract:** `bitflow-vault-core`
   - **Function:** `deposit`
5. Click **"Confirm"** in your wallet
6. Wait for the transaction to confirm (~10 minutes, 1 block)

> **Important:** Your deposited STX becomes collateral. You'll need at least 150% collateral to borrow.

**After deposit, your dashboard shows:**

```
┌─────────────────────────────────────┐
│  Your Deposits                      │
│  ┌───────────────────────────┐      │
│  │ Deposited: 5.000000 STX   │      │
│  │ Available to borrow:      │      │
│  │   3.333333 STX (66.67%)   │      │
│  └───────────────────────────┘      │
└─────────────────────────────────────┘
```

---

## Step 3: Borrow Against Your Collateral (2 min)

1. Find the **"Borrow STX"** card
2. Enter the amount to borrow (must be ≤ 66.67% of your deposit)
3. Select a **loan term** (7, 30, 90, or 365 days)
4. Set an **interest rate** (e.g., 500 = 5% APR)
5. Click **"Borrow STX"**
6. Confirm the transaction in your wallet
7. The borrowed STX appears in your wallet balance

### Quick Example

| Your Deposit | Max Borrow | Safe Borrow (recommended) |
|---|---|---|
| 5 STX | 3.33 STX | 2.50 STX |
| 10 STX | 6.66 STX | 5.00 STX |
| 50 STX | 33.33 STX | 25.00 STX |

> **Safety tip:** Borrow less than 50% of your deposit to keep your health factor well above the 110% liquidation threshold.

---

## What Happens Next?

After your first borrow, you have an active loan. Here's what to know:

### Monitor Your Health Factor

Your health factor shows how safe your loan is:

| Health Factor | Status | Action |
|---|---|---|
| > 150% | Safe | No action needed |
| 110–150% | Warning | Consider repaying or adding collateral |
| < 110% | Danger | **Repay immediately** or risk liquidation |

### Repay Your Loan

When you're ready to repay:

1. Go to the **"Repay Loan"** card
2. Click **"Repay Full Amount"**
3. The total includes your principal + accrued interest
4. Confirm in your wallet
5. Your collateral is unlocked for withdrawal

### Withdraw Your Deposit

After repaying your loan (or if you never borrowed):

1. Go to the **"Deposit STX"** card
2. Enter the withdrawal amount
3. Click **"Withdraw"**
4. STX returns to your wallet

---

## Quick Reference

| Action | Requirement | Function Called |
|---|---|---|
| Deposit | Any amount > 0 | `deposit` |
| Withdraw | No active loan, sufficient balance | `withdraw` |
| Borrow | ≥ 150% collateral ratio, no existing loan | `borrow` |
| Repay | Active loan, sufficient wallet balance | `repay` |

---

## Common First-Timer Questions

**Q: What's the minimum deposit?**
A: Any amount greater than 0 STX.

**Q: Can I deposit more after my first deposit?**
A: Yes! Each deposit adds to your total collateral.

**Q: What if I only want to save, not borrow?**
A: That's fine — your STX sits safely in the vault. Withdraw anytime.

**Q: How long does a transaction take?**
A: About 10 minutes (1 Stacks block). You'll see a pending status until it confirms.

**Q: What are the fees?**
A: Zero protocol fees in Phase 1. You only pay standard Stacks network transaction fees (~0.001 STX).

---

## Next Steps

- [User Journey Guide](USER_JOURNEY.md) — Visual walkthrough of all flows
- [FAQ](FAQ.md) — Answers to common questions
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Keep your loan safe
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — Understand the risks
- [Troubleshooting](TROUBLESHOOTING.md) — Fix common issues

---

*Built on Stacks · Secured by Bitcoin · Open Source*

---

## Related Documentation

- [User Journey](USER_JOURNEY.md) — Visual flow guide
- [FAQ](FAQ.md) — Frequently asked questions
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
