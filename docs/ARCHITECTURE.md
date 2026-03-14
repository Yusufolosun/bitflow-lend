# BitFlow Vault Architecture

This document provides a comprehensive overview of the BitFlow vault system architecture, including system design, data flows, and interaction patterns.

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagram](#architecture-diagram)
- [Component Overview](#component-overview)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Contract Interaction Patterns](#contract-interaction-patterns)
- [State Management](#state-management)
- [Design Decisions](#design-decisions)

---

## System Overview

BitFlow is a decentralized lending protocol built on the Stacks blockchain that enables users to deposit STX as collateral, borrow against it with interest, and participate in liquidations of undercollateralized positions.

### Key Characteristics

- **Blockchain:** Stacks (Layer 2 on Bitcoin)
- **Language:** Clarity (smart contract)
- **Collateral:** STX tokens
- **Contracts:** 4 (vault-core v1, vault-core v2, staking pool, oracle registry)
- **Governance:** Admin-gated (owner-controlled parameters, no DAO yet)
- **Upgradability:** Versioned contracts with migration support (v1 → v2)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BitFlow Vault System                          │
└─────────────────────────────────────────────────────────────────────────┘

                                  Users
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                Depositors      Borrowers      Liquidators
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │      Frontend DApp            │
                    │  - React Components           │
                    │  - Wallet Integration         │
                    │  - Transaction Builder        │
                    └───────────────┬───────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
        ┌──────────────────────┐      ┌──────────────────────┐
        │  @stacks/connect     │      │  Read-Only Queries   │
        │  - openContractCall  │      │  - callReadOnlyFn    │
        │  - Transaction Sign  │      │  - No Gas Cost       │
        └──────────┬───────────┘      └──────────┬───────────┘
                   │                              │
                   │                              │
                   └──────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │    Stacks Blockchain        │
                    │  - Transaction Validation   │
                    │  - Block Mining             │
                    │  - State Commitment         │
                    └─────────────┬───────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   vault-core.clar           │
                    │  ┌─────────────────────┐    │
                    │  │  Public Functions   │    │
                    │  │  - deposit          │    │
                    │  │  - withdraw         │    │
                    │  │  - borrow           │    │
                    │  │  - repay            │    │
                    │  │  - liquidate        │    │
                    │  └─────────────────────┘    │
                    │  ┌─────────────────────┐    │
                    │  │  Read-Only Funcs    │    │
                    │  │  - get-user-deposit │    │
                    │  │  - get-user-loan    │    │
                    │  │  - get-repayment    │    │
                    │  │  - health-factor    │    │
                    │  │  - is-liquidatable  │    │
                    │  └─────────────────────┘    │
                    │  ┌─────────────────────┐    │
                    │  │  State Storage      │    │
                    │  │  - user-deposits    │    │
                    │  │  - user-loans       │    │
                    │  │  - counters         │    │
                    │  └─────────────────────┘    │
                    └─────────────────────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │   Bitcoin Network           │
                    │  - Finality via PoX         │
                    │  - Security Inheritance     │
                    └─────────────────────────────┘
```

---

## Component Overview

### 1. Frontend Layer

**Purpose:** User interface for interacting with the vault

**Components:**
- **Wallet Connection:** Hiro Wallet integration via @stacks/connect
- **Transaction Builder:** Constructs contract calls with proper parameters
- **State Management:** React hooks for user data and contract state
- **UI Components:** Forms, dashboards, liquidation views

**Technologies:**
- React/TypeScript
- @stacks/connect for wallet integration
- @stacks/transactions for contract calls

### 2. Smart Contract Layer

**Purpose:** Core business logic and state management

**Contracts:**

| Contract | File | Purpose |
|----------|------|---------|
| vault-core v1 | `contracts/bitflow-vault-core.clar` | Original lending protocol |
| vault-core v2 | `contracts/bitflow-vault-core-v2.clar` | Enhanced v2 with per-function toggles, safe arithmetic, price snapshots |
| staking-pool | `contracts/bitflow-staking-pool.clar` | STX staking with checkpoint rewards and cooldown |
| oracle-registry | `contracts/bitflow-oracle-registry.clar` | Multi-reporter price oracle with deviation guards |

**Contract Interaction Diagram:**

```
                     ┌──────────────────┐
                     │   Admin (Owner)  │
                     └────────┬─────────┘
                              │ set-stx-price, pause, toggle, set-params
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                   ▼
  ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
  │ vault-core v1/v2 │ │ staking-pool │ │ oracle-registry  │
  │                  │ │              │ │                  │
  │ deposit/withdraw │ │ stake/unstake│ │ submit-price     │
  │ borrow/repay     │ │ claim-rewards│ │ admin-set-price  │
  │ liquidate        │ │ emergency-   │ │ add/remove-      │
  │                  │ │   unstake    │ │   reporter       │
  └──────────────────┘ └──────────────┘ └──────────────────┘
          │                    │                   │
          │    get-dashboard-snapshot (all 3)       │
          └────────────────────┼───────────────────┘
                               ▼
                    ┌────────────────────┐
                    │  Frontend / Indexer │
                    └────────────────────┘
```

**Responsibilities:**
- Validate all state transitions
- Enforce collateralization rules
- Execute STX transfers
- Track user positions
- Calculate interest and health factors
- Multi-source price aggregation (oracle)
- Checkpoint-based reward accounting (staking)

**Security Features:**
- Clarity's built-in reentrancy protection
- Automatic integer overflow checking
- Admin-gated parameter changes with safety bounds
- Per-function circuit breakers (v2 toggles)
- Emergency withdrawal when paused (staking)

### 3. Blockchain Layer

**Purpose:** Transaction validation and state finality

**Stacks Blockchain:**
- Processes and validates transactions
- Maintains global state
- Provides finality via Proof-of-Transfer (PoX)
- Settles on Bitcoin for security

### 4. Storage Layer

**Purpose:** Persistent state storage

**Data Structures:**
```clarity
;; User deposits (principal → uint)
(define-map user-deposits principal uint)

;; User loans (principal → loan struct)
(define-map user-loans principal {
  amount: uint,
  interest-rate: uint,
  start-block: uint,
  term-end: uint
})

;; Global counters
(define-data-var total-deposits uint u0)
(define-data-var total-repaid uint u0)
(define-data-var total-liquidations uint u0)
```

---

## Data Flow Diagrams

### Deposit Flow

```
User Wallet                Frontend              Smart Contract           Blockchain
    │                          │                       │                      │
    │  1. Click "Deposit"      │                       │                      │
    ├─────────────────────────>│                       │                      │
    │                          │                       │                      │
    │                          │  2. Validate Amount   │                      │
    │                          │      (> 0)            │                      │
    │                          │                       │                      │
    │  3. Sign Transaction     │                       │                      │
    │<─────────────────────────┤                       │                      │
    │                          │                       │                      │
    │  4. Confirm              │                       │                      │
    ├─────────────────────────>│                       │                      │
    │                          │                       │                      │
    │                          │  5. Submit TX         │                      │
    │                          ├──────────────────────>│                      │
    │                          │                       │                      │
    │                          │                       │  6. Validate TX      │
    │                          │                       ├─────────────────────>│
    │                          │                       │                      │
    │                          │                       │  7. Execute deposit()│
    │                          │                       │  - Check amount > 0  │
    │                          │                       │  - Transfer STX      │
    │                          │                       │  - Update map        │
    │                          │                       │  - Update counter    │
    │                          │                       │                      │
    │                          │                       │  8. Return (ok true) │
    │                          │                       │<─────────────────────┤
    │                          │                       │                      │
    │                          │  9. TX Confirmed      │                      │
    │                          │<──────────────────────┤                      │
    │                          │                       │                      │
    │  10. Update UI           │                       │                      │
    │<─────────────────────────┤                       │                      │
    │  (Show new balance)      │                       │                      │
```

### Borrow Flow

```
User                     Frontend                Contract                  State
  │                          │                       │                       │
  │  Request Borrow          │                       │                       │
  ├─────────────────────────>│                       │                       │
  │                          │                       │                       │
  │                          │  Check Existing Loan  │                       │
  │                          ├──────────────────────>│                       │
  │                          │  (get-user-loan)      │                       │
  │                          │                       │   Read user-loans     │
  │                          │                       ├──────────────────────>│
  │                          │                       │<──────────────────────┤
  │                          │<──────────────────────┤                       │
  │                          │  (none)               │                       │
  │                          │                       │                       │
  │                          │  Check Collateral     │                       │
  │                          ├──────────────────────>│                       │
  │                          │  (get-user-deposit)   │                       │
  │                          │                       │   Read user-deposits  │
  │                          │                       ├──────────────────────>│
  │                          │                       │<──────────────────────┤
  │                          │<──────────────────────┤                       │
  │                          │  (1500 STX)           │                       │
  │                          │                       │                       │
  │  Show Borrow Form        │                       │                       │
  │<─────────────────────────┤                       │                       │
  │  Max: 1000 STX (1500/1.5)│                       │                       │
  │                          │                       │                       │
  │  Confirm Borrow          │                       │                       │
  │  1000 STX @ 10% 30 days  │                       │                       │
  ├─────────────────────────>│                       │                       │
  │                          │                       │                       │
  │                          │  Submit borrow()      │                       │
  │                          ├──────────────────────>│                       │
  │                          │                       │                       │
  │                          │                       │  Validate:            │
  │                          │                       │  - No existing loan?  │
  │                          │                       │  - Enough collateral? │
  │                          │                       │  - 1500 >= 1500? ✓    │
  │                          │                       │                       │
  │                          │                       │  Create loan:         │
  │                          │                       │  - amount: 1000       │
  │                          │                       │  - rate: 10           │
  │                          │                       │  - start: block 100   │
  │                          │                       │  - end: block 4420    │
  │                          │                       │                       │
  │                          │                       │   Write user-loans    │
  │                          │                       ├──────────────────────>│
  │                          │                       │                       │
  │                          │  (ok true)            │                       │
  │                          │<──────────────────────┤                       │
  │                          │                       │                       │
  │  Success!                │                       │                       │
  │<─────────────────────────┤                       │                       │
```

### Liquidation Flow

```
Liquidator               Frontend              Contract                Oracle
    │                       │                      │                      │
    │  Monitor Positions    │                      │                      │
    ├──────────────────────>│                      │                      │
    │                       │                      │                      │
    │                       │  Get STX Price       │                      │
    │                       ├─────────────────────────────────────────────>│
    │                       │                      │                      │
    │                       │  Price: $0.70 (u70)  │                      │
    │                       │<─────────────────────────────────────────────┤
    │                       │                      │                      │
    │                       │  Check Health        │                      │
    │                       ├─────────────────────>│                      │
    │                       │  (borrower, u70)     │                      │
    │                       │                      │                      │
    │                       │                      │  Calculate:          │
    │                       │                      │  health = 105%       │
    │                       │                      │  liquidatable? true  │
    │                       │                      │                      │
    │                       │  Health: 105%        │                      │
    │                       │<─────────────────────┤                      │
    │                       │  Liquidatable: true  │                      │
    │                       │                      │                      │
    │  Opportunity Found!   │                      │                      │
    │<──────────────────────┤                      │                      │
    │  Profit: 450 STX      │                      │                      │
    │                       │                      │                      │
    │  Execute Liquidation  │                      │                      │
    ├──────────────────────>│                      │                      │
    │                       │                      │                      │
    │                       │  liquidate()         │                      │
    │                       ├─────────────────────>│                      │
    │                       │                      │                      │
    │                       │                      │  Validate:           │
    │                       │                      │  - Not self? ✓       │
    │                       │                      │  - Liquidatable? ✓   │
    │                       │                      │  - Health < 110% ✓   │
    │                       │                      │                      │
    │                       │                      │  Execute:            │
    │                       │                      │  1. Pay 1050 STX     │
    │                       │                      │     (1000 + 50)      │
    │                       │                      │  2. Seize 1500 STX   │
    │                       │                      │  3. Delete loan      │
    │                       │                      │  4. Zero deposit     │
    │                       │                      │  5. Increment count  │
    │                       │                      │                      │
    │                       │  Result:             │                      │
    │                       │  - seized: 1500      │                      │
    │                       │  - paid: 1050        │                      │
    │                       │  - bonus: 50         │                      │
    │                       │<─────────────────────┤                      │
    │                       │                      │                      │
    │  Success!             │                      │                      │
    │  Profit: 450 STX      │                      │                      │
    │<──────────────────────┤                      │                      │
```

---

## Contract Interaction Patterns

### Pattern 1: Read-Before-Write

Always query state before writing to validate conditions:

```typescript
// ✅ GOOD: Check state first
async function safeBorrow(amount: number) {
  // 1. Read current state
  const existingLoan = await getUserLoan(userAddress);
  const deposit = await getUserDeposit(userAddress);
  
  // 2. Validate locally
  if (existingLoan) {
    throw new Error('Already has loan');
  }
  
  if (deposit < amount * 1.5) {
    throw new Error('Insufficient collateral');
  }
  
  // 3. Execute write
  await borrow(amount, rate, term);
}
```

### Pattern 2: Optimistic UI with Rollback

Update UI optimistically but handle failures:

```typescript
async function optimisticDeposit(amount: number) {
  const originalBalance = currentBalance;
  
  // Optimistic update
  setCurrentBalance(currentBalance + amount);
  showPending('Depositing...');
  
  try {
    await deposit(amount);
    showSuccess('Deposited!');
  } catch (error) {
    // Rollback
    setCurrentBalance(originalBalance);
    showError('Deposit failed');
  }
}
```

### Pattern 3: Batch Read Operations

Fetch multiple data points in parallel:

```typescript
// ✅ GOOD: Parallel reads
const [deposit, loan, repayment, health] = await Promise.all([
  getUserDeposit(address),
  getUserLoan(address),
  getRepaymentAmount(address),
  calculateHealthFactor(address, stxPrice),
]);

// ❌ BAD: Sequential reads
const deposit = await getUserDeposit(address);
const loan = await getUserLoan(address);
const repayment = await getRepaymentAmount(address);
// Much slower!
```

### Pattern 4: Event-Driven Updates

Use polling or WebSockets for real-time updates:

```typescript
// Poll for updates
const pollInterval = setInterval(async () => {
  const newDeposit = await getUserDeposit(userAddress);
  if (newDeposit !== currentDeposit) {
    setCurrentDeposit(newDeposit);
    showNotification('Deposit updated!');
  }
}, 10000); // Every 10 seconds

// Cleanup
return () => clearInterval(pollInterval);
```

---

## State Management

### Contract State Schema

```
vault-core Contract State
│
├── Maps (Key-Value Storage)
│   │
│   ├── user-deposits: Map<Principal, Uint>
│   │   └── Example: ST1... → 1500
│   │
│   └── user-loans: Map<Principal, Struct>
│       └── Example: ST1... → {
│           amount: 1000,
│           interest-rate: 10,
│           start-block: 100,
│           term-end: 4420
│         }
│
└── Data Variables (Global State)
    │
    ├── total-deposits: Uint
    │   └── Sum of all deposits
    │
    ├── total-repaid: Uint
    │   └── Sum of all repayments (principal + interest)
    │
    └── total-liquidations: Uint
        └── Count of liquidation events
```

### State Transitions

```
Initial State
    │
    ├─> deposit() ──────> user-deposits[user] += amount
    │                     total-deposits += amount
    │
    ├─> withdraw() ─────> user-deposits[user] -= amount
    │                     total-deposits -= amount
    │
    ├─> borrow() ───────> user-loans[user] = {loan-data}
    │                     (no balance change)
    │
    ├─> repay() ────────> user-loans[user] = deleted
    │                     total-repaid += (principal + interest)
    │
    └─> liquidate() ────> user-loans[borrower] = deleted
                          user-deposits[borrower] = 0
                          total-deposits -= collateral
                          total-liquidations += 1
```

### State Invariants

**Invariant 1: Collateralization**
```
For all users with loans:
user-deposits[user] >= loan.amount × 1.5
```

**Invariant 2: No Negative Balances**
```
For all users:
user-deposits[user] >= 0
```

**Invariant 3: Total Deposits Accuracy**
```
total-deposits == Σ(user-deposits[user]) for all users
```

**Invariant 4: One Loan Per User**
```
For all users:
user-loans[user] is either none or single loan struct
```

---

## Design Decisions

### Why Clarity?

**Chosen:** Clarity smart contract language

**Rationale:**
- **Decidability:** All code paths can be analyzed statically
- **No Reentrancy:** Built-in protection against reentrancy attacks
- **Type Safety:** Strong typing prevents many common bugs
- **Bitcoin Security:** Inherits Bitcoin's security via Stacks PoX
- **Readability:** More auditable than EVM bytecode

### Why 150% Collateralization?

**Chosen:** 150% minimum collateral ratio

**Rationale:**
- **Safety Buffer:** 50% price drop before reaching liquidation threshold
- **Industry Standard:** Similar to MakerDAO and other DeFi protocols
- **Liquidator Incentive:** Sufficient margin for liquidation bonus (5%)
- **User Flexibility:** Not too restrictive (vs 200%+)

**Alternatives Considered:**
- 200%: Too restrictive for users
- 125%: Too risky for protocol
- 133%: Odd number, less intuitive

### Why 110% Liquidation Threshold?

**Chosen:** 110% health factor threshold

**Rationale:**
- **Early Intervention:** Liquidate before reaching critical 100%
- **Gas Coverage:** Liquidators can cover transaction costs
- **Bad Debt Prevention:** Reduces risk of undercollateralized positions
- **Warning Zone:** Users have 110-150% range to add collateral

**Formula:**
```
Liquidatable when: (collateral-value / loan-amount) < 1.10
```

### Why Single Loan Per User?

**Chosen:** One active loan per address

**Rationale:**
- **Simplicity:** Easier to implement and audit
- **Gas Efficiency:** Lower storage costs
- **UX Clarity:** Users understand their single position easily
- **Security:** Reduces attack surface

**Trade-off:** Less flexibility, but users can use multiple addresses

### Why No Admin Functions?

**Chosen:** Fully permissionless, no owner

**Rationale:**
- **Decentralization:** No central point of failure
- **Trust Minimization:** Users trust code, not admin
- **Immutability:** Cannot be paused or changed
- **No Rug Pull:** Admin cannot steal funds

**Trade-off:** Cannot pause in emergency, cannot fix bugs

### Why Simple Interest?

**Chosen:** Simple interest calculation

**Rationale:**
- **Predictability:** Users know exact interest upfront
- **Gas Efficiency:** Simple calculation
- **Transparency:** Easy to understand and verify

**Formula:**
```clarity
interest = (principal × rate × blocks-elapsed) / (100 × 52560)
```

**Alternative (Compound Interest):**
- More complex
- Higher gas costs
- Less predictable
- Not needed for short-term loans

---

## Performance Considerations

### Read Optimization

**Caching Strategy:**
```typescript
// Cache read-only results with TTL
const cache = new Map<string, { value: any; expiry: number }>();

async function cachedRead(key: string, fn: () => Promise<any>, ttl = 30000) {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiry) {
    return cached.value;
  }
  
  const value = await fn();
  cache.set(key, { value, expiry: Date.now() + ttl });
  return value;
}

// Usage
const deposit = await cachedRead(
  `deposit:${userAddress}`,
  () => getUserDeposit(userAddress),
  10000 // 10 second TTL
);
```

### Write Optimization

**Post-Conditions:**
```typescript
// Add post-conditions to fail fast on client
const postCondition = makeStandardSTXPostCondition(
  userAddress,
  FungibleConditionCode.Equal,
  amount
);

// Transaction will fail immediately if condition not met
```

### Gas Estimates

| Function | Estimated Gas | Complexity |
|----------|---------------|------------|
| deposit | ~5,000 | Low |
| withdraw | ~6,000 | Low |
| borrow | ~8,000 | Medium |
| repay | ~10,000 | Medium |
| liquidate | ~15,000 | High |
| get-* (reads) | 0 (free) | Low |

---

## Security Architecture

### Layers of Security

```
┌─────────────────────────────────────────┐
│  Layer 1: Input Validation              │
│  - Frontend checks                      │
│  - Type validation                      │
│  - Range checks                         │
└─────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  Layer 2: Business Logic Validation     │
│  - Collateral checks                    │
│  - Loan existence checks                │
│  - Balance validations                  │
└─────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  Layer 3: Clarity Safety                │
│  - No reentrancy (by design)            │
│  - Integer overflow protection          │
│  - Type safety                          │
│  - Decidability                         │
└─────────────────────────────────────────┘
                  ▼
┌─────────────────────────────────────────┐
│  Layer 4: Blockchain Finality           │
│  - PoX consensus                        │
│  - Bitcoin settlement                   │
│  - Immutability                         │
└─────────────────────────────────────────┘
```

---

## Future Architecture Considerations

### Multi-Collateral Support

```clarity
;; Future: Support multiple collateral types
(define-map user-collateral {
  user: principal,
  token: principal
} uint)

;; Future: Collateral-specific ratios
(define-map collateral-ratios principal uint)
```

### Loan IDs for Multiple Loans

```clarity
;; Future: Multiple loans per user
(define-map user-loan-ids principal (list 10 uint))
(define-map loans uint {
  borrower: principal,
  amount: uint,
  interest-rate: uint,
  start-block: uint,
  term-end: uint
})
```

### Oracle Integration

```clarity
;; Future: On-chain price oracle
(use-trait oracle-trait .oracle-trait.oracle)

(define-public (liquidate-with-oracle 
  (borrower principal) 
  (oracle <oracle-trait>))
  (let (
    (price (unwrap! (contract-call? oracle get-price) ERR-ORACLE-FAILURE))
  )
    (liquidate borrower price)
  )
)
```

---

## Conclusion

The BitFlow vault architecture prioritizes simplicity, security, and decentralization. The design leverages Clarity's built-in safety features while maintaining a clean separation of concerns between contract logic, state management, and user interactions.

Key architectural strengths:
- **Security-first design** with multiple validation layers
- **Immutable and permissionless** for maximum decentralization
- **Simple and auditable** contract logic
- **Efficient state management** with maps and counters
- **Clear interaction patterns** for developers

---

**Document Version:** 1.0.0  
**Last Updated:** January 25, 2026  
**Contract Version:** vault-core v1.0.0

For more information:
- [Contract Documentation](./CONTRACTS.md)
- [Security Guide](./SECURITY.md)
- [Integration Guide](./INTEGRATION.md)

---

## STX Flow Through the Protocol

```
                    ┌─────────────────────┐
                    │    User Wallet       │
                    │    (STX balance)     │
                    └──────┬──────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            │            ▼
     ┌────────────┐        │   ┌────────────┐
     │  deposit()  │        │   │  repay()    │
     │  User→Vault │        │   │  User→Vault │
     └──────┬─────┘        │   └──────┬─────┘
            │              │          │
            ▼              │          ▼
     ┌─────────────────────────────────────┐
     │          CONTRACT VAULT              │
     │     (holds all deposited STX)        │
     └──────┬──────────────┬───────────────┘
            │              │
            ▼              ▼
     ┌────────────┐  ┌────────────┐
     │ withdraw() │  │  borrow()  │
     │ Vault→User │  │ Vault→User │
     └────────────┘  └────────────┘

     ┌─────────────────────────────────────┐
     │          LIQUIDATION FLOW            │
     │                                      │
     │  Liquidator pays debt ──► Vault      │
     │  Vault sends collateral ──► Liquidator│
     │  (+5% bonus from collateral)         │
     └─────────────────────────────────────┘
```

## Interest Accrual Model

```
     Block N                        Block N+4320 (30 days later)
     ┌──────────────┐               ┌──────────────┐
     │ Loan Created │               │ Loan Status  │
     │              │               │              │
     │ Principal:   │    TIME       │ Principal:   │
     │  5,000,000   │  ─────────►   │  5,000,000   │
     │              │  (4320 blocks)│              │
     │ Interest:    │               │ Interest:    │
     │  0           │               │  41,095      │
     │              │               │              │
     │ Total Owed:  │               │ Total Owed:  │
     │  5,000,000   │               │  5,041,095   │
     └──────────────┘               └──────────────┘

     Formula: interest = principal × rate × blocks / (100 × 52,560)
     Note: Interest is calculated at read-time. No tokens move until repay() is called.
```

---

## Related Documentation

- [Data Model](DATA_MODEL.md) — On-chain data structures
- [Contracts Guide](CONTRACTS.md) — Contract documentation
