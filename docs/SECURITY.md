# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in BitFlow contracts or frontend, please report it responsibly:

1. **Do not** open a public GitHub issue
2. Email security findings to the BitFlow team
3. Include a description, steps to reproduce, and potential impact
4. Allow reasonable time for a fix before public disclosure

## Smart Contract Security Model

### Access Control

All administrative functions are gated by `contract-owner` (the deploying principal). There is no multi-sig or governance module — the deployer is the sole admin. This is appropriate for the current stage but should evolve to a multi-sig or DAO governance before mainnet maturity.

**Admin-gated functions across all contracts:**

| Contract | Functions |
|----------|-----------|
| vault-core (v1/v2) | `initialize`, `set-stx-price`, `pause`/`unpause`, `set-min-collateral-ratio`, `set-liquidation-threshold`, `set-interest-rate-bounds`, `set-term-limits`, `set-late-penalty-rate` |
| vault-core-v2 | `toggle-deposits-enabled`, `toggle-borrows-enabled`, `toggle-withdrawals-enabled`, `toggle-liquidations-enabled` |
| staking-pool | `initialize-pool`, `set-reward-rate`, `pause-pool`/`unpause-pool`, `fund-rewards` |
| oracle-registry | `initialize-oracle`, `add-reporter`/`remove-reporter`, `set-min-reporters`, `set-max-deviation`, `set-max-price-age`, `pause-oracle`/`unpause-oracle`, `admin-set-price` |

### Parameter Safety Bounds

All admin-updatable parameters enforce safety bounds to prevent destructive values:

- **Collateral ratio:** 100–500%
- **Liquidation threshold:** 100% to below collateral ratio
- **Interest rate:** 0.5–500% APR (in basis points)
- **Loan term:** 1–730 days
- **Late penalty:** 0–20%
- **STX price:** 1 to 10M (sanity cap)
- **Oracle deviation:** 1–5000 bps (0.01–50%)
- **Oracle price age:** 72–2016 blocks (~12h to ~14d)
- **Reward rate:** 0 to 100M microSTX/block

### STX Transfer Security

All STX transfers use `as-contract` scope correctly:

- **Deposits:** `stx-transfer? amount tx-sender (as-contract tx-sender)` — user sends to contract
- **Withdrawals:** `(as-contract (stx-transfer? amount tx-sender recipient))` — contract sends to user, `recipient` is captured before entering `as-contract` scope
- **Borrow disbursement:** Same pattern as withdrawals
- **Liquidation:** Two transfers — liquidator pays contract, contract sends collateral to liquidator

### Reentrancy

Clarity does not have reentrancy concerns in the Solidity sense. The language is not Turing-complete and does not support callbacks. All state mutations are atomic within a single transaction.

### Integer Overflow

Clarity uses unsigned 128-bit integers. The v2 contract uses safe arithmetic helpers (`safe-add`, `safe-sub`) that cap at `u0` on underflow instead of reverting, preventing underflow from corrupting protocol accounting.

### Price Oracle Risks

- **V1:** Uses a single admin-set price. Risk: admin compromise allows manipulating liquidations
- **V2:** Enforces a staleness check (`MAX-PRICE-AGE = 1008 blocks`) — borrows and liquidations revert if price is stale
- **Oracle registry:** Multi-reporter system with deviation guards, staleness checks, and emergency admin override

### Known Limitations

See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for documented limitations.

## Frontend Security

### No Secret Storage

The frontend never stores private keys. All signing is delegated to the Stacks wallet extension via `@stacks/connect`.

### Post-Conditions

All contract call transactions use `PostConditionMode.Deny` to prevent unexpected token transfers.

### Input Validation

All user inputs (amounts, rates, terms) are validated client-side before transaction submission. Server-side enforcement happens at the contract level.

### Dependencies

- Only `@stacks/connect` and `@stacks/transactions` are used for blockchain interaction
- No third-party DeFi SDKs or aggregators
- CoinGecko API is used read-only for price display (not for contract interactions)

## Audit Status

This codebase has not yet undergone a formal third-party security audit. A professional audit is recommended before mainnet deployment with significant TVL.
