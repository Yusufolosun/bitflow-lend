# Deployment Guide

This guide provides step-by-step instructions for deploying the BitFlow vault-core contract to Stacks testnet and mainnet.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Testnet Deployment](#testnet-deployment)
- [Mainnet Deployment](#mainnet-deployment)
- [Post-Deployment](#post-deployment)
- [Deployment Verification](#deployment-verification)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18.0.0 | Runtime environment |
| Clarinet | ≥ 2.0.0 | Stacks development tool |
| npm | ≥ 9.0.0 | Package manager |
| Git | ≥ 2.30.0 | Version control |
| Hiro Wallet | Latest | Testnet/Mainnet wallet |

### Install Clarinet

```bash
# macOS/Linux
curl -L https://github.com/hirosystems/clarinet/releases/latest/download/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/

# Or via Homebrew (macOS)
brew install clarinet

# Windows
# Download from: https://github.com/hirosystems/clarinet/releases
# Add to PATH

# Verify installation
clarinet --version
```

### Install Dependencies

```bash
# Navigate to project root
cd bitflow-core

# Install npm packages
npm install

# Verify Clarinet configuration
clarinet check
```

---

## Environment Setup

### 1. Configure Wallets

#### Testnet Wallet

1. Install [Hiro Wallet](https://wallet.hiro.so/)
2. Create new wallet or import existing
3. Switch to Testnet network
4. Get testnet STX from [faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

**Recommended:** Request at least 10,000 STX for deployment and testing

#### Mainnet Wallet

1. Use Hiro Wallet in Mainnet mode
2. Ensure sufficient STX for:
   - Contract deployment (~0.5 STX)
   - Gas fees for testing (~1 STX)
   - Buffer for safety (2+ STX total recommended)

### 2. Environment Variables

Create `.env` files for different environments:

#### `.env.testnet`

```bash
# Network Configuration
NETWORK=testnet
STACKS_API_URL=https://api.testnet.hiro.so

# Deployer Wallet
DEPLOYER_PRIVATE_KEY=your_testnet_private_key_here
DEPLOYER_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM

# Contract Configuration
CONTRACT_NAME=vault-core

# Oracle (if integrated)
ORACLE_ADDRESS=ST2...
ORACLE_CONTRACT=price-oracle
```

#### `.env.mainnet`

```bash
# Network Configuration
NETWORK=mainnet
STACKS_API_URL=https://api.hiro.so

# Deployer Wallet
DEPLOYER_PRIVATE_KEY=your_mainnet_private_key_here
DEPLOYER_ADDRESS=SP...

# Contract Configuration
CONTRACT_NAME=vault-core

# Oracle (required for mainnet)
ORACLE_ADDRESS=SP...
ORACLE_CONTRACT=price-oracle
```

**⚠️ SECURITY WARNING:**
- Never commit `.env` files to git
- Store private keys securely (use hardware wallet for mainnet)
- Use environment-specific keys (different for testnet/mainnet)

### 3. Update `.gitignore`

```bash
# Add to .gitignore
.env
.env.*
!.env.example
*.private
secrets/
```

---

## Testnet Deployment

### Step 1: Pre-Deployment Checks

```bash
# Check contract syntax
clarinet check

# Run tests
npm test

# Verify all tests pass (should see 18/18 passing)
```

### Step 2: Prepare Contract

Review contract constants:

```clarity
;; contracts/vault-core.clar

;; Ensure these values are correct
(define-constant MIN-COLLATERAL-RATIO u150)
(define-constant LIQUIDATION-THRESHOLD u110)
```

### Step 3: Deploy Using Clarinet

```bash
# Deploy to testnet using Clarinet
clarinet deployments apply --manifest-path deployments/testnet-deployment-plan.yaml
```

**deployments/testnet-deployment-plan.yaml:**

```yaml
---
id: 1
name: Testnet Deployment
network: testnet
stacks-node: https://api.testnet.hiro.so
bitcoin-node: http://blockstream.info/testnet
plan:
  batches:
    - id: 1
      transactions:
        - contract-publish:
            contract-name: vault-core
            expected-sender: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
            cost: 50000
            path: contracts/vault-core.clar
            clarity-version: 2
            anchor-block-only: true
```

### Step 4: Alternative - Deploy Using Stacks CLI

```bash
# Install Stacks CLI if not already installed
npm install -g @stacks/cli

# Deploy contract
stx deploy-contract \
  vault-core \
  contracts/vault-core.clar \
  -t \
  --network testnet \
  -k your_private_key
```

### Step 5: Manual Deployment via Hiro Platform

1. Go to [Hiro Platform](https://platform.hiro.so/)
2. Connect Hiro Wallet (Testnet mode)
3. Create New Project → Smart Contract
4. Copy contents of `contracts/vault-core.clar`
5. Click "Deploy Contract"
6. Contract name: `vault-core`
7. Clarity version: 2
8. Confirm transaction in wallet
9. Wait for confirmation (~10 minutes)

### Step 6: Verify Deployment

```bash
# Check contract is deployed
curl https://api.testnet.hiro.so/v2/contracts/interface/ST1.../vault-core

# Expected response: Contract interface JSON
```

---

## Mainnet Deployment

### 🚨 CRITICAL MAINNET CHECKLIST

Complete ALL items before mainnet deployment:

#### Security Audit
- [ ] Third-party security audit completed
- [ ] All critical/high severity issues resolved
- [ ] Audit report reviewed and published

#### Code Quality
- [ ] All tests passing (18/18)
- [ ] Code coverage > 90%
- [ ] Static analysis completed (clarinet check)
- [ ] No compiler warnings

#### Integration Requirements
- [ ] **Oracle integrated** (CRITICAL - required for production)
- [ ] Price feed tested and verified
- [ ] Circuit breakers implemented
- [ ] Emergency pause mechanism (if applicable)

#### Documentation
- [ ] All documentation complete and reviewed
- [ ] User guides published
- [ ] API documentation finalized
- [ ] Security disclosures documented

#### Testing
- [ ] Extensive testnet testing (minimum 2 weeks)
- [ ] Real user testing completed
- [ ] Load testing performed
- [ ] Edge cases verified

#### Operational Readiness
- [ ] Monitoring infrastructure set up
- [ ] Alert system configured
- [ ] Incident response plan documented
- [ ] Support team trained

#### Legal & Compliance
- [ ] Legal review completed
- [ ] Terms of service finalized
- [ ] Privacy policy published
- [ ] Regulatory compliance verified

#### Financial
- [ ] Sufficient STX for deployment (~2 STX)
- [ ] Insurance policy considered
- [ ] Bug bounty program ready

### Step 1: Final Testing on Testnet

```bash
# Run complete test suite
npm test

# Deploy to testnet one final time
clarinet deployments apply --manifest-path deployments/testnet-deployment-plan.yaml

# Perform manual integration testing
# - Deposit test
# - Borrow test
# - Repay test
# - Liquidation test

# Monitor for 1-2 weeks minimum
```

### Step 2: Prepare Mainnet Deployment

Update deployment manifest:

**deployments/mainnet-deployment-plan.yaml:**

```yaml
---
id: 1
name: Mainnet Deployment
network: mainnet
stacks-node: https://api.hiro.so
bitcoin-node: http://blockstream.info
plan:
  batches:
    - id: 1
      transactions:
        - contract-publish:
            contract-name: vault-core
            expected-sender: SP...  # Your mainnet address
            cost: 500000  # 0.5 STX
            path: contracts/vault-core.clar
            clarity-version: 2
            anchor-block-only: true
```

### Step 3: Deploy to Mainnet

```bash
# FINAL CHECK - Ensure you're on mainnet
echo $NETWORK  # Should output: mainnet

# Deploy
clarinet deployments apply --manifest-path deployments/mainnet-deployment-plan.yaml

# Confirm transaction details carefully!
# Double-check:
# - Contract name is correct
# - Clarity code is exactly as tested
# - Network is mainnet
# - Gas fee is acceptable
```

### Step 4: Sign and Broadcast

1. Review transaction in wallet
2. **Triple-check** contract name and code
3. Confirm deployment fee
4. Sign transaction
5. Wait for confirmation (typically 10-30 minutes)

### Step 5: Monitor Deployment

```bash
# Check transaction status
curl https://api.hiro.so/extended/v1/tx/0x[transaction-id]

# Wait for "success" status
# Monitor for ~10 blocks to ensure stability
```

---

## Post-Deployment

### Immediate Actions

#### 1. Verify Contract

```bash
# Get contract interface
curl https://api.hiro.so/v2/contracts/interface/SP.../vault-core

# Test read-only functions
curl -X POST https://api.hiro.so/v2/contracts/call-read/SP.../vault-core/get-total-deposits \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "SP...",
    "arguments": []
  }'
```

#### 2. Record Deployment Details

Create `DEPLOYMENT.json`:

```json
{
  "network": "mainnet",
  "contractAddress": "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "contractName": "vault-core",
  "deploymentTx": "0x1234...",
  "deploymentBlock": 123456,
  "deploymentDate": "2026-01-25T10:30:00Z",
  "deployer": "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  "clarityVersion": 2,
  "gitCommit": "abc123...",
  "auditReport": "https://..."
}
```

#### 3. Update Frontend Configuration

```typescript
// Update frontend config
export const VAULT_CONTRACT = {
  address: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  name: 'vault-core',
  network: 'mainnet'
};
```

#### 4. Announce Deployment

- [ ] Update website with contract address
- [ ] Publish announcement on social media
- [ ] Update documentation with mainnet addresses
- [ ] Notify users and partners
- [ ] Submit to Stacks explorers

### Ongoing Monitoring

#### Set Up Monitoring

```typescript
// monitor.ts - Continuous monitoring script
import { getTotalDeposits, getTotalRepaid, getTotalLiquidations } from './contract';

async function monitor() {
  setInterval(async () => {
    const metrics = {
      totalDeposits: await getTotalDeposits(),
      totalRepaid: await getTotalRepaid(),
      totalLiquidations: await getTotalLiquidations(),
      timestamp: new Date().toISOString()
    };
    
    console.log('Contract Metrics:', metrics);
    
    // Send to monitoring service
    await sendToMonitoring(metrics);
    
    // Check for anomalies
    if (metrics.totalLiquidations > lastLiquidations + 10) {
      await alertTeam('High liquidation activity detected!');
    }
  }, 60000); // Every minute
}

monitor();
```

#### Key Metrics to Track

- Total Value Locked (TVL)
- Number of active loans
- Liquidation events
- Average health factor
- Interest accrued
- User growth

---

## Deployment Verification

### Automated Verification

```typescript
// verify-deployment.ts
import { callReadOnlyFunction } from '@stacks/transactions';

async function verifyDeployment() {
  console.log('Verifying vault-core deployment...\n');
  
  // Test 1: Contract exists
  try {
    const result = await getTotalDeposits();
    console.log('✓ Contract deployed and responsive');
  } catch (error) {
    console.error('✗ Contract not found');
    process.exit(1);
  }
  
  // Test 2: Initial state correct
  const totalDeposits = await getTotalDeposits();
  const totalRepaid = await getTotalRepaid();
  const totalLiquidations = await getTotalLiquidations();
  
  if (totalDeposits === 0 && totalRepaid === 0 && totalLiquidations === 0) {
    console.log('✓ Initial state is correct');
  } else {
    console.error('✗ Initial state incorrect');
  }
  
  // Test 3: Calculate required collateral
  const required = await calculateRequiredCollateral(1000);
  if (required === 1500) {
    console.log('✓ Collateral calculation correct (150%)');
  } else {
    console.error('✗ Collateral calculation incorrect');
  }
  
  console.log('\n✓ Deployment verification complete!');
}

verifyDeployment();
```

Run verification:

```bash
npm run verify-deployment
```

### Manual Verification Steps

1. **Check Contract on Explorer:**
   - Visit: https://explorer.hiro.so/txid/0x[tx-id]?chain=mainnet
   - Verify contract is deployed
   - Check source code matches

2. **Test Read Functions:**
   - Call `get-total-deposits` → should return `u0`
   - Call `calculate-required-collateral` with `u1000` → should return `u1500`

3. **Test Write Functions (Small Amounts):**
   - Deposit 1 STX
   - Verify balance updated
   - Withdraw 1 STX
   - Verify successful

4. **Verify Constants:**
   ```bash
   # Check MIN-COLLATERAL-RATIO = 150
   # Check LIQUIDATION-THRESHOLD = 110
   ```

---

## Troubleshooting

### Common Issues

#### Issue 1: Deployment Transaction Fails

**Symptoms:**
- Transaction rejected
- "Insufficient funds" error

**Solutions:**
```bash
# Check balance
curl https://api.hiro.so/extended/v1/address/[address]/stx

# Ensure you have:
# - Deployment cost (0.5 STX)
# - Gas fee (0.1 STX)
# - Buffer (0.5 STX)
# Total: ~1.1 STX minimum
```

#### Issue 2: Contract Not Found After Deployment

**Symptoms:**
- API returns 404
- Contract calls fail

**Solutions:**
```bash
# Wait for confirmation (10-30 minutes)
# Check transaction status
curl https://api.hiro.so/extended/v1/tx/0x[tx-id]

# Verify network (testnet vs mainnet)
echo $STACKS_API_URL
```

#### Issue 3: Clarinet Check Fails

**Symptoms:**
- Syntax errors
- Type errors

**Solutions:**
```bash
# View detailed errors
clarinet check --verbose

# Common fixes:
# - Fix syntax errors in contracts/vault-core.clar
# - Ensure Clarity version 2
# - Check for unclosed parentheses
```

#### Issue 4: Wrong Network Deployment

**Symptoms:**
- Deployed to testnet instead of mainnet (or vice versa)

**Solutions:**
```bash
# Verify current network
echo $NETWORK

# If wrong, update .env and redeploy
# Note: Cannot "undeploy" - must deploy new contract
```

#### Issue 5: High Gas Fees

**Symptoms:**
- Deployment costs more than expected

**Solutions:**
```bash
# Wait for lower network congestion
# Check current gas prices:
curl https://api.hiro.so/extended/v1/fee_rate

# Or set custom fee:
# --fee 10000  # in microSTX
```

---

## Rollback Strategy

### If Critical Bug Discovered

1. **Immediate Response:**
   - Document the bug
   - Assess severity
   - Notify users immediately

2. **Deploy Fixed Version:**
   ```bash
   # Deploy new contract with fix
   # Example: vault-core-v2
   
   # Update frontend to point to new contract
   ```

3. **Migration Plan:**
   - Allow users to withdraw from old contract
   - Encourage migration to new contract
   - Document migration process

4. **Communication:**
   - Public disclosure of bug
   - Migration instructions
   - Timeline for support of old contract

**Note:** Clarity contracts are immutable - cannot be upgraded in place. Must deploy new contract and migrate.

---

## Deployment Checklist Summary

### Testnet
- [ ] All tests passing
- [ ] Clarinet check passes
- [ ] Deployment plan configured
- [ ] Testnet STX available
- [ ] Contract deployed
- [ ] Deployment verified
- [ ] Integration testing completed

### Mainnet
- [ ] Security audit completed
- [ ] All critical checks passed
- [ ] Oracle integrated
- [ ] 2+ weeks testnet testing
- [ ] Monitoring set up
- [ ] Documentation complete
- [ ] Legal review done
- [ ] Sufficient mainnet STX
- [ ] Deployment plan final review
- [ ] Contract deployed
- [ ] Deployment verified
- [ ] Announcement published
- [ ] Monitoring active

---

## Additional Resources

- [Clarinet Documentation](https://docs.hiro.so/clarinet)
- [Stacks CLI Guide](https://docs.hiro.so/references/stacks-cli)
- [Hiro Platform](https://platform.hiro.so/)
- [Stacks Explorer](https://explorer.hiro.so/)
- [Testnet Faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

---

**Document Version:** 1.0.0  
**Last Updated:** January 25, 2026

For deployment support:
- **Discord:** [BitFlow Community](https://discord.gg/bitflow)
- **Email:** deploy@bitflow.finance

---

## Quick Reference

| Step | Command | Expected |
|------|---------|----------|
| Check contract | `clarinet check` | No errors |
| Run tests | `npm test` | All pass |
| Deploy testnet | `clarinet deployments apply -p deployments/default.testnet-plan.yaml` | TX confirmed |
| Deploy mainnet | `clarinet deployments apply -p deployments/default.mainnet-plan.yaml` | TX confirmed |
| Build frontend | `cd frontend && npm run build` | `dist/` created |

---

## Related Documentation

- [Network Config](NETWORK_CONFIG.md) — Network configuration
- [Testing Guide](TESTING.md) — Test suite documentation
