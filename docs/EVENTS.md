# Contract Event Index

All emitted events across BitFlow smart contracts, organized by contract for indexer and frontend integration.

## bitflow-vault-core (v1)

| Event | Emitted By | Fields |
|-------|-----------|--------|
| `protocol-initialized` | `initialize` | `block` |
| `set-stx-price` | `set-stx-price` | `price` |
| `set-min-collateral-ratio` | `set-min-collateral-ratio` | `value` |
| `set-liquidation-threshold` | `set-liquidation-threshold` | `value` |
| `set-interest-rate-bounds` | `set-interest-rate-bounds` | `min`, `max` |
| `set-term-limits` | `set-term-limits` | `min`, `max` |
| `set-late-penalty-rate` | `set-late-penalty-rate` | `value` |
| `pause` | `pause` | — |
| `unpause` | `unpause` | — |
| `deposit` | `deposit` | `user`, `amount` |
| `withdraw` | `withdraw` | `user`, `amount` |
| `borrow` | `borrow` | `user`, `amount`, `rate`, `term` |
| `repay` | `repay` | `user`, `principal`, `interest`, `penalty`, `total` |
| `liquidation` | `liquidate` | `liquidator`, `borrower`, `seized`, `paid` |

## bitflow-vault-core-v2

| Event | Emitted By | Fields |
|-------|-----------|--------|
| `protocol-initialized` | `initialize` | `block` |
| `price-updated` | `set-stx-price` | `price`, `block` |
| `set-min-collateral-ratio` | `set-min-collateral-ratio` | `value` |
| `set-liquidation-threshold` | `set-liquidation-threshold` | `value` |
| `set-interest-rate-bounds` | `set-interest-rate-bounds` | `min`, `max` |
| `set-term-limits` | `set-term-limits` | `min`, `max` |
| `set-late-penalty-rate` | `set-late-penalty-rate` | `value` |
| `deposits-toggled` | `toggle-deposits-enabled` | `enabled` |
| `withdrawals-toggled` | `toggle-withdrawals-enabled` | `enabled` |
| `borrows-toggled` | `toggle-borrows-enabled` | `enabled` |
| `liquidations-toggled` | `toggle-liquidations-enabled` | `enabled` |
| `pause` | `pause` | — |
| `unpause` | `unpause` | — |
| `deposit` | `deposit` | `user`, `amount`, `new-balance` |
| `withdraw` | `withdraw` | `user`, `amount`, `remaining-balance` |
| `borrow` | `borrow` | `user`, `amount`, `rate`, `term-days`, `price-snapshot` |
| `repay` | `repay` | `user`, `principal`, `interest`, `penalty`, `total` |
| `liquidation` | `liquidate` | `liquidator`, `borrower`, `seized`, `paid`, `bonus` |

## bitflow-staking-pool

| Event | Emitted By | Fields |
|-------|-----------|--------|
| `pool-initialized` | `initialize-pool` | `block` |
| `reward-rate-updated` | `set-reward-rate` | `rate`, `block` |
| `pool-paused` | `pause-pool` | `block` |
| `pool-unpaused` | `unpause-pool` | `block` |
| `rewards-funded` | `fund-rewards` | `amount`, `block` |
| `stake` | `stake` | `user`, `amount`, `new-balance` |
| `unstake-requested` | `request-unstake` | `user`, `cooldown-end` |
| `unstake` | `unstake` | `user`, `amount`, `remaining` |
| `emergency-unstake` | `emergency-unstake` | `user`, `amount` |
| `rewards-claimed` | `claim-rewards` | `user`, `amount` |

## bitflow-oracle-registry

| Event | Emitted By | Fields |
|-------|-----------|--------|
| `oracle-initialized` | `initialize-oracle` | `block` |
| `reporter-added` | `add-reporter` | `reporter` |
| `reporter-removed` | `remove-reporter` | `reporter` |
| `min-reporters-updated` | `set-min-reporters` | `value` |
| `max-deviation-updated` | `set-max-deviation` | `value` |
| `max-price-age-updated` | `set-max-price-age` | `value` |
| `oracle-paused` | `pause-oracle` | `block` |
| `oracle-unpaused` | `unpause-oracle` | `block` |
| `admin-price-override` | `admin-set-price` | `price`, `block` |
| `price-submitted` | `submit-price` | `reporter`, `price`, `block` |
| `price-rejected-deviation` | `submit-price` | `reporter`, `price` |
