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
