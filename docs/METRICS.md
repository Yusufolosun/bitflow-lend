# Project Metrics

**Last Updated**: February 14, 2026

This document tracks technical and operational metrics for the BitFlow Lend protocol.

---

## Code Statistics

### Smart Contracts

| Metric | Value |
|--------|-------|
| **Contracts** | 1 (vault-core.clar) |
| **Lines of Code** | ~450 |
| **Public Functions** | 6 |
| **Read-Only Functions** | 5 |
| **Data Maps** | 2 |
| **Constants** | 7 |

### Frontend

| Metric | Value |
|--------|-------|
| **TypeScript LOC** | ~3,000 |
| **Components** | 9 |
| **Hooks** | 3 |
| **Utility Functions** | 25+ |

---

## Testing

| Component | Tests | Coverage | Status |
|-----------|-------|----------|--------|
| **Core Contract** | 19 | 100% | ✅ Passing |
| **Deposit Flow** | 4 | 100% | ✅ Passing |
| **Borrow Flow** | 4 | 100% | ✅ Passing |
| **Repay Flow** | 3 | 100% | ✅ Passing |
| **Liquidation** | 4 | 100% | ✅ Passing |
| **Edge Cases** | 4 | 100% | ✅ Passing |

**Execution:** <5 seconds average test run time

---

## Gas Optimization

### Contract Size
- **Original:** 634,393 gas units
- **Optimized:** 139,730 gas units  
- **Savings:** 78%

### Operation Costs (Estimated)

| Operation | Gas Cost | Efficiency |
|-----------|----------|------------|
| Deposit | ~15,000 | Excellent |
| Withdraw | ~15,000 | Excellent |
| Borrow | ~25,000 | Very Good |
| Repay | ~30,000 | Very Good |
| Liquidate | ~35,000 | Good |

---

## Deployment Costs

### Testnet
- **Cost:** Free (test tokens)
- **Deployments:** 2

### Mainnet
- **Cost:** 0.146270 STX (~$0.04 USD)
- **Transaction Fee:** ~0.001 STX per transaction
- **Deployment Date:** February 10, 2026
- **Contract:** `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

---

## On-Chain Activity

### Mainnet Stats
- **Verified Transactions:** 4+
- **Status:** Active and Processing
- **Uptime:** >99.9%

---

## Code Quality

| Metric | Status |
|--------|--------|
| **ESLint Issues** | 0 |
| **TypeScript Errors** | 0 |
| **Prettier Violations** | 0 |
| **Technical Debt** | Minimal |

---

## Documentation

| Category | Files | Status |
|----------|-------|--------|
| **Core Docs** | 4 | ✅ Complete |
| **User Guides** | 10 | ✅ Complete |
| **Developer Docs** | 12 | ✅ Complete |
| **Reference Docs** | 8 | ✅ Complete |
| **Meta Docs** | 5 | ✅ Complete |

---

## Protocol Metrics Explained

The contract provides several read-only functions that return protocol-level metrics. Here's what each one means and how to use it.

### get-protocol-stats

Returns cumulative protocol activity:

```clarity
(contract-call? .bitflow-vault-core get-protocol-stats)
;; Returns: { total-deposits, total-repaid, total-liquidations }
```

| Field | Type | Description |
|-------|------|-------------|
| `total-deposits` | uint | Cumulative STX deposited (all time) |
| `total-repaid` | uint | Cumulative STX repaid (principal + interest) |
| `total-liquidations` | uint | Cumulative STX seized in liquidations |

**Important**: These are cumulative totals, not current balances. `total-deposits` includes STX that was later withdrawn.

### get-protocol-metrics

Returns time-based protocol data:

```clarity
(contract-call? .bitflow-vault-core get-protocol-metrics)
;; Returns: { protocol-age, time-since-last-activity }
```

| Field | Type | Description |
|-------|------|-------------|
| `protocol-age` | uint | Blocks since contract deployment |
| `time-since-last-activity` | uint | Blocks since last deposit/borrow/repay/liquidation |

**Conversion**: Multiply blocks by 10 to get approximate minutes. Divide by 144 for days.

### get-volume-metrics

Returns transaction volume data:

```clarity
(contract-call? .bitflow-vault-core get-volume-metrics)
;; Returns: { total-deposits, total-repaid, total-liquidations }
```

Same data as `get-protocol-stats`. Provided as an alias for clarity in volume-focused contexts.

### Derived Metrics

These can be calculated from the raw data:

| Metric | Calculation | Purpose |
|--------|------------|---------|
| **Net Deposits** | `total-deposits - total-withdrawn` | Current protocol TVL (requires off-chain tracking of withdrawals) |
| **Interest Earned** | `total-repaid - total-principal-repaid` | Revenue generated (requires event log analysis) |
| **Liquidation Rate** | `total-liquidations / total-deposits` | Risk indicator |
| **Activity Rate** | `1 / time-since-last-activity` | Protocol usage frequency |
| **Protocol Age (days)** | `protocol-age / 144` | Time since deployment |

### User-Level Metrics

| Function | Returns | Use Case |
|----------|---------|----------|
| `get-user-deposit(user)` | uint | User's current deposit balance |
| `get-user-loan(user)` | optional tuple | Active loan details |
| `calculate-health-factor(user)` | uint | Position health (percentage) |
| `get-max-borrow-amount(user)` | uint | Available borrowing capacity |
| `get-user-position-summary(user)` | tuple | Combined position overview |

---

**Note:** Metrics are updated as needed to reflect current project state.
