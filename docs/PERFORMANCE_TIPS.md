# Performance Tips

> **Optimize your interaction with the BitFlow Lend protocol.**

---

## Transaction Optimization

### Batch Deposits

Multiple small deposits cost more gas than a single large deposit. Combine amounts before depositing.

```
❌ Inefficient:
  deposit(1_000_000)  → ~0.01 STX gas
  deposit(1_000_000)  → ~0.01 STX gas
  deposit(1_000_000)  → ~0.01 STX gas
  Total gas: ~0.03 STX

✅ Efficient:
  deposit(3_000_000)  → ~0.01 STX gas
  Total gas: ~0.01 STX
```

### Use Read-Only Functions Before Transacting

Read-only calls are free. Always check state before submitting a transaction:

```typescript
// Free: check before you pay gas
const maxBorrow = await client.getMaxBorrow(address);
const healthFactor = await client.getHealthFactor(address);

// Only transact if conditions are met
if (borrowAmount <= maxBorrow) {
  await client.borrow(borrowAmount, rate, term);
}
```

### Repay Early to Save Interest

Interest accrues every block. Repaying earlier means less total interest:

| Borrow | Rate | 30 Days Interest | 7 Days Interest | Savings |
|--------|------|------------------|-----------------|---------|
| 10 STX | 5% | 0.041 STX | 0.0096 STX | 0.031 STX |
| 10 STX | 10% | 0.082 STX | 0.019 STX | 0.063 STX |
| 100 STX | 5% | 0.41 STX | 0.096 STX | 0.314 STX |

---

## Frontend Performance

### Minimize API Calls

Cache read-only results and poll at reasonable intervals:

```typescript
// Poll every 30 seconds instead of every render
const POLL_INTERVAL = 30_000;

useEffect(() => {
  const interval = setInterval(async () => {
    const stats = await client.getProtocolStats();
    setStats(stats);
  }, POLL_INTERVAL);
  return () => clearInterval(interval);
}, []);
```

### Debounce Input Calculations

For real-time interest previews, debounce the calculation:

```typescript
import { useMemo } from 'react';
import { useDebouncedValue } from './hooks';

function BorrowForm() {
  const [amount, setAmount] = useState(0);
  const debouncedAmount = useDebouncedValue(amount, 300);

  const estimatedInterest = useMemo(() => {
    if (debouncedAmount <= 0) return 0;
    return calculateInterest(debouncedAmount, rate, term);
  }, [debouncedAmount, rate, term]);
}
```

### Lazy Load Components

Only load heavy components when needed:

```typescript
const LiquidationList = lazy(() => import('./components/LiquidationList'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));
```

---

## Gas Optimization

### Transaction Fee Strategy

| Network State | Recommended Fee | Strategy |
|--------------|-----------------|----------|
| Low congestion | Default | Submit normally |
| Medium congestion | 1.5× default | Slightly higher fee for faster confirmation |
| High congestion | Wait | Non-urgent transactions can wait for lower fees |

### Avoid Unnecessary Transactions

| Action | Transaction Needed? | Alternative |
|--------|-------------------|-------------|
| Check balance | No | Use `get-user-deposit` (free) |
| Check loan status | No | Use `get-user-loan` (free) |
| Preview interest | No | Use `get-repayment-amount` (free) |
| Check health | No | Use `calculate-health-factor` (free) |
| Deposit | Yes | Batch into one call |
| Withdraw | Yes | Full amount in one call |
| Borrow | Yes | — |
| Repay | Yes | — |

---

## Monitoring Performance

### Key Metrics to Track

```typescript
// Track transaction confirmation times
const startTime = Date.now();
const txResult = await submitTransaction(tx);
const confirmTime = Date.now() - startTime;
console.log(`TX confirmed in ${confirmTime / 1000}s`);
```

### Health Factor Monitoring Frequency

| Risk Level | Health Factor | Check Frequency |
|-----------|--------------|-----------------|
| Very Safe | > 200% | Daily |
| Safe | 150–200% | Every 12 hours |
| Warning | 120–149% | Every 2 hours |
| Critical | 110–119% | Every 30 minutes |
| Danger | < 110% | Immediate action |

---

## Related Documentation

- [SDK Documentation](SDK.md) — Efficient API usage
- [Integration Guide](INTEGRATION.md) — Framework-specific optimizations
- [Known Issues](KNOWN_ISSUES.md) — Current limitations
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Monitoring strategies
