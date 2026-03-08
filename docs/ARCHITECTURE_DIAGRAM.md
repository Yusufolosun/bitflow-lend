# Architecture Diagrams

> **Visual representations of the BitFlow Lend protocol architecture.**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BITFLOW LEND                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │   Frontend    │    │   Wallet     │    │  Explorer    │          │
│  │   (React)     │◄──►│  (Leather/   │    │  (Hiro)      │          │
│  │   Vite/TS     │    │   Xverse)    │    │              │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         ▼                   ▼                   ▼                   │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │               @stacks/connect + @stacks/transactions     │       │
│  │                         SDK Layer                        │       │
│  └──────────────────────────┬──────────────────────────────┘       │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │                   Stacks Node API                        │       │
│  │            stacks-node-api.mainnet.stacks.co             │       │
│  └──────────────────────────┬──────────────────────────────┘       │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │               STACKS BLOCKCHAIN (Layer 2)                │       │
│  │                                                          │       │
│  │  ┌────────────────────────────────────────────────────┐  │       │
│  │  │         bitflow-vault-core (Clarity)                │  │       │
│  │  │                                                     │  │       │
│  │  │  ┌─────────────┐  ┌─────────────┐                 │  │       │
│  │  │  │  user-       │  │  user-       │                 │  │       │
│  │  │  │  deposits    │  │  loans       │                 │  │       │
│  │  │  │  (map)       │  │  (map)       │                 │  │       │
│  │  │  └─────────────┘  └─────────────┘                 │  │       │
│  │  │                                                     │  │       │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │  │       │
│  │  │  │ deposit  │ │ borrow   │ │ repay    │           │  │       │
│  │  │  │ withdraw │ │ liquidate│ │ init     │           │  │       │
│  │  │  └──────────┘ └──────────┘ └──────────┘           │  │       │
│  │  └────────────────────────────────────────────────────┘  │       │
│  │                                                          │       │
│  │  ┌──────────────────────────────────────┐               │       │
│  │  │         STX Token (Native)            │               │       │
│  │  │   Transfers, balances, gas fees       │               │       │
│  │  └──────────────────────────────────────┘               │       │
│  └─────────────────────────────────────────────────────────┘       │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐       │
│  │              BITCOIN BLOCKCHAIN (Layer 1)                │       │
│  │         Anchoring, proof-of-transfer consensus           │       │
│  └─────────────────────────────────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Contract Internal Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                  bitflow-vault-core                            │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  CONSTANTS                              DATA VARIABLES        │
│  ┌────────────────────────┐            ┌──────────────────┐  │
│  │ MIN-COLLATERAL-RATIO   │            │ contract-owner   │  │
│  │ = 150 (150%)           │            │ initialized      │  │
│  │                        │            │ total-deposits    │  │
│  │ LIQUIDATION-THRESHOLD  │            │ total-repaid     │  │
│  │ = 110 (110%)           │            │ total-liquidations│  │
│  │                        │            │ last-activity-    │  │
│  │ LIQUIDATOR-BONUS       │            │   block          │  │
│  │ = 5 (5%)               │            └──────────────────┘  │
│  │                        │                                   │
│  │ MAX-INTEREST-RATE      │                                   │
│  │ = 10000 (100%)         │                                   │
│  │                        │                                   │
│  │ BLOCKS_PER_YEAR        │                                   │
│  │ = 52560                │                                   │
│  └────────────────────────┘                                   │
│                                                               │
│  DATA MAPS                                                    │
│  ┌────────────────────┐  ┌──────────────────────────────┐   │
│  │ user-deposits       │  │ user-loans                    │   │
│  │                     │  │                               │   │
│  │ key: principal      │  │ key: principal                │   │
│  │ val: uint           │  │ val: {amount, interest-rate,  │   │
│  │     (microSTX)      │  │       start-block, term-end}  │   │
│  └────────────────────┘  └──────────────────────────────┘   │
│                                                               │
│  PUBLIC FUNCTIONS          READ-ONLY FUNCTIONS               │
│  ┌──────────────────┐     ┌───────────────────────────────┐ │
│  │ deposit(amount)   │     │ get-user-deposit(user)        │ │
│  │ withdraw(amount)  │     │ get-user-loan(user)           │ │
│  │ borrow(amount,    │     │ get-repayment-amount(user)    │ │
│  │   rate, term)     │     │ calculate-health-factor(user) │ │
│  │ repay()           │     │ is-liquidatable(user)         │ │
│  │ liquidate(user)   │     │ get-max-borrow-amount(user)   │ │
│  │ initialize()      │     │ calculate-required-collateral │ │
│  └──────────────────┘     │ get-protocol-stats()          │ │
│                            │ get-protocol-metrics()        │ │
│                            │ get-volume-metrics()          │ │
│                            │ get-contract-version()        │ │
│                            │ get-user-position-summary()   │ │
│                            └───────────────────────────────┘ │
│                                                               │
│  ERROR CODES                                                  │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ u101: insufficient-balance   u107: not-liquidatable    │  │
│  │ u102: invalid-amount         u108: self-liquidation    │  │
│  │ u103: already-has-loan       u109: owner-only          │  │
│  │ u105: insufficient-collateral u110: invalid-rate       │  │
│  │ u106: no-active-loan         u111: invalid-term        │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Sequence Diagrams

### Deposit Flow

```
User                    Wallet                  Stacks Node             Contract
 │                        │                        │                       │
 │  Click "Deposit"       │                        │                       │
 │───────────────────────►│                        │                       │
 │                        │  Sign TX               │                       │
 │  Approve in wallet     │                        │                       │
 │───────────────────────►│                        │                       │
 │                        │  Submit TX             │                       │
 │                        │───────────────────────►│                       │
 │                        │                        │  contract-call        │
 │                        │                        │──────────────────────►│
 │                        │                        │                       │
 │                        │                        │  asserts! amount > 0  │
 │                        │                        │  stx-transfer?        │
 │                        │                        │  map-set deposits     │
 │                        │                        │  var-set totals       │
 │                        │                        │                       │
 │                        │                        │  (ok true)            │
 │                        │                        │◄──────────────────────│
 │                        │  TX confirmed          │                       │
 │                        │◄───────────────────────│                       │
 │  Show success          │                        │                       │
 │◄───────────────────────│                        │                       │
```

### Borrow Flow

```
User                    Wallet                  Stacks Node             Contract
 │                        │                        │                       │
 │  Click "Borrow"        │                        │                       │
 │───────────────────────►│                        │                       │
 │  Approve in wallet     │                        │                       │
 │───────────────────────►│                        │                       │
 │                        │  Submit TX             │                       │
 │                        │───────────────────────►│                       │
 │                        │                        │  contract-call        │
 │                        │                        │──────────────────────►│
 │                        │                        │                       │
 │                        │                        │  asserts! amount > 0  │
 │                        │                        │  asserts! rate valid  │
 │                        │                        │  asserts! term valid  │
 │                        │                        │  asserts! no loan     │
 │                        │                        │  check collateral     │
 │                        │                        │    deposit >= 150%    │
 │                        │                        │  stx-transfer? to user│
 │                        │                        │  map-set loan         │
 │                        │                        │                       │
 │                        │                        │  (ok true)            │
 │                        │                        │◄──────────────────────│
 │                        │  TX confirmed          │                       │
 │                        │◄───────────────────────│                       │
 │  Show success          │                        │                       │
 │◄───────────────────────│                        │                       │
```

### Liquidation Flow

```
Liquidator              Wallet                  Stacks Node             Contract
 │                        │                        │                       │
 │  Call liquidate(user)  │                        │                       │
 │───────────────────────►│                        │                       │
 │  Approve in wallet     │                        │                       │
 │───────────────────────►│                        │                       │
 │                        │  Submit TX             │                       │
 │                        │───────────────────────►│                       │
 │                        │                        │  contract-call        │
 │                        │                        │──────────────────────►│
 │                        │                        │                       │
 │                        │                        │  asserts! not self    │
 │                        │                        │  get borrower loan    │
 │                        │                        │  calc health factor   │
 │                        │                        │  asserts! < 110%      │
 │                        │                        │  calc total debt      │
 │                        │                        │  calc bonus (5%)      │
 │                        │                        │                       │
 │                        │                        │  stx-transfer?        │
 │                        │                        │    liquidator → vault │
 │                        │                        │  stx-transfer?        │
 │                        │                        │    vault → liquidator │
 │                        │                        │    (collateral+bonus) │
 │                        │                        │  map-delete loan      │
 │                        │                        │  map-delete deposit   │
 │                        │                        │                       │
 │                        │                        │  (ok {debt, seized,   │
 │                        │                        │        bonus})        │
 │                        │                        │◄──────────────────────│
 │                        │  TX confirmed          │                       │
 │                        │◄───────────────────────│                       │
 │  Show profit           │                        │                       │
 │◄───────────────────────│                        │                       │
```

---

## Data Flow Diagram

### STX Flow Through the Protocol

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
     │                                      │
     │  user-deposits map                   │
     │  ┌──────────┬──────────┐            │
     │  │ Alice    │ 15 STX   │            │
     │  │ Bob      │ 10 STX   │            │
     │  │ Carol    │ 25 STX   │            │
     │  └──────────┴──────────┘            │
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

### Interest Accrual (No Token Flow)

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
     Example: 5,000,000 × 500 × 4,320 / (100 × 52,560) = 205,479

     Note: Interest is calculated at read-time.
           No tokens move until repay() is called.
```

### Health Factor Degradation

```
     Health Factor Over Time (5 STX loan against 10 STX collateral)

     200% ─── ┌─────┐
              │     │
     180% ─── │     └─────┐
              │           │
     160% ─── │           └─────┐
              │                 │
     140% ─── │                 └─────┐
              │                       │
     120% ─── │                       └─────┐
              │                             │
     110% ─── │─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─│─ ─ LIQUIDATION THRESHOLD
              │                             │
     100% ─── │                             └──── ⚠ LIQUIDATABLE
              │
              └──────────────────────────────────
              Day 0    90     180     270    365
```

---

## Related Documentation

- [Architecture Guide](ARCHITECTURE.md) — Detailed architecture description
- [Data Model](DATA_MODEL.md) — Data maps and variables
- [User Journey](USER_JOURNEY.md) — User flow diagrams
- [Contracts Guide](CONTRACTS.md) — Contract documentation
