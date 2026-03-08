# Troubleshooting Guide

> **Solutions for common issues when using BitFlow Lend.**

If you're experiencing problems, find your issue below. Each section includes the symptom, cause, and step-by-step fix.

---

## Quick Diagnostics

Before diving into specific issues, check these basics:

| Check | How | Expected |
|---|---|---|
| Wallet connected? | Look for address in top-right | `SP...` address visible |
| Correct network? | Check wallet settings | **Mainnet** selected |
| STX balance? | Check wallet or dashboard | Balance > 0 |
| Browser supported? | Chrome, Firefox, Brave, Edge | Modern browser, updated |
| Internet connection? | Try loading another site | Working connection |

---

## Deposit Issues

### "ERR-INVALID-AMOUNT" (Error u102)

**Symptom:** Transaction fails when trying to deposit.

**Cause:** You entered 0 or a negative amount.

**Fix:**
1. Enter an amount greater than 0
2. Make sure the input field contains a valid number (no letters or special characters)
3. Try again

### Deposit transaction stuck at "pending"

**Symptom:** You confirmed the deposit but it's been pending for more than 20 minutes.

**Cause:** Network congestion or low fee.

**Fix:**
1. Check your transaction on the [Stacks Explorer](https://explorer.hiro.so)
2. Search for your address: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193`
3. If the transaction is in the mempool, wait — it will eventually be mined or dropped
4. Stacks blocks average ~10 minutes, but can take 30+ minutes during congestion
5. If it disappears from the mempool after ~24 hours, try again

### Deposit succeeded but balance not updating

**Symptom:** Transaction confirmed on the explorer but the dashboard still shows old balance.

**Cause:** The frontend hasn't polled the new state yet.

**Fix:**
1. Wait 10 seconds for auto-refresh
2. Refresh the browser page (Ctrl+R / Cmd+R)
3. Disconnect and reconnect your wallet
4. Check the explorer directly — if the transaction was successful, your funds are safe

---

## Borrow Issues

### "ERR-INSUFFICIENT-COLLATERAL" (Error u105)

**Symptom:** Can't borrow the requested amount.

**Cause:** Your deposit is less than 150% of the borrow amount.

**Fix:**
1. Check your deposit balance on the dashboard
2. Calculate: `max borrow = deposit / 1.5`
3. Either deposit more STX first, or borrow a smaller amount

**Example:**
- Your deposit: 10 STX
- Max borrow: 10 / 1.5 = 6.66 STX
- If you tried to borrow 7 STX → error

### "ERR-ALREADY-HAS-LOAN" (Error u103)

**Symptom:** Can't borrow because you already have an active loan.

**Cause:** BitFlow allows one loan per user at a time.

**Fix:**
1. Check the Repay card for your active loan details
2. Repay your current loan first
3. After repayment confirms, you can borrow again

### "ERR-INVALID-INTEREST-RATE" (Error u110)

**Symptom:** Borrow fails with interest rate error.

**Cause:** Interest rate exceeds the maximum of 10,000 basis points (100% APR).

**Fix:**
1. The rate is in **basis points**: 100 = 1%, 500 = 5%, 1000 = 10%
2. Keep the rate between 1 and 10,000
3. Typical rates: 300–800 (3%–8% APR)

### "ERR-INVALID-TERM" (Error u111)

**Symptom:** Borrow fails with term error.

**Cause:** Loan term is outside the 1–365 day range.

**Fix:**
1. Choose a term between 1 and 365 days
2. Use the preset buttons (7, 30, 90, 365 days) to avoid errors

---

## Repayment Issues

### "ERR-NO-ACTIVE-LOAN" (Error u106)

**Symptom:** Can't repay because no loan exists.

**Cause:** You either already repaid, were liquidated, or never had a loan.

**Fix:**
1. Check the Repay card — if it shows "No active loan," you're clear
2. Check transaction history for a recent repayment or liquidation event
3. If you believe this is wrong, check the explorer for your address

### Not enough STX to repay

**Symptom:** You have an active loan but your wallet balance is less than the repayment amount.

**Cause:** Your wallet doesn't have enough STX to cover principal + interest.

**Fix:**
1. Check the total repayment amount in the Repay card
2. Buy or transfer more STX to your wallet
3. Once your balance covers the total (principal + interest + ~0.002 STX for gas), try again

### Interest higher than expected

**Symptom:** The repayment amount is more than you anticipated.

**Cause:** Interest accrues every block. The longer you wait, the more interest accumulates.

**Fix:**
1. This is expected behavior — interest grows over time
2. Use the formula: `interest = principal × rate × blocks / (100 × 52560)`
3. Repay sooner to minimize interest costs
4. See [Interest Calculator](INTEREST_CALCULATOR.md) for detailed examples

---

## Health Factor Warnings

### Health factor showing warning (110%–150%)

**Symptom:** Dashboard shows a yellow/amber warning on your health factor.

**Cause:** Your collateral-to-debt ratio is getting close to the liquidation threshold.

**Fix (choose one or both):**
1. **Add collateral:** Deposit more STX to increase your health factor
2. **Repay loan:** Pay back some or all of your loan to reduce debt

### Health factor below 110% — at risk of liquidation

**Symptom:** Dashboard shows a red danger indicator.

**Cause:** Your loan is undercollateralized and can be liquidated by anyone.

**Fix:**
1. **Repay immediately** — This is the safest option
2. If you can't repay, deposit more STX now to raise the health factor above 110%
3. Act quickly — once your health drops below 110%, any user can liquidate you

### Was I liquidated?

**Symptom:** Your deposit shows 0 and your loan disappeared.

**Cause:** Another user liquidated your undercollateralized loan.

**How to confirm:**
1. Check transaction history for a "Liquidation" event
2. Look on the [Stacks Explorer](https://explorer.hiro.so) for your address
3. Look for a `liquidate` contract call involving your principal

**What happened:**
- The liquidator paid off your debt + a 5% bonus
- They received your collateral (deposit)
- Your loan was deleted and deposit was zeroed
- You keep the STX you originally borrowed

---

## Display Issues

### Dashboard shows "NaN" values

**Symptom:** Some stats show "NaN STX" instead of numbers.

**Cause:** This was a known bug in versions before 1.0.1 where Clarity value objects weren't converted properly.

**Fix:**
1. Make sure you're using the latest version of the app
2. Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
3. Clear browser cache if the issue persists

### Wallet balance doesn't match explorer

**Symptom:** The balance shown in the app differs from the Stacks Explorer.

**Cause:** The app polls balances periodically (~10 seconds). There may be a brief delay.

**Fix:**
1. Wait 10 seconds for the next refresh
2. Refresh the page
3. If the difference persists, disconnect and reconnect your wallet

### Page is blank or won't load

**Symptom:** White screen, loading spinner that never stops, or JavaScript errors.

**Fix:**
1. Try a hard refresh: Ctrl+Shift+R
2. Clear browser cache and cookies for the site
3. Try a different browser
4. Disable browser extensions (especially ad blockers)
5. Check browser console (F12) for error messages

---

## Network Issues

### "Network request failed"

**Symptom:** Error toast showing network failure.

**Cause:** The Hiro API endpoint is unreachable.

**Fix:**
1. Check your internet connection
2. Try again in a few minutes — the API may be temporarily down
3. Check [Hiro Status](https://status.hiro.so) for outages
4. If persistent, try a VPN

### Wrong network (testnet vs mainnet)

**Symptom:** Address starts with `ST` instead of `SP`, or transactions go to the wrong contract.

**Cause:** Your wallet is set to testnet.

**Fix:**
1. Open your wallet (Leather or Xverse)
2. Go to Settings → Network
3. Switch to **Mainnet**
4. Refresh the BitFlow app
5. Your address should now start with `SP`

---

## Transaction Failures

Detailed scenarios for when transactions fail on-chain.

### Scenario 1: Transaction rejected by wallet

**What happens:** You click a button, the wallet popup appears, but you get an error before confirming.

**Possible causes:**
- Post-conditions mismatch (wallet detects unexpected token transfers)
- Contract address doesn't match expected format

**Fix:** Ensure the app is pointing to the correct mainnet contract. Try disconnecting and reconnecting your wallet.

### Scenario 2: Transaction broadcasts but fails on-chain

**What happens:** You confirm in your wallet, the transaction appears on the explorer, but its status is "Failed" or "Aborted".

**How to diagnose:**
1. Go to the [Stacks Explorer](https://explorer.hiro.so)
2. Search for the transaction ID
3. Look at the "Result" field — it will show the error code (e.g., `(err u105)`)
4. Cross-reference with the [Error Codes Reference](ERRORS.md)

**Common error codes:**

| Error | Meaning | Quick Fix |
|---|---|---|
| `u101` | Insufficient balance for withdrawal | Withdraw less or check deposit |
| `u102` | Invalid amount (0 or negative) | Enter a positive number |
| `u103` | Already has a loan | Repay existing loan first |
| `u105` | Not enough collateral | Deposit more or borrow less |
| `u106` | No active loan | You have nothing to repay |
| `u107` | Not liquidatable | Health factor is above 110% |
| `u108` | Can't self-liquidate | Use a different address |

### Scenario 3: Transaction stuck in mempool

**What happens:** Transaction was broadcasted but hasn't been mined after 30+ minutes.

**Cause:** Network congestion, or the transaction fee was set too low by the wallet.

**Fix:**
1. Check the mempool explorer for your pending transaction
2. Most transactions will eventually be mined (within 1–2 hours during congestion)
3. If you used Leather wallet, it automatically sets competitive fees
4. Some wallets allow you to "speed up" a pending transaction with a higher fee
5. If the transaction is dropped from the mempool (usually after ~24 hours), try again

### Scenario 4: Transaction succeeds but UI shows error

**What happens:** The explorer shows the transaction succeeded, but the app displays a failure toast.

**Cause:** The frontend lost connection to the API during polling, or there was a timeout.

**Fix:**
1. Verify on the explorer that the transaction was successful
2. Refresh the app page
3. Your balances will update on the next polling cycle (~10 seconds)
4. The blockchain state is the source of truth — if the explorer says success, it succeeded

### Scenario 5: Double-click causing duplicate transaction

**What happens:** You accidentally sent two identical transactions.

**Cause:** Clicking the button twice before the wallet popup appeared, or popup was slow.

**Prevention:**
- The app disables buttons during pending transactions (loading state)
- Always wait for the wallet popup before clicking again

**Recovery:**
- If both transactions go through (e.g., two deposits), both are valid — your total deposit is the sum
- If the second fails (e.g., two borrows), only the first succeeds because `ERR-ALREADY-HAS-LOAN` blocks the second

### Scenario 6: Insufficient STX for gas fee

**What happens:** Transaction fails because you don't have enough STX to cover the transaction fee.

**Cause:** Your entire balance is allocated to the operation, leaving nothing for gas.

**Fix:**
1. Keep at least 0.01 STX in your wallet for gas fees
2. If depositing, deposit slightly less than your full balance
3. Gas costs are typically 0.001–0.003 STX per transaction

### Scenario 7: Contract call with wrong parameters

**What happens:** Transaction fails with an unexpected error.

**Cause:** The frontend passed incorrect parameter types or values.

**Fix:**
1. Clear browser cache and reload the app
2. Ensure you're using the latest version
3. If building a custom integration, check that all amounts are in microSTX (multiply by 1,000,000)
4. Check parameter types: amounts are `uint`, addresses are `principal`

### Scenario 8: Nonce conflict

**What happens:** Transaction fails with a nonce-related error.

**Cause:** You sent multiple transactions rapidly, and they have conflicting nonces.

**Fix:**
1. Wait for all pending transactions to confirm or fail
2. If stuck, some wallets let you reset the nonce
3. As a last resort, disconnect wallet, clear browser data, and reconnect

---

## Wallet Connection Issues

Problems connecting or maintaining a wallet connection.

### Wallet popup doesn't appear

**Symptom:** You click "Connect Wallet" but nothing happens.

**Possible causes:**
1. **Wallet extension not installed** — Install [Leather](https://leather.io) or [Xverse](https://xverse.app)
2. **Extension disabled** — Check your browser's extension manager (chrome://extensions)
3. **Popup blocked** — Your browser may be blocking the wallet popup. Allow popups for the BitFlow site
4. **Multiple wallet extensions** — If you have both Leather and Xverse, the app picks the first detected. Try disabling one

**Fix:**
1. Verify the wallet extension icon appears in your browser toolbar
2. Click the wallet extension icon directly to make sure it opens
3. Try the connect button again
4. If using Brave browser, check Shields settings — they can block wallet popups

### Wallet connects but shows wrong address

**Symptom:** The displayed address doesn't match what you expect.

**Cause:** You may have multiple accounts in your wallet.

**Fix:**
1. Open your wallet extension
2. Switch to the correct account
3. Disconnect from BitFlow and reconnect
4. The app uses whichever account is currently active in the wallet

### Wallet disconnects unexpectedly

**Symptom:** You were connected, but after navigating or waiting, the app shows "Connect Wallet" again.

**Cause:** Session expired or browser cleared storage.

**Fix:**
1. Click "Connect Wallet" again — it should reconnect instantly
2. If using incognito/private mode, sessions don't persist across page reloads
3. Check that your browser isn't set to clear site data on close
4. Some privacy extensions (uBlock Origin, Privacy Badger) can interfere with session storage

### "User rejected the connection request"

**Symptom:** Error message after the wallet popup appeared.

**Cause:** You clicked "Cancel" or "Deny" in the wallet popup.

**Fix:** Simply try connecting again and click "Approve" or "Connect" in the wallet popup.

### Leather wallet not detected

**Symptom:** The connect button only shows Xverse, or no wallet options.

**Fix:**
1. Make sure Leather is installed and enabled
2. Refresh the page after installing or enabling the extension
3. Leather works on Chrome, Brave, Firefox, and Edge
4. Try going to https://leather.io to verify the extension is working

### Xverse wallet not detected

**Symptom:** Similar to above but for Xverse.

**Fix:**
1. Xverse is primarily a mobile wallet but has a browser extension
2. Install the Xverse browser extension from your browser's extension store
3. Refresh the page after installation
4. Xverse supports Chrome and Brave browsers

### Connected but balance shows 0

**Symptom:** Wallet is connected and address is visible, but STX balance shows 0.

**Possible causes:**
1. **New wallet** — You haven't received any STX yet
2. **Wrong network** — Wallet is on testnet but app expects mainnet
3. **API delay** — Balance hasn't loaded yet

**Fix:**
1. Check your balance directly on the [Stacks Explorer](https://explorer.hiro.so) by searching your address
2. Verify your wallet is on Mainnet
3. Wait 10 seconds for the balance to load
4. If your wallet is new, purchase STX from an exchange and transfer it

---

## Related Documentation

- [Error Codes Reference](ERRORS.md) — All error codes explained
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Understanding health factors
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — How liquidation works
- [Safety Best Practices](SAFETY.md) — Protect your funds
- [FAQ](FAQ.md) — Frequently asked questions
