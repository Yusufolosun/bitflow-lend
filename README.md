# BitFlow Lend V3

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/ci.yml/badge.svg)](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/ci.yml)
[![Tests](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/test.yml/badge.svg)](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/test.yml)
[![Clarity](https://img.shields.io/badge/language-Clarity-blue.svg)]()
[![Stacks](https://img.shields.io/badge/blockchain-Stacks-purple.svg)]()
[![Mainnet](https://img.shields.io/badge/mainnet-deployed-success.svg)](https://explorer.hiro.so/address/SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-vault-core-v3?chain=mainnet)

A production-grade, decentralized Bitcoin-native fixed-rate lending protocol suite built in Clarity on the Stacks blockchain.

## Protocol Suite Architecture

BitFlow Lend V3 consists of three core smart contracts designed to operate collectively:

1. **`bitflow-oracle-registry-v3`**: A multi-source decentralized price oracle with whitelisted reporter validation, deviation checks, and automatic staleness protection.
2. **`bitflow-staking-pool-v3`**: An incentive-alignment pool distributing STX rewards to protocol participants using a checkpoint-based yield engine.
3. **`bitflow-vault-core-v3`**: The core fixed-rate lending engine managing user collateral, deposits, borrow limits, and a robust liquidation liquidator loop.

---

## Key Features

- **Fixed Interest Rates**: Guaranteed and locked at the exact moment of borrowing, eliminating variable rate volatility.
- **Robust Collateral Management**: Secured by a strict 150% minimum collateralization ratio.
- **Automated Liquidations**: Automatic position closing triggered at a 110% health factor with a 5% liquidator bonus.
- **On-Chain Event Sourcing**: Structured event logs emitted with block heights for indexers, substreams, and subgraphs.
- **Granular Circuit Breakers**: Multi-tier admin toggles allowing per-function pausing (deposits, borrows, withdrawals, liquidations) for emergency risk management.

---

## Governance & Trust Model

The BitFlow Lend V3 contracts are immutable once deployed. To handle dynamic network environments, select protocol parameters are admin-governed via the `contract-owner` (deployer wallet):
- Price feeds and whitelisted oracle reporters.
- Risk parameters (minimum collateral ratio, liquidation threshold, late penalty rates).
- Emergency pause controls for individual protocol functions.

Every privileged operation emits an explicit on-chain `admin-action` print event logging the executing principal and the action details.

For an exhaustive audit of admin controls, view [PRIVILEGED_FUNCTIONS.md](./PRIVILEGED_FUNCTIONS.md).

---

## Mainnet Deployments

All three contracts were deployed to the Stacks mainnet on **May 21, 2026**:

| Contract | Mainnet Address | Explorer |
|----------|-----------------|----------|
| **Oracle Registry** | `SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-oracle-registry-v3` | [View on Hiro Explorer](https://explorer.hiro.so/address/SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-oracle-registry-v3?chain=mainnet) |
| **Staking Pool** | `SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-staking-pool-v3` | [View on Hiro Explorer](https://explorer.hiro.so/address/SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-staking-pool-v3?chain=mainnet) |
| **Vault Core** | `SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-vault-core-v3` | [View on Hiro Explorer](https://explorer.hiro.so/address/SP1N3809W9CBWWX04KN3TCQHP8A9GN520BD4JMP8Z.bitflow-vault-core-v3?chain=mainnet) |

## Quick Start

```bash
git clone https://github.com/Yusufolosun/bitflow-lend
cd bitflow-lend
npm install
npm test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Deploying the Protocol Suite

We provide a production-grade automated deployment orchestration script that executes 9 pre-flight safety checks (syntax, tests, wallet balance, and secret scans) before deploying:

```bash
# Deploy to Stacks Testnet
bash scripts/deploy-v3-suite.sh --network testnet

# Deploy to Stacks Mainnet
bash scripts/deploy-v3-suite.sh --network mainnet
```

Alternatively, deploy directly using Clarinet:

```bash
# Testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml

# Mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

## Smart Contract Interface Reference

### `bitflow-vault-core-v3`

| Function | Type | Description |
|----------|------|-------------|
| `deposit` | Write | Deposit STX as collateral |
| `withdraw` | Write | Withdraw unused collateral |
| `borrow` | Write | Take a fixed-rate loan |
| `repay` | Write | Repay loan principal plus simple interest |
| `liquidate` | Write | Liquidate undercollateralized positions (health factor < 1.10) |
| `get-user-deposit` | Read | Get current collateral balance for a principal |
| `get-user-loan` | Read | Get active loan details, principal, term, and interest rate |
| `calculate-health-factor` | Read | Get position health factor (1.50+ is safe, <1.10 is liquidatable) |
| `get-repayment-amount` | Read | Get total repayment amount due including simple interest |
| `get-dashboard-snapshot` | Read | Get aggregated vault stats, pool utilization, and protocol age |

### `bitflow-staking-pool-v3`

| Function | Type | Description |
|----------|------|-------------|
| `stake` | Write | Stake STX to earn yield |
| `unstake-request` | Write | Initiate a cooldown period to unstake STX |
| `unstake` | Write | Withdraw STX after cooldown expires |
| `claim-rewards` | Write | Claim accumulated STX rewards |
| `get-staker-summary` | Read | View active stake, checkpoints, pending rewards, and cooldowns |
| `get-dashboard-snapshot` | Read | View staking pool TVL, reward rates, and yield performance |

### `bitflow-oracle-registry-v3`

| Function | Type | Description |
|----------|------|-------------|
| `submit-price` | Write | Whitelisted reporter price submission |
| `get-aggregated-price` | Read | Get the consensus price aggregated from active reporters |
| `get-dashboard-snapshot` | Read | View active reporter list, min reporter threshold, and price age |

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Clarity |
| Blockchain | Stacks (Bitcoin L2) |
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Testing | Vitest + Clarinet SDK |
| CI/CD | GitHub Actions |
| Deployment | Vercel (frontend), Clarinet (contracts) |

## Documentation

- [Quick Start Guide](./docs/QUICKSTART.md)
- [API Reference](./docs/API.md) / [Examples](./docs/API_EXAMPLES.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Contracts Guide](./docs/CONTRACTS.md)
- [Privileged Functions and Trust Model](./PRIVILEGED_FUNCTIONS.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Full Documentation Index](./docs/INDEX.md)

## Security

- Clarity's non-Turing-complete design prevents reentrancy attacks
- Automated collateral ratio enforcement on every transaction
- Health factor monitoring with liquidation threshold
- Comprehensive test coverage across boundary, security, and liquidation scenarios

See [SECURITY.md](./SECURITY.md) for the security policy and vulnerability reporting.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run tests: `npm test`
4. Commit with conventional format: `feat: add new feature`
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for full guidelines.

## License

MIT — see [LICENSE](./LICENSE)
