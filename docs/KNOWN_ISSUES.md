# Known Issues

> **Current limitations and known issues in BitFlow Lend v1.0.0 / v2.0.0.**

---

## Protocol Limitations

### Single Loan Per User

**Status**: By design  
**Impact**: Low

Users can only have one active loan at a time. To borrow again, you must repay the existing loan first.

**Workaround**: Use multiple wallets if you need concurrent loans (each with independent collateral).

---

### No Partial Repayment

**Status**: By design  
**Impact**: Medium

The `repay` function pays the full outstanding balance (principal + accrued interest). There is no option to make a partial payment.

**Workaround**: Repay the full loan, then immediately borrow a smaller amount if you want to reduce your position.

---

### Interest Rate Set at Borrow Time

**Status**: By design  
**Impact**: Low

Interest rates are fixed when the loan is created. If market rates change, existing loans retain their original rate.

**Workaround**: Repay and re-borrow to lock in a different rate (note: this resets the interest accrual timer).

---

### Block Time Assumption

**Status**: Known limitation  
**Impact**: Low

The contract assumes 10-minute blocks (144 blocks/day, 52,560 blocks/year). Actual block times may vary slightly.

**Effect**: Interest calculations may be marginally different from calendar-based expectations. Over short periods, the difference is negligible.

---

### No Collateral Withdrawal While Borrowing

**Status**: By design  
**Impact**: Medium

Users cannot withdraw deposited collateral while a loan is active, even if the withdrawal would leave sufficient collateral. The entire deposit is locked.

**Workaround**: Repay the loan, withdraw desired amount, then re-borrow.

---

### No Oracle Price Feed

**Status**: Resolved in v2.0.0
**Impact**: Low (single-asset protocol)

The v1 protocol does not use an external price oracle. The new `bitflow-oracle-registry` contract provides multi-source price feeds for v2 and beyond.

---

### Oracle Aggregation Uses Latest Submission

**Status**: Known limitation
**Impact**: Medium

The oracle registry updates the aggregated price to the latest valid reporter submission rather than computing a median across all fresh reporter prices. Clarity lacks sorting primitives, so a true median is non-trivial.

**Mitigation**: The deviation guard rejects outlier submissions, keeping the aggregate close to the true value.

---

### Staking Pool Cooldown Cannot Be Cancelled

**Status**: By design
**Impact**: Low

Once `request-unstake` is called, the cooldown timer runs for ~1 day (144 blocks). There is no cancel function.

**Workaround**: Simply wait for the cooldown to expire. If you change your mind, after the cooldown expires you can choose not to unstake and the staked balance remains earning rewards.

---

## Frontend Known Issues

### Transaction Status Delay

**Status**: Expected behavior  
**Impact**: Low

After submitting a transaction, the UI may take 10–20 minutes to reflect the new state. This is due to Stacks block confirmation times.

**Workaround**: Check the transaction on the [Hiro Explorer](https://explorer.hiro.so) for real-time status.

---

### Wallet Disconnect on Page Refresh

**Status**: Browser limitation  
**Impact**: Low

Some wallet extensions require re-authentication after a page refresh.

**Workaround**: Click "Connect Wallet" again after refreshing.

---

## Resolved Issues

| Issue | Version Fixed | Description |
|-------|--------------|-------------|
| NaN display in UI | v1.0.0 | Fixed NaN values when no loan is active |
| TypeScript errors | v1.0.0 | Resolved 9 type errors in frontend |
| v2 withdraw/borrow scope | v2.0.0 | Fixed as-contract scope sending STX to wrong address |
| v2 interest on zero blocks | v2.0.0 | Fixed ceiling division returning ≥1 for zero elapsed blocks |
| Console log pollution | v2.0.0 | Removed all console.log/error from production frontend |

---

## Reporting Issues

If you discover a new issue:

1. Check this document and [Troubleshooting](TROUBLESHOOTING.md) first
2. Search existing [GitHub Issues](https://github.com/Yusufolosun/bitflow-lend/issues)
3. If not found, open a new issue with:
   - Steps to reproduce
   - Expected vs. actual behavior
   - Browser and wallet version
   - Transaction ID (if applicable)

---

## Related Documentation

- [Troubleshooting](TROUBLESHOOTING.md) — Solutions for common problems
- [FAQ](FAQ.md) — Frequently asked questions
- [Roadmap](ROADMAP.md) — Planned improvements
