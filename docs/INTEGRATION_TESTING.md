# Integration Testing Guide

> **How to test your integration with the BitFlow Lend protocol.**

This guide covers unit tests, integration tests, and end-to-end testing patterns for applications that interact with the BitFlow vault contract.

---

## Test Environment Setup

### Prerequisites

```bash
npm install --save-dev vitest @stacks/transactions clarinet-sdk @hirosystems/clarinet-sdk
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    timeout: 30000,
    include: ['tests/**/*.test.ts'],
  },
});
```

---

## Unit Tests

Test your application logic independently from the blockchain.

### Testing Utility Functions

```typescript
// tests/utils.test.ts
import { describe, it, expect } from 'vitest';

// Your utility functions
function microStxToStx(microStx: number): number {
  return microStx / 1_000_000;
}

function stxToMicroStx(stx: number): number {
  return Math.floor(stx * 1_000_000);
}

function calculateRequiredCollateral(borrowAmount: number): number {
  return Math.ceil(borrowAmount * 1.5);
}

function calculateMaxBorrow(deposit: number): number {
  return Math.floor((deposit * 100) / 150);
}

function calculateInterest(principal: number, rateBPS: number, days: number): number {
  const blocks = days * 144;
  return Math.floor((principal * rateBPS * blocks) / (100 * 52560));
}

describe('Utility Functions', () => {
  it('converts microSTX to STX', () => {
    expect(microStxToStx(1_000_000)).toBe(1);
    expect(microStxToStx(500_000)).toBe(0.5);
    expect(microStxToStx(0)).toBe(0);
  });

  it('converts STX to microSTX', () => {
    expect(stxToMicroStx(1)).toBe(1_000_000);
    expect(stxToMicroStx(0.5)).toBe(500_000);
    expect(stxToMicroStx(10.123456)).toBe(10_123_456);
  });

  it('calculates required collateral at 150%', () => {
    expect(calculateRequiredCollateral(10_000_000)).toBe(15_000_000);
    expect(calculateRequiredCollateral(1_000_000)).toBe(1_500_000);
  });

  it('calculates maximum borrow amount', () => {
    expect(calculateMaxBorrow(15_000_000)).toBe(10_000_000);
    expect(calculateMaxBorrow(10_000_000)).toBe(6_666_666);
  });

  it('calculates interest correctly', () => {
    // 10 STX at 5% for 365 days
    const interest = calculateInterest(10_000_000, 500, 365);
    expect(interest).toBe(500_000); // 0.5 STX

    // 10 STX at 5% for 30 days
    const interest30 = calculateInterest(10_000_000, 500, 30);
    expect(interest30).toBeGreaterThan(0);
    expect(interest30).toBeLessThan(500_000);
  });

  it('handles zero interest for tiny amounts', () => {
    // 1 microSTX at 1% for 1 day → rounds to 0
    const interest = calculateInterest(1, 100, 1);
    expect(interest).toBe(0);
  });
});
```

### Testing Validation Logic

```typescript
// tests/validation.test.ts
import { describe, it, expect } from 'vitest';

function validateDeposit(amount: number, balance: number) {
  if (amount <= 0) return { valid: false, error: 'Amount must be greater than 0' };
  if (amount > balance) return { valid: false, error: 'Insufficient wallet balance' };
  return { valid: true };
}

function validateBorrow(amount: number, deposit: number, hasLoan: boolean) {
  if (hasLoan) return { valid: false, error: 'Already has an active loan' };
  if (amount <= 0) return { valid: false, error: 'Amount must be greater than 0' };
  const required = Math.ceil(amount * 1.5);
  if (deposit < required) return { valid: false, error: `Need ${required / 1_000_000} STX collateral` };
  return { valid: true };
}

describe('Validation', () => {
  it('rejects zero deposit', () => {
    expect(validateDeposit(0, 10_000_000)).toEqual({
      valid: false, error: 'Amount must be greater than 0',
    });
  });

  it('rejects deposit exceeding balance', () => {
    expect(validateDeposit(20_000_000, 10_000_000)).toEqual({
      valid: false, error: 'Insufficient wallet balance',
    });
  });

  it('accepts valid deposit', () => {
    expect(validateDeposit(5_000_000, 10_000_000)).toEqual({ valid: true });
  });

  it('rejects borrow with existing loan', () => {
    expect(validateBorrow(5_000_000, 20_000_000, true)).toEqual({
      valid: false, error: 'Already has an active loan',
    });
  });

  it('rejects borrow without sufficient collateral', () => {
    const result = validateBorrow(10_000_000, 10_000_000, false);
    expect(result.valid).toBe(false);
  });

  it('accepts valid borrow', () => {
    expect(validateBorrow(10_000_000, 15_000_000, false)).toEqual({ valid: true });
  });
});
```

---

## Integration Tests

Test interactions with the actual contract using the Clarinet SDK simnet.

### Contract Integration Tests

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';

// Assuming simnet setup via Clarinet SDK
const accounts = simnet.getAccounts();
const deployer = accounts.get('deployer')!;
const wallet1 = accounts.get('wallet_1')!;
const wallet2 = accounts.get('wallet_2')!;

describe('Contract Integration', () => {
  it('completes full deposit → borrow → repay cycle', () => {
    // Step 1: Deposit
    const depositResult = simnet.callPublicFn(
      'bitflow-vault-core', 'deposit',
      [Cl.uint(10_000_000)],
      wallet1
    );
    expect(depositResult.result).toBeOk(Cl.bool(true));

    // Step 2: Verify deposit
    const balance = simnet.callReadOnlyFn(
      'bitflow-vault-core', 'get-user-deposit',
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(balance.result).toBeUint(10_000_000);

    // Step 3: Borrow
    const borrowResult = simnet.callPublicFn(
      'bitflow-vault-core', 'borrow',
      [Cl.uint(5_000_000), Cl.uint(500), Cl.uint(30)],
      wallet1
    );
    expect(borrowResult.result).toBeOk(Cl.bool(true));

    // Step 4: Mine blocks to accrue interest
    simnet.mineEmptyBlocks(4320); // 30 days

    // Step 5: Repay
    const repayResult = simnet.callPublicFn(
      'bitflow-vault-core', 'repay',
      [],
      wallet1
    );
    expect(repayResult.result.type).toBe(7); // ok response

    // Step 6: Verify loan cleared
    const loan = simnet.callReadOnlyFn(
      'bitflow-vault-core', 'get-user-loan',
      [Cl.principal(wallet1)],
      wallet1
    );
    expect(loan.result).toBeNone();
  });

  it('rejects borrow without sufficient collateral', () => {
    simnet.callPublicFn(
      'bitflow-vault-core', 'deposit',
      [Cl.uint(10_000_000)],
      wallet1
    );

    // Try to borrow more than 66.67%
    const result = simnet.callPublicFn(
      'bitflow-vault-core', 'borrow',
      [Cl.uint(8_000_000), Cl.uint(500), Cl.uint(30)],
      wallet1
    );
    expect(result.result).toBeErr(Cl.uint(105));
  });

  it('prevents double borrowing', () => {
    simnet.callPublicFn('bitflow-vault-core', 'deposit', [Cl.uint(20_000_000)], wallet1);
    simnet.callPublicFn('bitflow-vault-core', 'borrow', [Cl.uint(5_000_000), Cl.uint(500), Cl.uint(30)], wallet1);

    const secondBorrow = simnet.callPublicFn(
      'bitflow-vault-core', 'borrow',
      [Cl.uint(3_000_000), Cl.uint(500), Cl.uint(30)],
      wallet1
    );
    expect(secondBorrow.result).toBeErr(Cl.uint(103));
  });
});
```

---

## End-to-End Tests

Test the full stack with real network calls.

### E2E Test Setup

```typescript
// tests/e2e/setup.ts
import { StacksTestnet } from '@stacks/network';
import { callReadOnlyFunction, principalCV } from '@stacks/transactions';

const TESTNET_CONTRACT = 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0';
const CONTRACT_NAME = 'bitflow-vault-core';
const network = new StacksTestnet();

export async function checkContractDeployed(): Promise<boolean> {
  try {
    const result = await callReadOnlyFunction({
      contractAddress: TESTNET_CONTRACT,
      contractName: CONTRACT_NAME,
      functionName: 'get-contract-version',
      functionArgs: [],
      senderAddress: TESTNET_CONTRACT,
      network,
    });
    return result !== undefined;
  } catch {
    return false;
  }
}
```

### E2E Smoke Test

```typescript
// tests/e2e/smoke.test.ts
import { describe, it, expect } from 'vitest';
import { callReadOnlyFunction } from '@stacks/transactions';

describe('E2E Smoke Test (Testnet)', () => {
  it('reads contract version', async () => {
    const result = await callReadOnlyFunction({
      contractAddress: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
      contractName: 'bitflow-vault-core',
      functionName: 'get-contract-version',
      functionArgs: [],
      senderAddress: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
      network: 'testnet',
    });
    expect(result).toBeDefined();
  });

  it('reads protocol stats', async () => {
    const result = await callReadOnlyFunction({
      contractAddress: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
      contractName: 'bitflow-vault-core',
      functionName: 'get-protocol-stats',
      functionArgs: [],
      senderAddress: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
      network: 'testnet',
    });
    expect(result).toBeDefined();
  });
});
```

---

## Mock Contract

For local testing without connecting to the blockchain.

### Creating a Mock

```typescript
// mocks/bitflowVault.mock.ts
interface LoanData {
  amount: number;
  interestRate: number;
  startBlock: number;
  termEnd: number;
}

export class BitFlowVaultMock {
  private deposits = new Map<string, number>();
  private loans = new Map<string, LoanData>();
  private currentBlock = 0;
  private totalDeposits = 0;
  private totalRepaid = 0;
  private totalLiquidations = 0;

  constructor(initialBlock: number = 0) {
    this.currentBlock = initialBlock;
  }

  // Simulate mining blocks
  mineBlocks(count: number): void {
    this.currentBlock += count;
  }

  // Public functions
  deposit(sender: string, amount: number): { ok: true } | { err: number } {
    if (amount <= 0) return { err: 102 };
    const current = this.deposits.get(sender) || 0;
    this.deposits.set(sender, current + amount);
    this.totalDeposits += amount;
    return { ok: true };
  }

  withdraw(sender: string, amount: number): { ok: true } | { err: number } {
    if (amount <= 0) return { err: 102 };
    const balance = this.deposits.get(sender) || 0;
    if (amount > balance) return { err: 101 };
    this.deposits.set(sender, balance - amount);
    return { ok: true };
  }

  borrow(
    sender: string,
    amount: number,
    rate: number,
    termDays: number
  ): { ok: true } | { err: number } {
    if (amount <= 0) return { err: 102 };
    if (rate > 10000) return { err: 110 };
    if (termDays < 1 || termDays > 365) return { err: 111 };
    if (this.loans.has(sender)) return { err: 103 };

    const deposit = this.deposits.get(sender) || 0;
    const required = Math.ceil((amount * 150) / 100);
    if (deposit < required) return { err: 105 };

    this.loans.set(sender, {
      amount,
      interestRate: rate,
      startBlock: this.currentBlock,
      termEnd: this.currentBlock + termDays * 144,
    });
    return { ok: true };
  }

  repay(sender: string): { ok: { principal: number; interest: number; total: number } } | { err: number } {
    const loan = this.loans.get(sender);
    if (!loan) return { err: 106 };

    const blocksElapsed = this.currentBlock - loan.startBlock;
    const interest = Math.floor(
      (loan.amount * loan.interestRate * blocksElapsed) / (100 * 52560)
    );
    const total = loan.amount + interest;

    this.loans.delete(sender);
    this.totalRepaid += total;

    return { ok: { principal: loan.amount, interest, total } };
  }

  // Read-only functions
  getUserDeposit(user: string): number {
    return this.deposits.get(user) || 0;
  }

  getUserLoan(user: string): LoanData | null {
    return this.loans.get(user) || null;
  }

  getRepaymentAmount(user: string): { principal: number; interest: number; total: number } | null {
    const loan = this.loans.get(user);
    if (!loan) return null;

    const blocksElapsed = this.currentBlock - loan.startBlock;
    const interest = Math.floor(
      (loan.amount * loan.interestRate * blocksElapsed) / (100 * 52560)
    );
    return { principal: loan.amount, interest, total: loan.amount + interest };
  }

  getMaxBorrowAmount(user: string): number {
    const deposit = this.deposits.get(user) || 0;
    return Math.floor((deposit * 100) / 150);
  }

  getProtocolStats() {
    return {
      totalDeposits: this.totalDeposits,
      totalRepaid: this.totalRepaid,
      totalLiquidations: this.totalLiquidations,
    };
  }
}
```

### Using the Mock in Tests

```typescript
// tests/mock.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { BitFlowVaultMock } from '../mocks/bitflowVault.mock';

describe('BitFlow Vault (Mock)', () => {
  let vault: BitFlowVaultMock;
  const alice = 'SP_ALICE';
  const bob = 'SP_BOB';

  beforeEach(() => {
    vault = new BitFlowVaultMock(100_000);
  });

  it('handles complete lifecycle', () => {
    // Deposit
    expect(vault.deposit(alice, 10_000_000)).toEqual({ ok: true });
    expect(vault.getUserDeposit(alice)).toBe(10_000_000);

    // Borrow
    expect(vault.borrow(alice, 5_000_000, 500, 30)).toEqual({ ok: true });
    expect(vault.getUserLoan(alice)).not.toBeNull();

    // Mine 30 days
    vault.mineBlocks(4320);

    // Check repayment amount
    const repayment = vault.getRepaymentAmount(alice);
    expect(repayment).not.toBeNull();
    expect(repayment!.interest).toBeGreaterThan(0);
    expect(repayment!.total).toBeGreaterThan(5_000_000);

    // Repay
    const result = vault.repay(alice);
    expect(result).toHaveProperty('ok');
    expect(vault.getUserLoan(alice)).toBeNull();
  });

  it('enforces single loan per user', () => {
    vault.deposit(alice, 20_000_000);
    vault.borrow(alice, 5_000_000, 500, 30);
    expect(vault.borrow(alice, 3_000_000, 500, 30)).toEqual({ err: 103 });
  });

  it('enforces collateral ratio', () => {
    vault.deposit(alice, 10_000_000);
    // Max borrow: 6,666,666
    expect(vault.borrow(alice, 7_000_000, 500, 30)).toEqual({ err: 105 });
    expect(vault.borrow(alice, 6_000_000, 500, 30)).toEqual({ ok: true });
  });
});
```

---

## Test Best Practices

1. **Test validation separately** — Don't test validation logic through contract calls
2. **Use mocks for UI tests** — Don't hit the blockchain in component tests
3. **Use simnet for contract logic** — The Clarinet SDK provides a fast local testing environment
4. **Use testnet for E2E** — Only use the real network for final integration testing
5. **Test error paths** — Every error code should have a test case
6. **Test edge cases** — Zero amounts, maximum values, boundary conditions
7. **Mock time** — Use `mineBlocks()` to simulate time passage for interest calculations

---

## Related Documentation

- [Testing Guide](TESTING.md) — Contract test suite details
- [API Examples](API_EXAMPLES.md) — Code examples for every function
- [Error Codes](ERRORS.md) — All error codes explained
- [Integration Guide](INTEGRATION.md) — Framework integration
