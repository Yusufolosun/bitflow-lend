# Changelog

All notable changes to BitFlow Lend are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Multi-collateral support (sBTC, USDA)
- Variable interest rates based on utilization
- Flash loans
- Governance token and DAO
- Analytics dashboard

## [2.0.0] - 2026-03-13

### Added
- **bitflow-staking-pool** contract — STX staking with checkpoint-based reward accounting, cooldown-gated unstaking, emergency unstake, and estimated APY
- **bitflow-oracle-registry** contract — multi-source price oracle with deviation guards, staleness thresholds, and emergency admin override
- Per-function toggle guards (deposits, withdrawals, borrows, liquidations) in v2 vault
- Dashboard snapshot read-only functions across all 4 contracts
- Migration export functions (export-user-position, export-protocol-state) in v1 and v2
- Contract version registry for frontend multi-version support
- ErrorBoundary component for graceful crash recovery
- Hooks barrel export (useAuth, useVault, useSmartPolling, useStxPrice, useToast, useProtocolStats)
- Comprehensive test suites: 28+ contract test files, 14 component tests, 3 hook tests, 3 util/config tests
- Security policy (docs/SECURITY.md)
- Contract event reference (docs/EVENTS.md)
- Test coverage documentation (docs/TESTING.md)

### Changed
- V2 interest calculation uses ceiling division to prevent rounding to zero
- V2 borrow records price snapshot at loan creation for migration support
- V2 repay returns penalty field alongside principal, interest, and total
- V1 initialize emits structured print event
- Frontend vitest coverage configured with v8 provider

### Fixed
- V1 withdraw zero-amount guard (previously allowed zero withdrawals)
- V1 deposit per-user cap (10M STX) to prevent concentration risk
- Oracle min-reporters cannot exceed current reporter count
- Decorative icons hidden from screen readers across all component headers
- Console statements removed from production frontend

### Security
- All admin functions audit-documented in SECURITY.md
- Parameter safety bounds enforced on all tunable values
- STX transfer scope verified using `as-contract` pattern
- Stale price guard on v2 borrow and liquidation operations
- Emergency unstake bypasses cooldown when pool is paused

## [1.0.1] - 2026-02-10

### Fixed
- Gas optimization reducing contract size by 78%
- Improved liquidation threshold enforcement

### Added
- Mainnet deployment on Stacks
- Production validation with real transactions

## [1.0.0] - 2026-01-25

### Added
- Core lending protocol with deposit/withdraw functionality
- Fixed-rate borrowing with customizable terms
- Interest calculation and repayment system
- Liquidation engine with health factor monitoring
- Comprehensive test suite (19 tests, 100% coverage)
- React frontend with Stacks wallet integration
- Complete documentation suite
- CI/CD pipeline with GitHub Actions

### Security
- Strict collateral ratio enforcement (150% minimum)
- Liquidation protection at 110% health factor
- Comprehensive input validation
- Protection against common attack vectors

### Changed
- Optimized gas costs for all operations
- Enhanced error messages

### Fixed
- BigInt type compatibility in formatters
- TypeScript type definitions
- CSS linting warnings

## [0.1.0] - 2026-01-15

### Added
- Initial project setup
- Basic contract structure
- Test framework configuration

---

## Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Incompatible API changes
- **MINOR**: Backwards-compatible functionality
- **PATCH**: Backwards-compatible bug fixes
