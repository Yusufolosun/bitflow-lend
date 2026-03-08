# SDK Documentation

> **Using the Stacks SDK to interact with the BitFlow Lend protocol.**

This guide covers installation, initialization, and usage patterns for the `@stacks/transactions` and `@stacks/connect` packages when working with the BitFlow vault contract.

---

## Installation

```bash
npm install @stacks/transactions @stacks/connect @stacks/network
```

### Package Versions

| Package | Minimum Version | Purpose |
|---------|----------------|---------|
| `@stacks/transactions` | 6.13.0 | Build & sign transactions |
| `@stacks/connect` | 7.x | Wallet integration |
| `@stacks/network` | 6.x | Network configuration |

---

## Initialization

### Network Setup

```typescript
import { StacksMainnet, StacksTestnet } from '@stacks/network';

// Mainnet
const mainnet = new StacksMainnet();

// Testnet (for development)
const testnet = new StacksTestnet();
```

### Contract Configuration

```typescript
const CONTRACT_CONFIG = {
  mainnet: {
    address: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
    name: 'bitflow-vault-core',
    network: new StacksMainnet(),
  },
  testnet: {
    address: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    name: 'bitflow-vault-core',
    network: new StacksTestnet(),
  },
};

const config = CONTRACT_CONFIG.mainnet; // or .testnet
```

---

## Methods

### Write Operations

All write operations require wallet authentication via `@stacks/connect`.

#### deposit

Deposit STX as collateral.

```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV, PostConditionMode, makeStandardSTXPostCondition, FungibleConditionCode } from '@stacks/transactions';

async function deposit(amount: number, senderAddress: string) {
  await openContractCall({
    contractAddress: config.address,
    contractName: config.name,
    functionName: 'deposit',
    functionArgs: [uintCV(amount)],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.Equal,
        amount
      ),
    ],
    onFinish: (data) => {
      console.log('TX ID:', data.txId);
    },
    onCancel: () => {
      console.log('User cancelled');
    },
  });
}

// Deposit 10 STX
deposit(10_000_000, 'SP...');
```

#### withdraw

Withdraw deposited STX.

```typescript
async function withdraw(amount: number) {
  await openContractCall({
    contractAddress: config.address,
    contractName: config.name,
    functionName: 'withdraw',
    functionArgs: [uintCV(amount)],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish: (data) => console.log('TX ID:', data.txId),
  });
}
```

#### borrow

Borrow against deposited collateral.

```typescript
async function borrow(amount: number, rateBPS: number, termDays: number) {
  await openContractCall({
    contractAddress: config.address,
    contractName: config.name,
    functionName: 'borrow',
    functionArgs: [
      uintCV(amount),
      uintCV(rateBPS),
      uintCV(termDays),
    ],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [],
    onFinish: (data) => console.log('TX ID:', data.txId),
  });
}

// Borrow 5 STX at 5% APR for 30 days
borrow(5_000_000, 500, 30);
```

#### repay

Repay an active loan (principal + accrued interest).

```typescript
async function repay(senderAddress: string, estimatedTotal: number) {
  await openContractCall({
    contractAddress: config.address,
    contractName: config.name,
    functionName: 'repay',
    functionArgs: [],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.LessEqual,
        estimatedTotal
      ),
    ],
    onFinish: (data) => console.log('TX ID:', data.txId),
  });
}
```

#### liquidate

Liquidate an undercollateralized position.

```typescript
import { principalCV } from '@stacks/transactions';

async function liquidate(borrowerAddress: string, senderAddress: string, debtAmount: number) {
  await openContractCall({
    contractAddress: config.address,
    contractName: config.name,
    functionName: 'liquidate',
    functionArgs: [principalCV(borrowerAddress)],
    postConditionMode: PostConditionMode.Deny,
    postConditions: [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.LessEqual,
        debtAmount
      ),
    ],
    onFinish: (data) => console.log('TX ID:', data.txId),
  });
}
```

---

### Read Operations

Read-only functions do not require wallet authentication.

```typescript
import { callReadOnlyFunction, cvToValue, principalCV } from '@stacks/transactions';

async function readContract(functionName: string, args: any[] = []) {
  const result = await callReadOnlyFunction({
    contractAddress: config.address,
    contractName: config.name,
    functionName,
    functionArgs: args,
    senderAddress: config.address,
    network: config.network,
  });
  return cvToValue(result);
}
```

#### Get User Deposit

```typescript
async function getUserDeposit(address: string): Promise<number> {
  return readContract('get-user-deposit', [principalCV(address)]);
}
```

#### Get User Loan

```typescript
interface LoanData {
  amount: number;
  'interest-rate': number;
  'start-block': number;
  'term-end': number;
}

async function getUserLoan(address: string): Promise<LoanData | null> {
  const result = await readContract('get-user-loan', [principalCV(address)]);
  return result || null;
}
```

#### Get Repayment Amount

```typescript
async function getRepaymentAmount(address: string) {
  return readContract('get-repayment-amount', [principalCV(address)]);
}
```

#### Get Health Factor

```typescript
async function getHealthFactor(address: string): Promise<number> {
  return readContract('calculate-health-factor', [principalCV(address)]);
}
```

#### Check Liquidatable

```typescript
async function isLiquidatable(address: string): Promise<boolean> {
  return readContract('is-liquidatable', [principalCV(address)]);
}
```

#### Get Max Borrow Amount

```typescript
async function getMaxBorrow(address: string): Promise<number> {
  return readContract('get-max-borrow-amount', [principalCV(address)]);
}
```

#### Get Protocol Stats

```typescript
async function getProtocolStats() {
  return readContract('get-protocol-stats');
}
```

#### Get Contract Version

```typescript
async function getContractVersion(): Promise<string> {
  return readContract('get-contract-version');
}
```

---

## Complete Client Class

```typescript
import {
  callReadOnlyFunction,
  cvToValue,
  principalCV,
  uintCV,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  PostConditionMode,
} from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';

interface BitFlowConfig {
  contractAddress: string;
  contractName: string;
  network: any;
}

export class BitFlowClient {
  private config: BitFlowConfig;

  constructor(config: BitFlowConfig) {
    this.config = config;
  }

  // --- Read-only methods ---

  private async read(fn: string, args: any[] = []) {
    const result = await callReadOnlyFunction({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: fn,
      functionArgs: args,
      senderAddress: this.config.contractAddress,
      network: this.config.network,
    });
    return cvToValue(result);
  }

  async getUserDeposit(address: string): Promise<number> {
    return this.read('get-user-deposit', [principalCV(address)]);
  }

  async getUserLoan(address: string) {
    return this.read('get-user-loan', [principalCV(address)]);
  }

  async getRepaymentAmount(address: string) {
    return this.read('get-repayment-amount', [principalCV(address)]);
  }

  async getHealthFactor(address: string): Promise<number> {
    return this.read('calculate-health-factor', [principalCV(address)]);
  }

  async isLiquidatable(address: string): Promise<boolean> {
    return this.read('is-liquidatable', [principalCV(address)]);
  }

  async getMaxBorrow(address: string): Promise<number> {
    return this.read('get-max-borrow-amount', [principalCV(address)]);
  }

  async getProtocolStats() {
    return this.read('get-protocol-stats');
  }

  async getVersion(): Promise<string> {
    return this.read('get-contract-version');
  }

  // --- Write methods ---

  async deposit(amount: number, senderAddress: string) {
    return openContractCall({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: 'deposit',
      functionArgs: [uintCV(amount)],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(senderAddress, FungibleConditionCode.Equal, amount),
      ],
    });
  }

  async withdraw(amount: number) {
    return openContractCall({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: 'withdraw',
      functionArgs: [uintCV(amount)],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [],
    });
  }

  async borrow(amount: number, rateBPS: number, termDays: number) {
    return openContractCall({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: 'borrow',
      functionArgs: [uintCV(amount), uintCV(rateBPS), uintCV(termDays)],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [],
    });
  }

  async repay(senderAddress: string, estimatedTotal: number) {
    return openContractCall({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: 'repay',
      functionArgs: [],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(senderAddress, FungibleConditionCode.LessEqual, estimatedTotal),
      ],
    });
  }

  async liquidate(borrowerAddress: string, senderAddress: string, debtAmount: number) {
    return openContractCall({
      contractAddress: this.config.contractAddress,
      contractName: this.config.contractName,
      functionName: 'liquidate',
      functionArgs: [principalCV(borrowerAddress)],
      postConditionMode: PostConditionMode.Deny,
      postConditions: [
        makeStandardSTXPostCondition(senderAddress, FungibleConditionCode.LessEqual, debtAmount),
      ],
    });
  }
}
```

### Usage

```typescript
import { StacksMainnet } from '@stacks/network';

const client = new BitFlowClient({
  contractAddress: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
  contractName: 'bitflow-vault-core',
  network: new StacksMainnet(),
});

// Read
const deposit = await client.getUserDeposit('SP...');
const stats = await client.getProtocolStats();

// Write
await client.deposit(10_000_000, 'SP...');
```

---

## Related Documentation

- [API Examples](API_EXAMPLES.md) — Detailed code examples
- [TypeScript Types](TYPESCRIPT_TYPES.md) — Type definitions
- [Integration Guide](INTEGRATION.md) — Framework integration
- [Network Config](NETWORK_CONFIG.md) — Network setup
