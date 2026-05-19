# Privileged Functions and Trust Model

This document lists all public functions that are restricted to the deployer-defined admin account (stored as `contract-owner` in each contract).

## Why this matters

BitFlow contracts are immutable after deployment, but they are not fully permissionless in operation. The admin can still call owner-only methods that change protocol behavior.

Use this file to evaluate governance and key-management risk before using the protocol.

## Contract: bitflow-oracle-registry.clar

| Function | What it controls | What a malicious admin could do |
|---|---|---|
| `initialize-oracle` | Starts oracle lifecycle metrics (`protocol-start-block`) | Delay initialization to block normal startup assumptions or initialize at an opportunistic time |
| `add-reporter` | Adds a reporter address allowed to submit prices | Add colluding or controlled reporters to bias price updates |
| `remove-reporter` | Removes approved reporter addresses | Remove honest reporters and centralize control over price updates |
| `set-min-reporters` | Changes reporter quorum requirement | Set quorum to values that make updates easy to control or hard to satisfy |
| `set-max-deviation` | Changes allowed deviation bound for submissions | Loosen bounds to accept manipulated prices or tighten bounds to censor valid updates |
| `set-max-price-age` | Changes staleness window for accepted prices | Extend stale price acceptance or force frequent expiry to disrupt borrowing/liquidation |
| `pause-oracle` | Pauses reporter submissions that refresh aggregate price | Freeze price updates and make downstream integrations rely on stale data |
| `unpause-oracle` | Resumes oracle submissions | Resume only when favorable to a manipulated market condition |
| `admin-set-price` | Directly overrides the aggregated price value | Set arbitrary price to force liquidations, block borrows, or misprice collateral |

## Contract: bitflow-staking-pool.clar

| Function | What it controls | What a malicious admin could do |
|---|---|---|
| `set-reward-rate` | Sets per-block reward emission rate | Over-inflate emissions to drain reward treasury or set near-zero rewards for stakers |
| `pause-pool` | Pauses staking, unstaking flow, and reward claiming | Freeze user operations and trap users until admin chooses to unpause |
| `unpause-pool` | Resumes normal pool operations | Resume operations only under conditions favorable to admin strategy |
| `fund-rewards` | Moves admin-owned STX into reward pool | Perform deceptive low-value funding to signal false safety/liquidity confidence |
| `initialize-pool` | Sets protocol start state and reward accounting start block | Delay activation or initialize at a strategic time that benefits insider positioning |

## Contract: bitflow-vault-core-v2.clar

| Function | What it controls | What a malicious admin could do |
|---|---|---|
| `pause-protocol` | Global protocol pause switch | Freeze deposits, withdrawals, borrows, and repayments at critical moments |
| `unpause-protocol` | Resumes protocol operations after pause | Re-enable operations selectively when market conditions favor the admin |
| `set-stx-price` | Directly sets on-chain price used for borrow/liquidation checks | Set manipulated price to trigger unfair liquidations or block healthy borrowing |
| `toggle-deposits-enabled` | Enables/disables deposits | Block users from adding collateral while keeping liquidation paths active |
| `toggle-withdrawals-enabled` | Enables/disables withdrawals | Prevent users from exiting protocol even when they have available collateral |
| `toggle-borrows-enabled` | Enables/disables borrowing | Halt credit access for users while retaining admin strategic optionality |
| `toggle-liquidations-enabled` | Enables/disables liquidations | Temporarily disable liquidations to protect selected accounts from liquidation |
| `set-min-collateral-ratio` | Changes collateral requirement for all loans | Raise ratio to force riskier positions into violation or lower ratio to increase protocol insolvency risk |
| `set-liquidation-threshold` | Changes liquidation trigger threshold | Lower threshold to delay needed liquidations or raise threshold to force earlier liquidations |
| `set-interest-rate-bounds` | Changes allowable borrower-chosen interest range | Force uncompetitive loan terms or distort market pricing behavior |
| `set-term-limits` | Changes minimum and maximum loan duration | Restrict borrower flexibility or force unfavorable term structures |
| `set-late-penalty-rate` | Changes penalty on overdue repayments | Increase penalties to extract value from overdue borrowers |
| `set-liquidation-penalty-bps` | Changes penalty applied on outstanding debt during liquidation (10–2000 bps) | Increase penalty to extract additional value from liquidated borrowers or decrease to reduce liquidation cost |
| `initialize` | Sets protocol start and core timing state | Delay or strategically time launch to advantage insider activity |

## Operational trust implications

- The admin role is a central trust dependency for risk parameters, oracle behavior, and availability controls.
- Users should treat key custody, admin operational security, and governance process quality as protocol risk factors.
- Every admin function emits an `admin-action` print event so governance activity is visible on-chain.
