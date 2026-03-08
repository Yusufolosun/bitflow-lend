# Monitoring Guide

> **How to monitor the BitFlow Lend protocol and user positions.**

---

## Position Monitoring

### Health Factor Monitoring

Monitor your position health to avoid liquidation. The health factor decreases as interest accrues.

```typescript
import { BitFlowClient } from './sdk';

async function monitorPosition(client: BitFlowClient, address: string) {
  const healthFactor = await client.getHealthFactor(address);
  const isLiquidatable = await client.isLiquidatable(address);

  if (isLiquidatable) {
    console.error('CRITICAL: Position is liquidatable!');
    // Send alert notification
    return 'critical';
  }

  if (healthFactor <= 120) {
    console.warn('WARNING: Health factor below 120%');
    return 'warning';
  }

  if (healthFactor <= 150) {
    console.info('NOTICE: Health factor below 150%');
    return 'notice';
  }

  return 'healthy';
}
```

### Automated Monitoring Loop

```typescript
const MONITOR_INTERVAL_MS = 60_000; // 1 minute

async function startMonitoring(client: BitFlowClient, address: string) {
  console.log(`Monitoring position for ${address}`);

  setInterval(async () => {
    try {
      const status = await monitorPosition(client, address);
      const timestamp = new Date().toISOString();

      if (status === 'critical') {
        await sendAlert(`[${timestamp}] LIQUIDATION RISK for ${address}`);
      } else if (status === 'warning') {
        await sendAlert(`[${timestamp}] Low health factor for ${address}`);
      }
    } catch (error) {
      console.error('Monitoring error:', error);
    }
  }, MONITOR_INTERVAL_MS);
}
```

### Alert Frequency by Risk Level

| Health Factor | Alert Level | Check Interval | Action |
|--------------|-------------|----------------|--------|
| > 200% | None | Every hour | No action needed |
| 150–200% | Info | Every 30 min | Monitor |
| 120–149% | Warning | Every 10 min | Consider adding collateral |
| 110–119% | Critical | Every minute | Add collateral or repay NOW |
| < 110% | Emergency | Continuous | Position is liquidatable |

---

## Protocol Monitoring

### Dashboard Metrics

```typescript
async function getProtocolDashboard(client: BitFlowClient) {
  const [stats, metrics, version] = await Promise.all([
    client.getProtocolStats(),
    client.read('get-protocol-metrics'),
    client.getVersion(),
  ]);

  return {
    version,
    totalDeposits: stats.totalDeposits / 1_000_000,
    totalRepaid: stats.totalRepaid / 1_000_000,
    totalLiquidations: stats.totalLiquidations / 1_000_000,
    protocolAgeDays: Math.floor(metrics.protocolAge / 144),
    lastActivityMinutes: Math.floor((metrics.timeSinceLastActivity * 10)),
  };
}
```

### Key Protocol Health Indicators

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Time since last activity | < 1 day | 1–7 days | > 7 days |
| Liquidation ratio | < 5% of deposits | 5–15% | > 15% |
| Active loans | Growing | Stable | Rapidly declining |

---

## Liquidation Monitoring

### Scan for Liquidation Opportunities

```typescript
async function scanForLiquidations(
  client: BitFlowClient,
  knownBorrowers: string[]
): Promise<string[]> {
  const liquidatable: string[] = [];

  for (const borrower of knownBorrowers) {
    try {
      const canLiquidate = await client.isLiquidatable(borrower);
      if (canLiquidate) {
        const repayment = await client.getRepaymentAmount(borrower);
        const deposit = await client.getUserDeposit(borrower);

        console.log(`Liquidatable: ${borrower}`);
        console.log(`  Debt: ${repayment.total / 1_000_000} STX`);
        console.log(`  Collateral: ${deposit / 1_000_000} STX`);
        console.log(`  Potential bonus: ${(deposit * 0.05) / 1_000_000} STX`);

        liquidatable.push(borrower);
      }
    } catch {
      // Borrower may not have a loan
    }
  }

  return liquidatable;
}
```

---

## Transaction Monitoring

### Track Transaction Status

```typescript
async function monitorTransaction(txId: string, apiUrl: string) {
  const maxWait = 30 * 60 * 1000; // 30 minutes
  const pollInterval = 15_000;     // 15 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);
    const data = await response.json();

    switch (data.tx_status) {
      case 'success':
        console.log(`TX ${txId} confirmed in block ${data.block_height}`);
        return { status: 'success', block: data.block_height };

      case 'abort_by_response':
        console.error(`TX ${txId} failed: contract error`);
        return { status: 'failed', reason: 'contract_error' };

      case 'abort_by_post_condition':
        console.error(`TX ${txId} failed: post-condition`);
        return { status: 'failed', reason: 'post_condition' };

      case 'pending':
        // Still waiting
        break;
    }

    await new Promise(r => setTimeout(r, pollInterval));
  }

  return { status: 'timeout' };
}
```

---

## Log Format

Standardized log format for monitoring systems:

```
[2026-02-10T14:30:00Z] [INFO] health_check address=SP_ALICE health_factor=185 status=healthy
[2026-02-10T14:30:00Z] [WARN] health_check address=SP_BOB health_factor=125 status=warning
[2026-02-10T14:30:00Z] [CRIT] health_check address=SP_CAROL health_factor=108 status=liquidatable
[2026-02-10T14:31:00Z] [INFO] protocol_stats deposits=1500.00 repaid=250.00 liquidations=10.00
[2026-02-10T14:31:00Z] [INFO] tx_confirmed txid=0xabc...def block=155000 function=deposit amount=10.00
```

---

## Explorer Monitoring

Use the Hiro Explorer to monitor the contract directly:

- **Contract page**: [View on Explorer](https://explorer.hiro.so/txid/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core?chain=mainnet)
- **Recent transactions**: Check the "Transactions" tab for all contract calls
- **Contract source**: Verify the deployed code matches expected version

---

## Related Documentation

- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Understanding health factor zones
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — Liquidation mechanics
- [Performance Tips](PERFORMANCE_TIPS.md) — Optimizing monitoring frequency
- [Network Config](NETWORK_CONFIG.md) — API endpoints for monitoring
- [SDK Documentation](SDK.md) — Client library for building monitors
