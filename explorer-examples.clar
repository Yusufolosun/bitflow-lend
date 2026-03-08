// BITFLOW LEND - QUICK COPY-PASTE EXAMPLES FOR EXPLORER
// Contract: ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core
// Network: Testnet
// Explorer: https://explorer.hiro.so/txid/ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core?chain=testnet

// ========================================
// READ-ONLY FUNCTIONS (Free - No STX Required)
// ========================================

// 1. Get Contract Version
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-contract-version)

// 2. Get Total Deposits
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-deposits)

// 3. Get Total Repaid
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-repaid)

// 4. Get Total Liquidations
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-total-liquidations)

// 5. Get Protocol Stats
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-protocol-stats)

// 6. Get Protocol Metrics
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-protocol-metrics)

// 7. Get Volume Metrics
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-volume-metrics)

// 8. Check Your Deposit (replace address with yours)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-user-deposit 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)

// 9. Check Your Loan (replace address with yours)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-user-loan 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)

// 10. Calculate Required Collateral for 100 STX
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core calculate-required-collateral u100000000)

// 11. Get Max Borrow Amount (replace address)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-max-borrow-amount 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)

// 12. Calculate Health Factor (STX price = $1.00)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core calculate-health-factor 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0 u100)

// 13. Check if Liquidatable
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core is-liquidatable 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0 u100)

// 14. Get Repayment Amount
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core get-repayment-amount 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0)


// ========================================
// WRITE FUNCTIONS (Requires STX + Gas)
// ========================================

// 15. Deposit 10 STX
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u10000000)

// 16. Deposit 100 STX
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u100000000)

// 17. Deposit 1,000 STX
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core deposit u1000000000)

// 18. Borrow 50 STX (5% APR, 30 days) - requires 75 STX deposited
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u50000000 u500 u30)

// 19. Borrow 100 STX (10% APR, 90 days) - requires 150 STX deposited
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u100000000 u1000 u90)

// 20. Borrow 500 STX (7.5% APR, 60 days) - requires 750 STX deposited
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core borrow u500000000 u750 u60)

// 21. Withdraw 25 STX (must have no active loan)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core withdraw u25000000)

// 22. Repay Loan (automatically calculates principal + interest)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core repay)

// 23. Liquidate Undercollateralized Loan (replace borrower address)
(contract-call? 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0.bitflow-vault-core liquidate 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM u100)


// ========================================
// QUICK REFERENCE
// ========================================

// STX to Micro-STX Conversion:
// 1 STX = u1000000
// 10 STX = u10000000
// 100 STX = u100000000
// 1,000 STX = u1000000000

// Interest Rate (Basis Points):
// 1% APR = u100
// 5% APR = u500
// 10% APR = u1000
// 25% APR = u2500
// 100% APR = u10000 (max)

// Loan Terms:
// Min: 1 day (u1)
// Max: 365 days (u365)

// Collateralization Ratio: 150%
// Liquidation Threshold: 110%
