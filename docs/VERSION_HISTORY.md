# Version History

> **Release history for the BitFlow Lend protocol.**

---

## v1.0.0 — Initial Release

**Date:** February 10, 2026  
**Contract:** `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`  
**Deployment TX:** `0xcbcdc451ddce9d53d2d0a4ba616ac09147b101fef41c1cd6cfe20978c49147d1`  
**Cost:** 0.14627 STX

### Features

- **Collateralized Lending**: Deposit STX and borrow against it at 150% minimum collateral ratio
- **Fixed Interest Rates**: Lock in rates at borrow time (1–10000 BPS, i.e., 0.01%–100% APR)
- **Flexible Terms**: Loan terms from 1 to 365 days
- **Simple Interest**: Transparent per-block interest accrual
- **Automated Liquidation**: Positions with health factor below 110% can be liquidated
- **Liquidator Incentives**: 5% bonus on seized collateral for liquidators
- **Protocol Stats**: On-chain tracking of deposits, repayments, and liquidations

### Public Functions

| Function | Description |
|----------|-------------|
| `deposit(amount)` | Deposit STX as collateral |
| `withdraw(amount)` | Withdraw unused collateral |
| `borrow(amount, rate, term)` | Take a fixed-rate loan |
| `repay()` | Repay loan with accrued interest |
| `liquidate(borrower)` | Liquidate undercollateralized position |
| `initialize()` | One-time contract initialization (owner only) |

### Read-Only Functions

| Function | Description |
|----------|-------------|
| `get-user-deposit` | Query deposit balance |
| `get-user-loan` | Query active loan details |
| `get-repayment-amount` | Calculate current repayment due |
| `calculate-health-factor` | Get position health percentage |
| `is-liquidatable` | Check if position can be liquidated |
| `get-max-borrow-amount` | Maximum borrowable amount |
| `calculate-required-collateral` | Minimum collateral for a borrow |
| `get-protocol-stats` | Protocol totals |
| `get-protocol-metrics` | Protocol age and activity |
| `get-volume-metrics` | Transaction volume data |
| `get-contract-version` | Returns "1.0.0" |
| `get-user-position-summary` | Combined position overview |

### Testing

- 63 test cases passing
- Comprehensive coverage of all functions
- Edge case validation
- Multi-user scenarios
- Interest calculation verification

### Verified Mainnet Transactions

- ✅ `deposit` — 1 STX deposited
- ✅ `borrow` — 0.01 STX at 10% for 30 days
- ✅ `repay` — Successful repayment
- ✅ `withdraw` — 0.8 STX withdrawn

---

## Frontend v1.0.0

**Date:** February 10, 2026  
**Stack:** React + TypeScript + Vite + Tailwind CSS

### Features

- Wallet connection (Leather, Xverse)
- Deposit and withdraw interface
- Borrow and repay forms
- Health factor monitoring
- Liquidation list
- Transaction history
- Protocol statistics dashboard
- Design system v2 with enhanced UI/UX

---

## Pre-Release Timeline

| Date | Milestone |
|------|-----------|
| Jan 2026 | Contract development and testing |
| Feb 1, 2026 | Testnet deployment and verification |
| Feb 10, 2026 | Mainnet deployment |
| Feb 10, 2026 | Frontend launch |

---

## Related Documentation

- [Changelog](CHANGELOG.md) — Detailed change log
- [Migration Guide](MIGRATION_GUIDE.md) — Upgrading between versions
- [Roadmap](ROADMAP.md) — Future plans
