# BitFlow Lend - Testnet Contract Testing Guide
## 20 Ready-to-Use Explorer Examples

**Contract Address:** `ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core`  
**Network:** Stacks Testnet  
**Explorer:** https://explorer.hiro.so/txid/ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core?chain=testnet

---

## READ-ONLY FUNCTIONS (No STX Required)

### 1. Get Contract Version
**Function:** `get-contract-version`  
**Parameters:** None  
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-contract-version)
```
**Expected Result:** `"1.0.0"`

---

### 2. Get Total Deposits
**Function:** `get-total-deposits`  
**Parameters:** None  
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-deposits)
```
**Expected Result:** Returns total STX deposited (in micro-STX)

---

### 3. Get Total Repaid
**Function:** `get-total-repaid`  
**Parameters:** None  
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-repaid)
```
**Expected Result:** Returns total STX repaid (in micro-STX)

---

### 4. Get Total Liquidations
**Function:** `get-total-liquidations`  
**Parameters:** None  
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-liquidations)
```
**Expected Result:** Returns total number of liquidations

---

### 5. Get Protocol Stats
**Function:** `get-protocol-stats`  
**Parameters:** None  
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-protocol-stats)
```
**Expected Result:** Returns tuple with total-deposits, total-repaid, total-liquidations

---

### 6. Get User Deposit (Check Your Balance)
**Function:** `get-user-deposit`  
**Parameters:** `user` (principal)  
**Example - Check deployer's deposit:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-user-deposit 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)
```
**Example - Check your own deposit (replace with your address):**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-user-deposit 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```
**Expected Result:** Returns deposit amount in micro-STX (0 if no deposit)

---

### 7. Get User Loan
**Function:** `get-user-loan`  
**Parameters:** `user` (principal)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-user-loan 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)
```
**Expected Result:** Returns loan details tuple or none

---

### 8. Calculate Required Collateral for 100 STX Borrow
**Function:** `calculate-required-collateral`  
**Parameters:** `borrow-amount` (uint)  
**Example - For borrowing 100 STX:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core calculate-required-collateral u100000000)
```
**Expected Result:** `u150000000` (150 STX required for 150% collateralization)

---

### 9. Calculate Required Collateral for 1,000 STX Borrow
**Function:** `calculate-required-collateral`  
**Parameters:** `borrow-amount` (uint)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core calculate-required-collateral u1000000000)
```
**Expected Result:** `u1500000000` (1,500 STX required)

---

### 10. Get Max Borrow Amount
**Function:** `get-max-borrow-amount`  
**Parameters:** `user` (principal)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-max-borrow-amount 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)
```
**Expected Result:** Returns maximum borrowable amount based on user's deposit

---

### 11. Calculate Health Factor
**Function:** `calculate-health-factor`  
**Parameters:** `user` (principal), `stx-price` (uint)  
**Example - Check health with STX at $1.00:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core calculate-health-factor 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0 u100)
```
**Expected Result:** Returns health factor (>110 is healthy, <110 is liquidatable)

---

### 12. Check if Liquidatable
**Function:** `is-liquidatable`  
**Parameters:** `user` (principal), `stx-price` (uint)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core is-liquidatable 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0 u100)
```
**Expected Result:** Returns `true` if liquidatable, `false` if healthy

---

### 13. Get Repayment Amount
**Function:** `get-repayment-amount`  
**Parameters:** `user` (principal)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-repayment-amount 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)
```
**Expected Result:** Returns tuple with principal, interest, and total repayment amount

---

### 14. Get Protocol Metrics
**Function:** `get-protocol-metrics`  
**Parameters:** None  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-protocol-metrics)
```
**Expected Result:** Returns tuple with total-deposits, total-borrows, total-repayments, total-liquidations, total-withdrawals

---

## WRITE FUNCTIONS (Requires STX and Gas Fees)

### 15. Deposit 10 STX
**Function:** `deposit`  
**Parameters:** `amount` (uint in micro-STX)  
**Example - Deposit 10 STX:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u10000000)
```
**Cost:** 10 STX + gas fees  
**Expected Result:** `(ok true)`

---

### 16. Deposit 100 STX
**Function:** `deposit`  
**Parameters:** `amount` (uint in micro-STX)  
**Example - Deposit 100 STX:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u100000000)
```
**Cost:** 100 STX + gas fees  
**Expected Result:** `(ok true)`

---

### 17. Deposit 1,000 STX
**Function:** `deposit`  
**Parameters:** `amount` (uint in micro-STX)  
**Example - Deposit 1,000 STX:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u1000000000)
```
**Cost:** 1,000 STX + gas fees  
**Expected Result:** `(ok true)`

---

### 18. Borrow 50 STX (5% APR, 30 days)
**Function:** `borrow`  
**Parameters:** `amount` (uint), `interest-rate` (uint in basis points), `term-days` (uint)  
**Prerequisites:** Must have at least 75 STX deposited (150% collateral)  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u50000000 u500 u30)
```
- **Amount:** 50 STX (u50000000 micro-STX)
- **Interest Rate:** 5% APR (u500 = 500 basis points)
- **Term:** 30 days

**Expected Result:** `(ok true)` - 50 STX sent to your wallet

---

### 19. Borrow 100 STX (10% APR, 90 days)
**Function:** `borrow`  
**Parameters:** `amount` (uint), `interest-rate` (uint), `term-days` (uint)  
**Prerequisites:** Must have at least 150 STX deposited  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u100000000 u1000 u90)
```
- **Amount:** 100 STX
- **Interest Rate:** 10% APR (u1000 basis points)
- **Term:** 90 days

**Expected Result:** `(ok true)`

---

### 20. Borrow 500 STX (7.5% APR, 60 days)
**Function:** `borrow`  
**Parameters:** `amount` (uint), `interest-rate` (uint), `term-days` (uint)  
**Prerequisites:** Must have at least 750 STX deposited  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u500000000 u750 u60)
```
- **Amount:** 500 STX
- **Interest Rate:** 7.5% APR (u750 basis points)
- **Term:** 60 days

**Expected Result:** `(ok true)`

---

## BONUS EXAMPLES

### 21. Withdraw 25 STX
**Function:** `withdraw`  
**Parameters:** `amount` (uint in micro-STX)  
**Prerequisites:** Must have deposited STX and no active loan  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core withdraw u25000000)
```
**Expected Result:** `(ok true)` - 25 STX returned to your wallet

---

### 22. Repay Loan
**Function:** `repay`  
**Parameters:** None (automatically calculates principal + interest)  
**Prerequisites:** Must have an active loan  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core repay)
```
**Expected Result:** `(ok { principal: uint, interest: uint, total: uint })`

---

### 23. Liquidate Undercollateralized Loan
**Function:** `liquidate`  
**Parameters:** `borrower` (principal), `stx-price` (uint)  
**Prerequisites:** Target borrower must have health factor < 110%  
**Example:**
```clarity
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core liquidate 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM u100)
```
**Expected Result:** `(ok { seized-collateral: uint, paid: uint, bonus: uint })`

---

## Quick Reference - STX Conversion

| STX Amount | Micro-STX Value |
|------------|----------------|
| 1 STX | u1000000 |
| 10 STX | u10000000 |
| 50 STX | u50000000 |
| 100 STX | u100000000 |
| 500 STX | u500000000 |
| 1,000 STX | u1000000000 |
| 5,000 STX | u5000000000 |
| 10,000 STX | u10000000000 |

## Interest Rate Conversion (Basis Points)

| APR | Basis Points |
|-----|-------------|
| 1% | u100 |
| 5% | u500 |
| 7.5% | u750 |
| 10% | u1000 |
| 15% | u1500 |
| 25% | u2500 |
| 50% | u5000 |
| 100% | u10000 (max) |

## Testing Workflow

### Step 1: Start with Read-Only Functions
Test examples 1-14 to check contract state (no cost)

### Step 2: Make Your First Deposit
Use example 15 or 16 (requires testnet STX)

### Step 3: Check Your Deposit
Use example 6 with your address

### Step 4: Calculate Borrowing Power
Use example 10 with your address

### Step 5: Take a Loan
Use example 18, 19, or 20 (based on your deposit)

### Step 6: Check Loan Details
Use example 7 and 13 with your address

### Step 7: Check Repayment Amount
Use example 13 with your address

### Step 8: Repay Loan
Use example 22

### Step 9: Withdraw Funds
Use example 21

---

## Error Codes Reference

| Error Code | Constant | Meaning |
|-----------|----------|---------|
| u101 | ERR-INSUFFICIENT-BALANCE | Not enough deposited STX |
| u102 | ERR-INVALID-AMOUNT | Amount must be > 0 |
| u103 | ERR-ALREADY-HAS-LOAN | User already has active loan |
| u105 | ERR-INSUFFICIENT-COLLATERAL | Need 150% collateral ratio |
| u106 | ERR-NO-ACTIVE-LOAN | No active loan to repay |
| u107 | ERR-NOT-LIQUIDATABLE | Health factor > 110% |
| u108 | ERR-LIQUIDATE-OWN-LOAN | Cannot liquidate own loan |
| u110 | ERR-INVALID-INTEREST-RATE | Rate exceeds 100% APR |
| u111 | ERR-INVALID-TERM | Term must be 1-365 days |

---

**Happy Testing! 🚀**

Need testnet STX? Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
