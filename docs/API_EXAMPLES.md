# API Code Examples

> **Working code examples for every contract function in BitFlow Lend.**

All examples use `@stacks/transactions@6.13.0` and target the mainnet contract at `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`.

---

## Setup

```typescript
import {
  callReadOnlyFunction,
  makeContractCall,
  broadcastTransaction,
  uintCV,
  principalCV,
  cvToValue,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
  AnchorMode,
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193';
const CONTRACT_NAME = 'bitflow-vault-core';
const MICRO_STX = 1_000_000;
const NETWORK = 'mainnet';
```

---

## Public Functions (State-Changing)

### deposit(amount)

Deposit STX into the vault as collateral.

```typescript
import { openContractCall } from '@stacks/connect';

async function depositSTX(amountSTX: number, senderAddress: string) {
  const amountMicro = Math.floor(amountSTX * MICRO_STX);

  // Validate before calling
  if (amountSTX <= 0) throw new Error('Amount must be greater than 0');

  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'deposit',
    functionArgs: [uintCV(amountMicro)],
    postConditions: [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.Equal,
        amountMicro
      ),
    ],
    network: NETWORK,
    onFinish: (data) => {
      console.log('Deposit TX:', data.txId);
    },
    onCancel: () => {
      console.log('Deposit cancelled by user');
    },
  });
}

// Usage
await depositSTX(10, 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193');
```

**Possible errors:**
- `u102` — Amount is 0

### withdraw(amount)

Withdraw STX from the vault back to your wallet.

```typescript
async function withdrawSTX(amountSTX: number, senderAddress: string) {
  const amountMicro = Math.floor(amountSTX * MICRO_STX);

  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'withdraw',
    functionArgs: [uintCV(amountMicro)],
    network: NETWORK,
    onFinish: (data) => {
      console.log('Withdraw TX:', data.txId);
    },
  });
}

// Usage
await withdrawSTX(5, 'SP...');
```

**Possible errors:**
- `u101` — Insufficient deposit balance
- `u102` — Amount is 0

### borrow(amount, interest-rate, term-days)

Borrow STX against your collateral.

```typescript
async function borrowSTX(
  amountSTX: number,
  rateBPS: number,
  termDays: number,
  senderAddress: string
) {
  const amountMicro = Math.floor(amountSTX * MICRO_STX);

  // Pre-flight validation
  if (amountSTX <= 0) throw new Error('Amount must be > 0');
  if (rateBPS < 1 || rateBPS > 10000) throw new Error('Rate must be 1-10000 BPS');
  if (termDays < 1 || termDays > 365) throw new Error('Term must be 1-365 days');

  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'borrow',
    functionArgs: [
      uintCV(amountMicro),
      uintCV(rateBPS),
      uintCV(termDays),
    ],
    network: NETWORK,
    onFinish: (data) => {
      console.log('Borrow TX:', data.txId);
    },
  });
}

// Usage: borrow 5 STX at 5% APR for 30 days
await borrowSTX(5, 500, 30, 'SP...');
```

**Possible errors:**
- `u102` — Amount is 0
- `u103` — Already has an active loan
- `u105` — Insufficient collateral (need 150%)
- `u110` — Interest rate > 10000
- `u111` — Term outside 1-365 range

### repay()

Repay your active loan (principal + interest).

```typescript
async function repayLoan(senderAddress: string) {
  // First, check repayment amount
  const repaymentInfo = await getRepaymentAmount(senderAddress);
  if (!repaymentInfo) throw new Error('No active loan');

  console.log(`Repaying: ${repaymentInfo.total / MICRO_STX} STX`);

  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'repay',
    functionArgs: [],
    postConditions: [
      makeStandardSTXPostCondition(
        senderAddress,
        FungibleConditionCode.LessEqual,
        repaymentInfo.total
      ),
    ],
    network: NETWORK,
    onFinish: (data) => {
      console.log('Repay TX:', data.txId);
    },
  });
}
```

**Possible errors:**
- `u106` — No active loan

### liquidate(borrower, stx-price)

Liquidate an undercollateralized loan.

```typescript
async function liquidateLoan(
  borrowerAddress: string,
  stxPrice: number,
  senderAddress: string
) {
  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'liquidate',
    functionArgs: [
      principalCV(borrowerAddress),
      uintCV(stxPrice),
    ],
    network: NETWORK,
    onFinish: (data) => {
      console.log('Liquidation TX:', data.txId);
      // Returns: { seized-collateral, paid, bonus }
    },
  });
}

// Usage
await liquidateLoan('SP_BORROWER_ADDRESS', 1_000_000, 'SP_LIQUIDATOR');
```

**Possible errors:**
- `u106` — Borrower has no active loan
- `u107` — Health factor >= 110% (not liquidatable)
- `u108` — Cannot self-liquidate

### initialize()

One-time protocol initialization (owner only).

```typescript
async function initializeProtocol(ownerAddress: string) {
  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'initialize',
    functionArgs: [],
    network: NETWORK,
  });
}
```

**Possible errors:**
- `u109` — Not the contract owner

---

## Read-Only Functions

These functions query on-chain state without creating transactions (no gas cost).

### get-user-deposit

```typescript
async function getUserDeposit(userAddress: string): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-user-deposit',
    functionArgs: [principalCV(userAddress)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  return Number(cvToValue(result)) / MICRO_STX;
}

// Usage
const deposit = await getUserDeposit('SP...');
console.log(`Deposit: ${deposit} STX`);
```

### get-user-loan

```typescript
interface LoanData {
  amount: number;
  interestRate: number;
  startBlock: number;
  termEnd: number;
}

async function getUserLoan(userAddress: string): Promise<LoanData | null> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-user-loan',
    functionArgs: [principalCV(userAddress)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  const value = cvToValue(result);
  if (!value) return null;
  return {
    amount: Number(value.amount?.value || value.amount) / MICRO_STX,
    interestRate: Number(value['interest-rate']?.value || value['interest-rate']),
    startBlock: Number(value['start-block']?.value || value['start-block']),
    termEnd: Number(value['term-end']?.value || value['term-end']),
  };
}
```

### get-repayment-amount

```typescript
interface RepaymentInfo {
  principal: number;
  interest: number;
  total: number;
}

async function getRepaymentAmount(userAddress: string): Promise<RepaymentInfo | null> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-repayment-amount',
    functionArgs: [principalCV(userAddress)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  const value = cvToValue(result);
  if (!value) return null;
  return {
    principal: Number(value.principal?.value || value.principal) / MICRO_STX,
    interest: Number(value.interest?.value || value.interest) / MICRO_STX,
    total: Number(value.total?.value || value.total) / MICRO_STX,
  };
}
```

### calculate-health-factor

```typescript
async function getHealthFactor(userAddress: string, stxPrice: number): Promise<number | null> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'calculate-health-factor',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  const value = cvToValue(result);
  return value ? Number(value?.value || value) : null;
}

// Usage
const health = await getHealthFactor('SP...', 1_000_000);
if (health !== null) {
  console.log(`Health Factor: ${health}%`);
  if (health < 110) console.warn('DANGER: Liquidation possible!');
  else if (health < 150) console.warn('WARNING: Monitor closely');
}
```

### is-liquidatable

```typescript
async function checkLiquidatable(userAddress: string, stxPrice: number): Promise<boolean> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'is-liquidatable',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  return Boolean(cvToValue(result));
}
```

### get-max-borrow-amount

```typescript
async function getMaxBorrow(userAddress: string): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-max-borrow-amount',
    functionArgs: [principalCV(userAddress)],
    senderAddress: userAddress,
    network: NETWORK,
  });
  return Number(cvToValue(result)) / MICRO_STX;
}
```

### calculate-required-collateral

```typescript
async function getRequiredCollateral(borrowAmountSTX: number): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'calculate-required-collateral',
    functionArgs: [uintCV(Math.floor(borrowAmountSTX * MICRO_STX))],
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  return Number(cvToValue(result)) / MICRO_STX;
}

// Usage
const required = await getRequiredCollateral(10);
console.log(`Need ${required} STX collateral to borrow 10 STX`);
// Output: Need 15 STX collateral to borrow 10 STX
```

### get-protocol-stats

```typescript
async function getProtocolStats() {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-protocol-stats',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  const value = cvToValue(result);
  return {
    totalDeposits: Number(value['total-deposits']?.value || value['total-deposits'] || 0) / MICRO_STX,
    totalRepaid: Number(value['total-repaid']?.value || value['total-repaid'] || 0) / MICRO_STX,
    totalLiquidations: Number(value['total-liquidations']?.value || value['total-liquidations'] || 0) / MICRO_STX,
  };
}
```

### get-protocol-metrics

```typescript
async function getProtocolMetrics() {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-protocol-metrics',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  const v = cvToValue(result);
  const safeNum = (x: any) => Number(x?.value || x || 0);
  return {
    totalDeposits: safeNum(v['total-deposits']),
    totalWithdrawals: safeNum(v['total-withdrawals']),
    totalBorrows: safeNum(v['total-borrows']),
    totalRepayments: safeNum(v['total-repayments']),
    totalLiquidations: safeNum(v['total-liquidations']),
  };
}
```

### get-volume-metrics

```typescript
async function getVolumeMetrics() {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-volume-metrics',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  const v = cvToValue(result);
  const safeNum = (x: any) => Number(x?.value || x || 0) / MICRO_STX;
  return {
    depositVolume: safeNum(v['deposit-volume']),
    borrowVolume: safeNum(v['borrow-volume']),
    repayVolume: safeNum(v['repay-volume']),
    liquidationVolume: safeNum(v['liquidation-volume']),
  };
}
```

### get-contract-version

```typescript
async function getContractVersion(): Promise<string> {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-contract-version',
    functionArgs: [],
    senderAddress: CONTRACT_ADDRESS,
    network: NETWORK,
  });
  return String(cvToValue(result));
}
// Returns: "1.0.0"
```

---

## Error Handling

Patterns for gracefully handling contract errors in your application.

### Error Code Map

```typescript
const CONTRACT_ERRORS: Record<number, { code: string; message: string; recovery: string }> = {
  101: {
    code: 'ERR-INSUFFICIENT-BALANCE',
    message: 'Your deposit balance is insufficient for this withdrawal.',
    recovery: 'Try withdrawing a smaller amount or check your deposit balance.',
  },
  102: {
    code: 'ERR-INVALID-AMOUNT',
    message: 'The amount must be greater than zero.',
    recovery: 'Enter a positive number.',
  },
  103: {
    code: 'ERR-ALREADY-HAS-LOAN',
    message: 'You already have an active loan.',
    recovery: 'Repay your existing loan before borrowing again.',
  },
  105: {
    code: 'ERR-INSUFFICIENT-COLLATERAL',
    message: 'Your deposit is less than 150% of the borrow amount.',
    recovery: 'Deposit more STX or borrow a smaller amount.',
  },
  106: {
    code: 'ERR-NO-ACTIVE-LOAN',
    message: 'You don\'t have an active loan to repay.',
    recovery: 'No action needed — you have no outstanding debt.',
  },
  107: {
    code: 'ERR-NOT-LIQUIDATABLE',
    message: 'This position cannot be liquidated.',
    recovery: 'The borrower\'s health factor is above 110%.',
  },
  108: {
    code: 'ERR-LIQUIDATE-OWN-LOAN',
    message: 'You cannot liquidate your own loan.',
    recovery: 'Another user must perform the liquidation.',
  },
  109: {
    code: 'ERR-OWNER-ONLY',
    message: 'This function is restricted to the contract owner.',
    recovery: 'Only the deployer can call this function.',
  },
  110: {
    code: 'ERR-INVALID-INTEREST-RATE',
    message: 'Interest rate exceeds the maximum of 100% APR.',
    recovery: 'Set the rate between 1 and 10000 basis points.',
  },
  111: {
    code: 'ERR-INVALID-TERM',
    message: 'Loan term must be between 1 and 365 days.',
    recovery: 'Choose a term between 1 and 365.',
  },
};
```

### Parsing Transaction Results

```typescript
function parseContractError(error: any): { code: number; message: string; recovery: string } {
  // Extract error code from various error formats
  let errorCode: number | null = null;

  if (typeof error === 'string') {
    const match = error.match(/u(\d+)/);
    if (match) errorCode = parseInt(match[1]);
  } else if (error?.value) {
    errorCode = Number(error.value);
  } else if (typeof error === 'number') {
    errorCode = error;
  }

  if (errorCode && CONTRACT_ERRORS[errorCode]) {
    return { code: errorCode, ...CONTRACT_ERRORS[errorCode] };
  }

  return {
    code: errorCode || 0,
    message: 'An unexpected error occurred.',
    recovery: 'Please try again or contact support.',
  };
}
```

### Try-Catch Pattern for Contract Calls

```typescript
async function safeDeposit(amountSTX: number, address: string) {
  try {
    // Pre-flight validation
    if (amountSTX <= 0) {
      return { success: false, error: CONTRACT_ERRORS[102] };
    }

    // Check wallet balance (via API)
    const balanceResponse = await fetch(
      `https://api.mainnet.hiro.so/extended/v1/address/${address}/balances`
    );
    const balanceData = await balanceResponse.json();
    const balance = Number(balanceData.stx.balance) / MICRO_STX;

    if (balance < amountSTX + 0.01) { // +0.01 for gas
      return {
        success: false,
        error: {
          message: `Insufficient balance. You have ${balance.toFixed(2)} STX but need ${(amountSTX + 0.01).toFixed(2)} STX.`,
          recovery: 'Reduce the deposit amount or add more STX.',
        },
      };
    }

    // Execute deposit
    await openContractCall({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'deposit',
      functionArgs: [uintCV(Math.floor(amountSTX * MICRO_STX))],
      network: NETWORK,
    });

    return { success: true };
  } catch (err) {
    const parsed = parseContractError(err);
    return { success: false, error: parsed };
  }
}

// Usage with error handling
const result = await safeDeposit(10, 'SP...');
if (result.success) {
  showToast('Deposit successful!', 'success');
} else {
  showToast(result.error.message, 'error');
  console.log('Recovery:', result.error.recovery);
}
```

### Retry Pattern

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage: retry read-only calls on network failure
const deposit = await withRetry(() => getUserDeposit('SP...'));
```

---

## Related Documentation

- [API Reference](API.md) — Detailed read-only function docs
- [Error Codes](ERRORS.md) — All error codes explained
- [Contracts Reference](CONTRACTS.md) — Contract architecture
- [Integration Guide](INTEGRATION.md) — Framework integration
