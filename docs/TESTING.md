# Testing Guide

This document provides comprehensive information on testing the BitFlow vault-core contract, including how to run tests, interpret results, add new tests, and integrate with CI/CD.

## Table of Contents

- [Quick Start](#quick-start)
- [Test Framework](#test-framework)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Test Structure](#test-structure)
- [Adding New Tests](#adding-new-tests)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

---

## Test Framework

### Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Vitest | 4.0.18 | Test runner |
| @stacks/clarinet-sdk | 2.0.0 | Simnet for contract testing |
| @stacks/transactions | 6.13.0 | Clarity value construction |

### Why Vitest?

- **Fast:** Parallel test execution
- **Modern:** ES modules support
- **Compatible:** Works with Clarinet SDK
- **DX:** Great developer experience

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests in UI mode (interactive)
npm run test:ui

# Run specific test file
npx vitest run tests/vault-core.test.ts

# Run tests matching pattern
npx vitest run --grep "deposit"
```

### Test Output

```bash
$ npm test

> bitflow-core-tests@1.0.0 test
> vitest run

 RUN  v4.0.18

 ✓ tests/vault-core.test.ts (18 tests) 1115ms
   ✓ vault-core contract (4)
     ✓ allows users to deposit STX 73ms
     ✓ allows users to withdraw their deposits 54ms
     ✓ prevents users from withdrawing more than deposited 51ms
     ✓ tracks total deposits correctly 48ms
   ✓ loan management (5)
     ✓ allows users to borrow against sufficient collateral 48ms
     ✓ prevents borrowing without sufficient collateral 68ms
     ✓ prevents users from having multiple active loans 75ms
     ✓ correctly calculates required collateral 60ms
     ✓ correctly calculates loan term-end block height 49ms
   ✓ loan repayment (4)
     ✓ allows users to repay their loan with interest 52ms
     ✓ prevents repaying when no active loan exists 55ms
     ✓ correctly calculates repayment amount 83ms
     ✓ tracks total repaid across multiple loans 120ms
   ✓ liquidation system (5)
     ✓ calculates health factor correctly 56ms
     ✓ identifies liquidatable positions 71ms
     ✓ allows liquidation of unhealthy positions 56ms
     ✓ prevents liquidating healthy positions 40ms
     ✓ prevents self-liquidation 48ms

 Test Files  1 passed (1)
      Tests  18 passed (18)
   Start at  00:16:58
   Duration  8.58s
```

---

## Test Coverage

### Current Coverage

```
File                     | % Stmts | % Branch | % Funcs | % Lines
-------------------------|---------|----------|---------|--------
contracts/vault-core.clar| 100     | 95       | 100     | 100
All files                | 100     | 95       | 100     | 100
```

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

### Coverage Goals

- **Statements:** 100% ✅
- **Branches:** 95%+ ✅
- **Functions:** 100% ✅
- **Lines:** 100% ✅

---

## Test Structure

### Test File Organization

```
tests/
├── vault-core.test.ts                      # V1 vault core tests
├── bitflow-vault-core.comprehensive.test.ts # V1 comprehensive tests
├── bitflow-vault-core.boundary.test.ts     # V1 boundary/edge case tests
├── bitflow-vault-core.concurrent.test.ts   # V1 concurrent operation tests
├── bitflow-vault-core.state.test.ts        # V1 state management tests
├── bitflow-vault-core.liquidation.test.ts  # V1 liquidation tests
├── bitflow-vault-core.errors.test.ts       # V1 error condition tests
├── bitflow-vault-core.gas.test.ts          # V1 gas optimization tests
├── bitflow-vault-core.security.test.ts     # V1 security tests
├── bitflow-vault-core.time.test.ts         # V1 time-dependent tests
├── bitflow-vault-core.precision.test.ts    # V1 precision tests
├── bitflow-vault-core-v2.test.ts           # V2 vault core tests
├── bitflow-vault-core-v2.boundary.test.ts  # V2 boundary tests
├── bitflow-vault-core-v2.liquidation.test.ts # V2 liquidation security
├── bitflow-staking-pool.test.ts            # Staking pool tests
├── bitflow-staking-pool.boundary.test.ts   # Staking boundary tests
├── bitflow-staking-pool.state.test.ts      # Staking state management
├── bitflow-oracle-registry.test.ts         # Oracle registry tests
├── bitflow-oracle-registry.boundary.test.ts # Oracle boundary tests
├── bitflow-oracle-registry.state.test.ts   # Oracle state management
└── vitest-env.d.ts                         # Type declarations

frontend/src/
├── components/__tests__/
│   ├── DepositCard.test.tsx
│   ├── BorrowCard.test.tsx
│   ├── RepayCard.test.tsx
│   ├── Dashboard.test.tsx
│   ├── WalletConnect.test.tsx
│   ├── StatsCard.test.tsx
│   ├── ErrorState.test.tsx
│   ├── LoadingCard.test.tsx
│   ├── NetworkIndicator.test.tsx
│   ├── Toast.test.tsx
│   ├── HealthMonitor.test.tsx
│   ├── LiquidationList.test.tsx
│   └── TransactionHistory.test.tsx
├── hooks/__tests__/
│   ├── useToast.test.ts
│   ├── useSmartPolling.test.ts
│   └── useStxPrice.test.ts
└── utils/__tests__/
    ├── calculations.test.ts
    └── formatters.test.ts
```

### Test Suite Structure

```typescript
describe("vault-core contract", () => {
  // Group 1: Basic operations
  it("allows users to deposit STX", () => { ... });
  it("allows users to withdraw their deposits", () => { ... });
  it("prevents users from withdrawing more than deposited", () => { ... });
  it("tracks total deposits correctly", () => { ... });
});

describe("loan management", () => {
  // Group 2: Borrowing
  it("allows users to borrow against sufficient collateral", () => { ... });
  it("prevents borrowing without sufficient collateral", () => { ... });
  it("prevents users from having multiple active loans", () => { ... });
  it("correctly calculates required collateral", () => { ... });
  it("correctly calculates loan term-end block height", () => { ... });
});

describe("loan repayment", () => {
  // Group 3: Repayment
  it("allows users to repay their loan with interest", () => { ... });
  it("prevents repaying when no active loan exists", () => { ... });
  it("correctly calculates repayment amount", () => { ... });
  it("tracks total repaid across multiple loans", () => { ... });
});

describe("liquidation system", () => {
  // Group 4: Liquidations
  it("calculates health factor correctly", () => { ... });
  it("identifies liquidatable positions", () => { ... });
  it("allows liquidation of unhealthy positions", () => { ... });
  it("prevents liquidating healthy positions", () => { ... });
  it("prevents self-liquidation", () => { ... });
});
```

### Test Anatomy

```typescript
it("allows users to deposit STX", () => {
  // 1. ARRANGE: Set up test data
  const accounts = simnet.getAccounts();
  const wallet_1 = accounts.get("wallet_1")!;
  const depositAmount = 1000;

  // 2. ACT: Execute the function
  const { result } = simnet.callPublicFn(
    "vault-core",
    "deposit",
    [Cl.uint(depositAmount)],
    wallet_1
  );

  // 3. ASSERT: Verify the result
  expect(result).toBeOk(Cl.bool(true));

  // 4. VERIFY STATE: Check state changes
  const userDepositResponse = simnet.callReadOnlyFn(
    "vault-core",
    "get-user-deposit",
    [Cl.principal(wallet_1)],
    wallet_1
  );
  expect(userDepositResponse.result).toBeUint(depositAmount);
});
```

---

## Adding New Tests

### Step 1: Choose Test Category

Determine which describe block your test belongs to:
- **vault-core contract:** Basic deposit/withdraw
- **loan management:** Borrowing logic
- **loan repayment:** Repayment and interest
- **liquidation system:** Liquidation mechanics

### Step 2: Write Test Case

```typescript
describe("vault-core contract", () => {
  // Existing tests...

  it("enforces minimum deposit amount", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Try to deposit 0 STX
    const { result } = simnet.callPublicFn(
      "vault-core",
      "deposit",
      [Cl.uint(0)],
      wallet_1
    );

    // Should fail with ERR-INVALID-AMOUNT (u102)
    expect(result).toBeErr(Cl.uint(102));
  });
});
```

### Step 3: Follow AAA Pattern

- **Arrange:** Set up test data and state
- **Act:** Call the contract function
- **Assert:** Verify expected outcomes

### Step 4: Test Edge Cases

```typescript
describe("edge cases", () => {
  it("handles maximum uint values correctly", () => {
    // Test with very large numbers
    const maxUint = 18446744073709551615n;
    // ... test logic
  });

  it("handles concurrent deposits correctly", () => {
    // Test multiple deposits in same block
    // ... test logic
  });

  it("handles block height transitions", () => {
    // Mine blocks and test time-dependent logic
    simnet.mineEmptyBlocks(1000);
    // ... test logic
  });
});
```

### Step 5: Run and Verify

```bash
# Run your new test
npm test

# Verify it passes
# Verify coverage didn't decrease
npm run test:coverage
```

---

## Example Test Cases

### Testing Error Conditions

```typescript
it("rejects deposits from contract context", () => {
  const accounts = simnet.getAccounts();
  const deployer = accounts.get("deployer")!;

  // Attempt deposit as contract
  const { result } = simnet.callPublicFn(
    "vault-core",
    "deposit",
    [Cl.uint(1000)],
    deployer,
    { asContract: true }  // Call as contract
  );

  // Should succeed (no restriction)
  // But document the behavior
  expect(result).toBeOk(Cl.bool(true));
});
```

### Testing State Transitions

```typescript
it("maintains total-deposits invariant", () => {
  const accounts = simnet.getAccounts();
  const wallet_1 = accounts.get("wallet_1")!;
  const wallet_2 = accounts.get("wallet_2")!;

  // Initial state
  const initial = simnet.callReadOnlyFn(
    "vault-core",
    "get-total-deposits",
    [],
    wallet_1
  );
  expect(initial.result).toBeUint(0);

  // Deposit from wallet_1
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(1000)], wallet_1);

  // Check total
  const after1 = simnet.callReadOnlyFn(
    "vault-core",
    "get-total-deposits",
    [],
    wallet_1
  );
  expect(after1.result).toBeUint(1000);

  // Deposit from wallet_2
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(2000)], wallet_2);

  // Check total
  const after2 = simnet.callReadOnlyFn(
    "vault-core",
    "get-total-deposits",
    [],
    wallet_1
  );
  expect(after2.result).toBeUint(3000);

  // Withdraw from wallet_1
  simnet.callPublicFn("vault-core", "withdraw", [Cl.uint(500)], wallet_1);

  // Check total decreased
  const after3 = simnet.callReadOnlyFn(
    "vault-core",
    "get-total-deposits",
    [],
    wallet_1
  );
  expect(after3.result).toBeUint(2500);
});
```

### Testing Time-Dependent Logic

```typescript
it("accrues interest over time", () => {
  const accounts = simnet.getAccounts();
  const wallet_1 = accounts.get("wallet_1")!;

  // Setup: Deposit and borrow
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(2000)], wallet_1);
  simnet.callPublicFn(
    "vault-core",
    "borrow",
    [Cl.uint(1000), Cl.uint(10), Cl.uint(365)],
    wallet_1
  );

  // Check initial repayment (no interest yet)
  const initial = simnet.callReadOnlyFn(
    "vault-core",
    "get-repayment-amount",
    [Cl.principal(wallet_1)],
    wallet_1
  );
  expect(initial.result).toBeSome(
    Cl.tuple({
      principal: Cl.uint(1000),
      interest: Cl.uint(0),
      total: Cl.uint(1000),
    })
  );

  // Mine 1 year worth of blocks (52560)
  simnet.mineEmptyBlocks(52560);

  // Check repayment after 1 year
  const after1Year = simnet.callReadOnlyFn(
    "vault-core",
    "get-repayment-amount",
    [Cl.principal(wallet_1)],
    wallet_1
  );

  // 10% of 1000 STX = 100 STX interest
  expect(after1Year.result).toBeSome(
    Cl.tuple({
      principal: Cl.uint(1000),
      interest: Cl.uint(100),
      total: Cl.uint(1100),
    })
  );
});
```

---

## CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Clarinet
        run: |
          curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
          sudo mv clarinet /usr/local/bin/

      - name: Install dependencies
        run: npm ci

      - name: Check contract syntax
        run: clarinet check

      - name: Run tests
        run: npm test

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          flags: unittests
          name: codecov-umbrella

  lint:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint
```

### Pre-commit Hooks

Install Husky for pre-commit hooks:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm test"
```

**.husky/pre-commit:**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run tests before commit
npm test

# Check contract
clarinet check
```

### Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint . --ext .ts,.tsx",
    "check": "clarinet check"
  }
}
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Tests Fail with "simnet is not defined"

**Solution:**
```typescript
// Add to vitest-env.d.ts
import { Simnet } from '@stacks/clarinet-sdk';

declare global {
  const simnet: Simnet;
}
```

#### Issue 2: Clarinet Check Fails

**Solution:**
```bash
# Ensure Clarinet.toml is properly configured
cat Clarinet.toml

# Should include:
[project]
name = "bitflow-core"
clarity_version = 2

[[project.contracts]]
path = "contracts/vault-core.clar"
clarity_version = 2
```

#### Issue 3: Tests Pass Locally But Fail in CI

**Solution:**
```bash
# Ensure Node version matches
node --version  # Should be 18+

# Ensure Clarinet version matches
clarinet --version

# Clear cache
npm clean-install
```

#### Issue 4: Coverage Not Generated

**Solution:**
```bash
# Install coverage package
npm install --save-dev @vitest/coverage-v8

# Update vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

---

## Test Best Practices

### 1. Keep Tests Independent

```typescript
// ✅ GOOD: Each test is independent
it("test 1", () => {
  const accounts = simnet.getAccounts();
  const wallet_1 = accounts.get("wallet_1")!;
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(1000)], wallet_1);
  // ... assertions
});

it("test 2", () => {
  const accounts = simnet.getAccounts();
  const wallet_2 = accounts.get("wallet_2")!;
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(2000)], wallet_2);
  // ... assertions
});

// ❌ BAD: Tests depend on each other
let sharedState;
it("test 1", () => {
  sharedState = simnet.callPublicFn(...);
});
it("test 2", () => {
  // Depends on test 1
  expect(sharedState).toBeDefined();
});
```

### 2. Use Descriptive Test Names

```typescript
// ✅ GOOD: Clear what is being tested
it("prevents withdrawal when balance is insufficient", () => { ... });
it("calculates interest correctly for 30-day loan at 10% rate", () => { ... });

// ❌ BAD: Unclear test purpose
it("test withdrawal", () => { ... });
it("interest works", () => { ... });
```

### 3. Test One Thing Per Test

```typescript
// ✅ GOOD: Tests one specific behavior
it("increases total-deposits when user deposits", () => {
  const initial = getTotalDeposits();
  deposit(1000);
  const after = getTotalDeposits();
  expect(after).toBe(initial + 1000);
});

// ❌ BAD: Tests multiple things
it("deposits and withdrawals work", () => {
  deposit(1000);
  expect(getBalance()).toBe(1000);
  withdraw(500);
  expect(getBalance()).toBe(500);
  borrow(300);
  expect(getLoan()).toBeDefined();
});
```

### 4. Use Helpers for Setup

```typescript
// Helper functions
function setupUserWithDeposit(amount: number) {
  const accounts = simnet.getAccounts();
  const wallet = accounts.get("wallet_1")!;
  simnet.callPublicFn("vault-core", "deposit", [Cl.uint(amount)], wallet);
  return wallet;
}

function setupUserWithLoan(deposit: number, borrow: number) {
  const wallet = setupUserWithDeposit(deposit);
  simnet.callPublicFn(
    "vault-core",
    "borrow",
    [Cl.uint(borrow), Cl.uint(10), Cl.uint(30)],
    wallet
  );
  return wallet;
}

// Use in tests
it("allows repayment of active loan", () => {
  const wallet = setupUserWithLoan(1500, 1000);
  // Test repayment
  const result = simnet.callPublicFn("vault-core", "repay", [], wallet);
  expect(result.result).toBeOk(expect.any(Object));
});
```

---

## Test Metrics

Current test suite metrics:

| Category | Test Files | Description |
|----------|-----------|-------------|
| V1 Vault Core | 10 files | Comprehensive, boundary, state, liquidation, security, time, precision, gas, errors, concurrent |
| V2 Vault Core | 3 files | Core, boundary, liquidation security |
| Staking Pool | 3 files | Core, boundary, state management |
| Oracle Registry | 3 files | Core, boundary, state management |
| Frontend Components | 13 files | All main UI components |
| Frontend Hooks | 3 files | useToast, useSmartPolling, useStxPrice |
| Frontend Utils | 2 files | calculations, formatters |
| **Total** | **37 files** | |

---

## Future Testing

### Planned Additions

- [x] Security testing (attempted exploits)
- [x] Gas optimization tests
- [x] Multi-user concurrent operation tests
- [x] Boundary and edge case tests
- [x] Staking pool and oracle registry contract tests
- [x] Frontend component test suites
- [x] Hook and utility test suites
- [ ] Integration tests with frontend ↔ contract interaction
- [ ] Load testing for high transaction volumes
- [ ] Fuzz testing for randomized inputs

---

**Document Version:** 2.0.0
**Last Updated:** March 13, 2026

For testing support:
- **GitHub Issues:** [Report test issues](https://github.com/bitflow/vault-core/issues)
- **Discord:** #testing channel

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md) — Deployment procedures
- [API Examples](API_EXAMPLES.md) — Code examples
