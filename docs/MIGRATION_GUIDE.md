# Migration Guide

> **How to migrate between BitFlow Lend protocol versions.**

This guide helps developers update their integration when the contract is upgraded.

---

## Version History

| Version | Date | Key Changes |
|---------|------|-------------|
| 1.0.0 | Feb 10, 2026 | Initial mainnet deployment |

---

## General Migration Process

### 1. Review the Changelog

Before migrating, review the [Changelog](CHANGELOG.md) for:

- **Breaking changes** — Functions renamed, parameters changed, or removed
- **New features** — Additional functions or read-only endpoints
- **Bug fixes** — Behavior changes that may affect your integration
- **Deprecations** — Features scheduled for removal in future versions

### 2. Update Contract Address

New contract deployments result in a new contract address. Update all references:

```typescript
// Before (v1.0.0)
const CONTRACT_ADDRESS = 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193';
const CONTRACT_NAME = 'bitflow-vault-core';

// After (hypothetical v2.0.0)
const CONTRACT_ADDRESS = 'SP_NEW_DEPLOYER_ADDRESS';
const CONTRACT_NAME = 'bitflow-vault-core-v2';
```

### 3. Update Function Calls

Check if any function signatures changed:

```typescript
// Review all contract interactions
const FUNCTIONS_USED = [
  'deposit',        // Check parameters
  'withdraw',       // Check parameters
  'borrow',         // Check parameters
  'repay',          // Check parameters
  'liquidate',      // Check parameters
  'get-user-deposit',
  'get-user-loan',
  'get-repayment-amount',
  'calculate-health-factor',
  'is-liquidatable',
  'get-max-borrow-amount',
  'calculate-required-collateral',
  'get-protocol-stats',
];
```

### 4. Test on Testnet

Always deploy and test against the new contract on testnet before switching mainnet:

```bash
# Deploy new version to testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml

# Run integration tests
npm test
```

### 5. Coordinate Transition

For applications with active users:

1. **Notify users** in advance about the migration timeline
2. **Pause new operations** during the migration window (if applicable)
3. **Guide users** to withdraw from the old contract and re-deposit in the new one
4. **Update frontend** to point to the new contract
5. **Monitor** for issues after the switch

---

## Data Migration

### On-Chain State

Clarity contracts are immutable once deployed. A new version means a new contract with empty state. Users must:

1. **Repay** any active loans on the old contract
2. **Withdraw** all deposits from the old contract
3. **Deposit** into the new contract
4. **Re-borrow** if needed (under new terms)

### No Automatic Migration

There is no built-in mechanism to migrate balances between contract versions. Each version starts with fresh state. This is a deliberate security decision — it prevents unauthorized state manipulation.

### Migration Helper Script

```typescript
import { BitFlowClient } from './sdk';
import { StacksMainnet } from '@stacks/network';

const oldClient = new BitFlowClient({
  contractAddress: 'SP_OLD_ADDRESS',
  contractName: 'bitflow-vault-core',
  network: new StacksMainnet(),
});

const newClient = new BitFlowClient({
  contractAddress: 'SP_NEW_ADDRESS',
  contractName: 'bitflow-vault-core-v2',
  network: new StacksMainnet(),
});

async function checkMigrationReadiness(userAddress: string) {
  const deposit = await oldClient.getUserDeposit(userAddress);
  const loan = await oldClient.getUserLoan(userAddress);

  console.log('Old contract state:');
  console.log(`  Deposit: ${deposit / 1_000_000} STX`);

  if (loan) {
    const repayment = await oldClient.getRepaymentAmount(userAddress);
    console.log(`  Active loan: ${loan.amount / 1_000_000} STX`);
    console.log(`  Must repay: ${repayment.total / 1_000_000} STX before migrating`);
    return false;
  }

  console.log('  Ready to migrate!');
  return true;
}
```

---

## Handling Breaking Changes

### Function Signature Changes

If a function's parameters change, update the call site:

```typescript
// v1.0.0: borrow(amount, rate, termDays)
functionArgs: [uintCV(amount), uintCV(rate), uintCV(termDays)]

// Hypothetical v2.0.0: borrow(amount, rate, termDays, collateralType)
functionArgs: [uintCV(amount), uintCV(rate), uintCV(termDays), stringAsciiCV('STX')]
```

### Response Format Changes

If a read-only function returns a different structure:

```typescript
// v1.0.0
interface LoanV1 {
  amount: number;
  'interest-rate': number;
  'start-block': number;
  'term-end': number;
}

// Hypothetical v2.0.0
interface LoanV2 {
  amount: number;
  'interest-rate': number;
  'start-block': number;
  'term-end': number;
  'collateral-type': string;
  'last-updated': number;
}
```

### Multi-Version Support

If you need to support both old and new contracts during a transition:

```typescript
class BitFlowMultiVersionClient {
  private v1: BitFlowClient;
  private v2: BitFlowClient;

  constructor() {
    this.v1 = new BitFlowClient({ /* v1 config */ });
    this.v2 = new BitFlowClient({ /* v2 config */ });
  }

  async getUserDeposit(address: string): Promise<number> {
    const [v1Deposit, v2Deposit] = await Promise.all([
      this.v1.getUserDeposit(address),
      this.v2.getUserDeposit(address),
    ]);
    return v1Deposit + v2Deposit;
  }
}
```

---

## Rollback Plan

If a migration fails:

1. **Keep old contract references** available in configuration
2. **Feature flag** the contract version in your application
3. **Revert** the frontend to the old contract address
4. **Communicate** with users about the delay

```typescript
const FEATURE_FLAGS = {
  useV2Contract: false, // Toggle this for rollback
};

const config = FEATURE_FLAGS.useV2Contract
  ? CONTRACT_CONFIG_V2
  : CONTRACT_CONFIG_V1;
```

---

## Related Documentation

- [Changelog](CHANGELOG.md) — Version history and changes
- [Deployment Guide](DEPLOYMENT.md) — Deployment procedures
- [Network Config](NETWORK_CONFIG.md) — Network settings
- [SDK Documentation](SDK.md) — Client library usage
