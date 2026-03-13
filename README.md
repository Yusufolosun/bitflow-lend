# BitFlow Lend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/ci.yml/badge.svg)](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/ci.yml)
[![Tests](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/test.yml/badge.svg)](https://github.com/Yusufolosun/bitflow-lend/actions/workflows/test.yml)
[![Clarity](https://img.shields.io/badge/language-Clarity-blue.svg)]()
[![Stacks](https://img.shields.io/badge/blockchain-Stacks-purple.svg)]()
[![Mainnet](https://img.shields.io/badge/mainnet-deployed-success.svg)](https://explorer.hiro.so/txid/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core?chain=mainnet)

Bitcoin-native fixed-rate lending protocol built on Stacks blockchain.

## Overview

BitFlow Lend enables users to lend and borrow STX with predictable, fixed interest rates secured by Bitcoin finality.

**Key Features:**
- Fixed interest rates locked at time of borrowing
- 150% collateralization requirement
- Automated liquidation at 110% health factor
- Simple interest — transparent and predictable
- Immutable, permissionless smart contract

## Mainnet Deployment

| | |
|---|---|
| **Contract** | `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core` |
| **Explorer** | [View on Hiro Explorer](https://explorer.hiro.so/txid/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core?chain=mainnet) |
| **Deployed** | February 10, 2026 |

## Quick Start

```bash
git clone https://github.com/Yusufolosun/bitflow-lend
cd bitflow-lend/bitflow-core
npm install
npm test
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Deploy

```bash
# Testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml

# Mainnet (with pre-flight checks)
./scripts/deploy-mainnet-safe.sh
```

## Contract Functions

| Function | Type | Description |
|----------|------|-------------|
| `deposit` | Write | Deposit STX as collateral |
| `withdraw` | Write | Withdraw unused collateral |
| `borrow` | Write | Take a fixed-rate loan |
| `repay` | Write | Repay loan with interest |
| `liquidate` | Write | Liquidate undercollateralized positions |
| `get-user-deposit` | Read | View collateral balance |
| `get-user-loan` | Read | View active loan details |
| `calculate-health-factor` | Read | Check liquidation risk |
| `get-repayment-amount` | Read | Calculate repayment due |

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
