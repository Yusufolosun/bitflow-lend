# Known Issues

> **Current limitations and known issues in BitFlow Lend v1.0.0.**

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

**Status**: v1.0.0 limitation  
**Impact**: Low (single-asset protocol)

The protocol does not use an external price oracle. Collateral and loans are both denominated in STX, so price fluctuations between assets are not a concern.

**Future**: Multi-asset support would require oracle integration.

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
