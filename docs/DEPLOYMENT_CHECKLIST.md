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

## Deployment

### Contract Deployment
1. [ ] Set deployer wallet with sufficient STX for deployment fees
2. [ ] Deploy contracts in order: oracle-registry → staking-pool → vault-core-v2
3. [ ] Call `initialize` on each contract
4. [ ] Set initial STX price via `set-stx-price`
5. [ ] Set initial reward rate on staking pool via `set-reward-rate`
6. [ ] Add oracle reporters via `add-reporter`
7. [ ] Verify all `get-contract-version` calls return expected values

### Frontend Deployment
1. [ ] Build production bundle: `npm run build`
2. [ ] Deploy to hosting provider (Vercel, Netlify, etc.)
3. [ ] Verify correct contract addresses in production config
4. [ ] Test wallet connection on production URL
5. [ ] Verify API endpoints resolve correctly

---

## Post-Deployment

### Verification
- [ ] Contract functions callable from explorer
- [ ] Frontend loads and displays protocol stats
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

**Document Version:** 1.0.0
**Last Updated:** March 14, 2026
