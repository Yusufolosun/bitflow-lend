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
