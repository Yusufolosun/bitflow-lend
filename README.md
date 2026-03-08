# BitFlow Lend

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-63%2F63-brightgreen.svg)]()
[![Clarity](https://img.shields.io/badge/language-Clarity-blue.svg)]()
[![Stacks](https://img.shields.io/badge/blockchain-Stacks-purple.svg)]()
[![Mainnet](https://img.shields.io/badge/mainnet-deployed-success.svg)](https://explorer.hiro.so/txid/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core?chain=mainnet)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)]()

Bitcoin-native fixed-rate lending protocol built on Stacks blockchain.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Mainnet Deployment](#mainnet-deployment)
- [Quick Start](#quick-start)
- [Documentation](#documentation)
- [Testing](#testing)
- [Technology Stack](#technology-stack)
- [Contract Functions](#contract-functions)
- [Security](#security)
- [Contributing](#contributing)
- [License](#license)

## Overview

BitFlow Lend enables users to lend and borrow STX with predictable, fixed interest rates secured by Bitcoin finality.

## Features

- **Fixed Interest Rates** - Lock in your rate at the time of borrowing
- **Collateralized Lending** - 150% collateralization requirement
- **Automated Liquidation** - Health factor monitoring with 110% threshold
- **Bitcoin Security** - Leverages Stacks' Bitcoin finality
- **Simple Interest** - Transparent and predictable yield calculations

## Mainnet Deployment

**Contract:** `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`

**Deployment TX:** `0xcbcdc451ddce9d53d2d0a4ba616ac09147b101fef41c1cd6cfe20978c49147d1`

**Deployed:** February 10, 2026 | **Cost:** 0.14627 STX

[View Contract on Explorer](https://explorer.hiro.so/txid/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core?chain=mainnet) | [Deployment Transaction](https://explorer.hiro.so/txid/0xcbcdc451ddce9d53d2d0a4ba616ac09147b101fef41c1cd6cfe20978c49147d1?chain=mainnet)

**Verified Functions (10+ transactions):**
- ✅ `deposit` - Tested with 1 STX
- ✅ `borrow` - Tested 0.01 STX loan at 10% for 30 days
- ✅ `repay` - Successful repayment executed
- ✅ `withdraw` - Tested 0.8 STX withdrawal

## Quick Start

### Deploy Locally
```bash
git clone https://github.com/Yusufolosun/bitflow-lend
cd bitflow-lend/bitflow-core
clarinet test
```

### Deploy to Testnet
```bash
clarinet deployments apply --testnet --low-cost
```

### Deploy to Mainnet
```bash
clarinet deployments apply --mainnet --low-cost
```

## Documentation

### Getting Started
- [Quick Start Guide](./docs/QUICKSTART.md) — Get up and running in 5 minutes
- [User Journey](./docs/USER_JOURNEY.md) — Visual flow guide
- [FAQ](./docs/FAQ.md) — Frequently asked questions

### User Guides
- [Safety Guide](./docs/SAFETY.md) — Security best practices
- [Health Factor Guide](./docs/HEALTH_FACTOR_GUIDE.md) — Understand your position health
- [Liquidation Guide](./docs/LIQUIDATION_GUIDE.md) — How liquidations work
- [Interest Calculator](./docs/INTEREST_CALCULATOR.md) — Calculate borrowing costs
- [Troubleshooting](./docs/TROUBLESHOOTING.md) — Common issues and solutions

### Developer Documentation
- [API Reference](./docs/API.md) — Function signatures and parameters
- [API Examples](./docs/API_EXAMPLES.md) — Code examples for every function
- [SDK Documentation](./docs/SDK.md) — Client library usage
- [TypeScript Types](./docs/TYPESCRIPT_TYPES.md) — Type definitions
- [Integration Guide](./docs/INTEGRATION.md) — Framework integration (React, Vue, Vanilla JS)
- [Integration Testing](./docs/INTEGRATION_TESTING.md) — Test your integration

### Architecture & Reference
- [Architecture](./docs/ARCHITECTURE.md) — System design
- [Architecture Diagrams](./docs/ARCHITECTURE_DIAGRAM.md) — Visual diagrams
- [Contracts Guide](./docs/CONTRACTS.md) — Contract documentation
- [Data Model](./docs/DATA_MODEL.md) — On-chain data structures
- [Constants Reference](./docs/CONSTANTS_REFERENCE.md) — All protocol constants
- [Error Reference](./docs/ERROR_REFERENCE.md) — Error codes explained
- [Glossary](./docs/GLOSSARY.md) — Term definitions
- [Acronyms](./docs/ACRONYMS.md) — Abbreviations reference

### Operations
- [Deployment Guide](./docs/DEPLOYMENT.md) — Deployment procedures
- [Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md) — Step-by-step checklist
- [Network Config](./docs/NETWORK_CONFIG.md) — Network configuration
- [Migration Guide](./docs/MIGRATION_GUIDE.md) — Version migration
- [Security](./docs/SECURITY.md) — Security considerations

## Testing

```bash
clarinet test  # Run all tests
```

## Technology Stack

- **Smart Contracts:** Clarity
- **Frontend:** React + TypeScript
- **Testing:** Vitest + Clarinet
- **CI/CD:** GitHub Actions

## Contract Functions

### Core Functions
- `deposit` - Deposit STX as collateral
- `withdraw` - Withdraw unused collateral
- `borrow` - Take a fixed-rate loan
- `repay` - Repay loan with interest
- `liquidate` - Liquidate undercollateralized positions

### Read-Only Functions
- `get-user-deposit` - View collateral balance
- `get-user-loan` - View active loan details
- `calculate-health-factor` - Check liquidation risk
- `get-repayment-amount` - Calculate repayment due

## Security

- Non-Turing complete Clarity language prevents reentrancy
- Automated collateral ratio enforcement
- Health factor monitoring
- Comprehensive test coverage

## License

MIT

## Contributing

We welcome contributions! Here's how to get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and add tests
4. Run tests: `npm test` (ensure 63/63 pass)
5. Commit with conventional format: `feat: add new feature`
6. Push and open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines and [CONTRIBUTING_GUIDE.md](./docs/CONTRIBUTING_GUIDE.md) for development setup.

---

**Built on Stacks** | [Documentation Index](./docs/INDEX.md)
