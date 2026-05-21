# Production Deployment Checklist

Pre-deployment verification checklist for BitFlow Lend mainnet releases.

---

## Pre-Deployment

### Smart Contracts
- [ ] All contract tests pass (`npm test`)
- [ ] `clarinet check` reports no errors
- [ ] Contract versions match `CHANGELOG.md` release
- [ ] Admin functions restricted to `contract-owner`
- [ ] Protocol parameters have safe bounds (collateral ratio, interest rates, term limits)
- [ ] Price staleness threshold configured correctly
- [ ] Per-user deposit caps set appropriately
- [ ] Emergency pause/unpause tested and functional

### Security
- [ ] No secrets in repository (`.gitignore` reviewed)
- [ ] Tracked config secret scan passes (`npm run security:scan`)
- [ ] CSP meta tag configured in `index.html`
- [ ] `frame-ancestors 'none'` prevents clickjacking
- [ ] Source maps set to `'hidden'` (not exposed to users)
- [ ] Post-conditions enforced on all STX transfers (`PostConditionMode.Deny`)
- [ ] Oracle price sanity bounds active
- [ ] Liquidation threshold < collateral ratio invariant verified

### Frontend
- [ ] Production build succeeds (`cd frontend && npm run build`)
- [ ] No TypeScript errors (`tsc --noEmit`)
- [ ] Bundle size within acceptable limits
- [ ] Environment variables set for mainnet
- [ ] Network indicator shows correct network
- [ ] ErrorBoundary wraps application root
- [ ] All accessibility checks pass (skip-to-content, aria attributes)

### Testing
- [ ] Contract test suite: 60+ test files passing
- [ ] Frontend component tests passing
- [ ] Hook and utility tests passing
- [ ] Manual wallet connect/disconnect tested
- [ ] Deposit → Borrow → Repay lifecycle tested end-to-end
- [ ] Liquidation flow tested with price drop scenario

---

### Contract Deployment
1. [ ] Configure deployer wallet in `settings/Mainnet.toml` with plain mnemonic (and secure it post-deploy).
2. [ ] Ensure deployer wallet is funded with sufficient STX (estimated 0.066 STX + headroom for init txs).
3. [ ] Execute deployment orchestration script: `bash scripts/deploy-v3-suite.sh --network mainnet`.
4. [ ] Verify all 9 pre-flight safety gates pass (git tree, contract syntax, tests, API, balance, secret scan).

### Post-Deployment Initialization (9-Step Protocol)
1. [ ] Call `initialize-oracle` on `bitflow-oracle-registry-v3`.
2. [ ] Add whitelisted price reporters using `add-reporter` (minimum 2 reporters required).
3. [ ] Bootstrap initial Oracle price using `admin-set-price`.
4. [ ] Call `initialize-pool` on `bitflow-staking-pool-v3` to start the block yield tracker.
5. [ ] Call `set-reward-rate` on the staking pool to specify STX yield emission per block.
6. [ ] Call `fund-rewards` to transfer yield-incentive STX tokens to the staking pool contract.
7. [ ] Call `initialize` on `bitflow-vault-core-v3` to set epoch limits and start blocks.
8. [ ] Call `set-stx-price` on the vault core to sync the initial oracle consensus price.
9. [ ] Run `get-dashboard-snapshot` on all 3 contracts to verify TVL, stats, and operational indicators.

---

## Post-Deployment

### Verification
- [ ] Contract functions callable from explorer and SDK
- [ ] Frontend loads and displays protocol stats using the V3 mainnet addresses
- [ ] Wallet connect works on mainnet
- [ ] Test deposit with small amount (0.1 STX)
- [ ] Dashboard snapshot returns correct data
- [ ] Oracle price feed updating correctly
- [ ] Staking rewards accruing as expected

### Monitoring
- [ ] Set up price staleness alerts (>144 blocks without update)
- [ ] Monitor utilization ratio (alert if >90%)
- [ ] Track error rates in frontend error boundary
- [ ] Watch contract event logs for unexpected patterns
- [ ] Set up uptime monitoring for frontend

### Rollback Plan
- [ ] Protocol pause procedure documented
- [ ] Admin wallet accessible for emergency pause
- [ ] Previous contract addresses recorded for rollback reference
- [ ] Frontend rollback procedure documented (revert deployment)

---

**Document Version:** 3.0.0
**Last Updated:** May 21, 2026
