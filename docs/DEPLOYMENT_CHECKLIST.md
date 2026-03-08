# Deployment Checklist

> **Step-by-step checklist for deploying the BitFlow Lend contract.**

Use this checklist for every deployment to mainnet or testnet.

---

## Pre-Deployment

### Code Review

- [ ] All tests pass (`npm test` — 63/63)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Contract compiles without warnings (`clarinet check`)
- [ ] Code reviewed by at least one other developer
- [ ] All TODOs resolved or documented
- [ ] Version number updated in contract (`get-contract-version`)

### Security

- [ ] Re-read [Security Guide](SECURITY.md) for known considerations
- [ ] Verify no private keys or mnemonics in source code
- [ ] Confirm deployer wallet is secure (hardware wallet or multi-sig)
- [ ] Review all `stx-transfer?` calls for correctness
- [ ] Confirm post-conditions are properly set in all frontend calls
- [ ] Check all error paths return appropriate error codes

### Testing

- [ ] Unit tests pass on simnet
- [ ] Integration tests pass on devnet
- [ ] Manual testing completed on testnet
- [ ] Edge cases verified (zero amounts, max values, boundary conditions)
- [ ] Multi-user scenarios tested
- [ ] Liquidation flow tested end-to-end
- [ ] Interest calculation verified for accuracy

---

## Testnet Deployment

### Deploy

```bash
# 1. Verify Clarinet configuration
clarinet check

# 2. Deploy to testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

- [ ] Contract deployed successfully
- [ ] Contract address recorded
- [ ] Deployment transaction confirmed on explorer

### Verify on Testnet

```bash
# Check contract is accessible
curl https://stacks-node-api.testnet.stacks.co/v2/contracts/source/ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0/bitflow-vault-core
```

- [ ] Contract source is readable via API
- [ ] `get-contract-version` returns expected version
- [ ] `get-protocol-stats` returns zeroed initial state

### Functional Verification on Testnet

- [ ] Deposit works (small amount)
- [ ] `get-user-deposit` returns correct balance
- [ ] Borrow works with valid collateral ratio
- [ ] Borrow rejected with insufficient collateral (error u105)
- [ ] `get-repayment-amount` shows correct interest
- [ ] Repay works and clears loan
- [ ] Withdraw works after loan is cleared
- [ ] Liquidation works on undercollateralized position

---

## Mainnet Deployment

### Pre-Flight

- [ ] Testnet deployment completed and verified
- [ ] Deployer wallet funded with sufficient STX for gas (~1 STX)
- [ ] Deployment plan reviewed (`deployments/default.mainnet-plan.yaml`)
- [ ] Team notified of deployment window

### Deploy

```bash
# 1. Final check
clarinet check

# 2. Run pre-deployment script
./scripts/pre-deployment-check.sh

# 3. Deploy to mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

- [ ] Deployment transaction submitted
- [ ] Transaction ID recorded: `___________________________`
- [ ] Transaction confirmed (check explorer)
- [ ] Contract address verified: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193`

### Initialize

```bash
# Initialize the contract (owner-only, one-time)
./scripts/initialize-mainnet.sh
```

- [ ] Initialize transaction submitted
- [ ] Initialize transaction confirmed
- [ ] `initialized` variable is `true`

### Post-Deployment Verification

```bash
# Verify contract
curl https://stacks-node-api.mainnet.stacks.co/v2/contracts/source/SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193/bitflow-vault-core
```

- [ ] Contract source matches expected code
- [ ] `get-contract-version` returns "1.0.0"
- [ ] `get-protocol-stats` returns zeroed state
- [ ] Read-only functions accessible via API

---

## Frontend Deployment

### Configuration

- [ ] Contract address updated in frontend config
- [ ] Network configuration set to mainnet
- [ ] Explorer links point to mainnet
- [ ] Error messages display correctly

### Build & Deploy

```bash
cd frontend
npm run build
# Deploy dist/ to hosting provider
```

- [ ] Production build succeeds with no errors
- [ ] Bundle size is acceptable
- [ ] All environment variables set correctly

### Smoke Test

- [ ] Landing page loads
- [ ] Wallet connection works
- [ ] Deposit form displays correctly
- [ ] Read-only data loads (protocol stats)
- [ ] Transaction submission works (small deposit)

---

## Post-Deployment

### Monitoring

- [ ] Set up block explorer alerts for the contract address
- [ ] Monitor first 10 transactions for expected behavior
- [ ] Watch for unexpected error patterns
- [ ] Track gas costs vs. estimates

### Documentation

- [ ] Update README with deployment status
- [ ] Record deployment details in CHANGELOG
- [ ] Update API documentation if needed
- [ ] Notify community/users of availability

### Rollback Plan

If issues are discovered post-deployment:

1. **Frontend**: Revert to previous contract address in config
2. **Users**: Guide users to withdraw from problematic contract
3. **Communication**: Post incident report

> **Note**: Clarity contracts cannot be modified after deployment. A "rollback" means deploying a fixed version and migrating users. See [Migration Guide](MIGRATION_GUIDE.md).

---

## Quick Reference

| Step | Command | Expected |
|------|---------|----------|
| Check contract | `clarinet check` | No errors |
| Run tests | `npm test` | 63/63 pass |
| Deploy testnet | `clarinet deployments apply -p deployments/default.testnet-plan.yaml` | TX confirmed |
| Deploy mainnet | `clarinet deployments apply -p deployments/default.mainnet-plan.yaml` | TX confirmed |
| Build frontend | `cd frontend && npm run build` | `dist/` created |

---

## Related Documentation

- [Deployment Guide](DEPLOYMENT.md) — Detailed deployment procedures
- [Network Config](NETWORK_CONFIG.md) — Network settings
- [Migration Guide](MIGRATION_GUIDE.md) — Version migration
- [Testing Guide](TESTING.md) — Test suite documentation
- [Security Guide](SECURITY.md) — Security considerations
