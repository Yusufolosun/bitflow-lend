# Safety & Security Best Practices

> **Protect your funds and stay safe while using BitFlow Lend.**

This guide covers security practices for users interacting with the BitFlow protocol. For protocol-level security analysis, see [SECURITY.md](SECURITY.md).

---

## Wallet Security

### Seed Phrase Protection

Your seed phrase (recovery phrase) is the master key to ALL your funds. If someone gets it, they control everything.

**Rules:**
- **Never share your seed phrase** — Not with support, not with anyone claiming to be BitFlow team
- **Never enter your seed phrase on any website** — Only in your wallet app during initial setup or recovery
- **Write it down on paper** — Store in a fireproof safe or safety deposit box
- **Never store digitally** — Not in notes apps, emails, screenshots, cloud storage, or password managers
- **Never type it in a text message** — Not on Discord, Telegram, Twitter DMs, or email

**If compromised:**
1. Immediately create a new wallet with a new seed phrase
2. Transfer all assets to the new wallet
3. Abandon the compromised wallet entirely

### Password Best Practices

- Use a strong, unique password for your wallet
- Enable biometric authentication if available (fingerprint, Face ID)
- Use a hardware wallet for large amounts
- Never reuse passwords across wallets and exchanges

### Hardware Wallets

For significant amounts of STX, consider a hardware wallet:

- **Ledger Nano S/X** — Supports STX natively via Leather wallet
- Keep the hardware wallet firmware updated
- Verify transaction details on the hardware wallet screen before confirming

---

## Transaction Safety

### Before Every Transaction

1. **Verify the contract address** — Should be `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`
2. **Check the function name** — Make sure it matches your intended action (deposit, withdraw, borrow, repay)
3. **Verify the amount** — Review in your wallet popup before confirming
4. **Check post-conditions** — Your wallet shows what tokens will be transferred. Verify these match your expectation

### Transaction Verification Checklist

| Step | What to Check | Expected Value |
|---|---|---|
| 1 | Contract address | `SP1M46W6...bitflow-vault-core` |
| 2 | Function name | `deposit`, `withdraw`, `borrow`, or `repay` |
| 3 | STX amount | Matches what you entered |
| 4 | Network | Mainnet |
| 5 | Fee | ~0.001 STX (reasonable) |

### After Every Transaction

1. **Wait for confirmation** — Don't assume success until block confirmation
2. **Verify on explorer** — Check [explorer.hiro.so](https://explorer.hiro.so) with your transaction ID
3. **Check updated balances** — Dashboard should reflect the change within ~10 seconds

### Red Flags — Stop and Verify If:

- The contract address looks different from what you expect
- Transaction fee seems unusually high (> 0.01 STX)
- Wallet asks to approve an unfamiliar function name
- You're asked to approve unlimited token spending
- The amount in the wallet popup doesn't match what you entered

---

## Scam Prevention

### Common Scam Types

#### 1. Fake Websites (Phishing)

Scammers create convincing copies of DeFi apps to steal your wallet connection or seed phrase.

**Protection:**
- Bookmark the official BitFlow URL and always use the bookmark
- Check the URL carefully — look for misspellings (bitfIow.finance vs bitflow.finance)
- Verify the SSL certificate (lock icon in browser bar)
- Never click links from DMs, emails, or unknown Discord messages

#### 2. Fake Support

Scammers pretend to be BitFlow support on Discord, Telegram, or Twitter and ask for your seed phrase or private keys.

**Protection:**
- BitFlow team will **NEVER** ask for your seed phrase
- BitFlow team will **NEVER** DM you first
- Official support only happens in public channels
- No one can "recover" your funds by entering your seed phrase

#### 3. Fake Token Airdrops

Scammers send worthless tokens to your wallet and direct you to a phishing site to "claim" them.

**Protection:**
- Ignore unexpected tokens in your wallet
- Never interact with unknown tokens
- Don't visit websites promoted by random token transfers

#### 4. Impersonation

Scammers use similar usernames and profile pictures to team members.

**Protection:**
- Verify official team members through official channels only
- Check account creation dates — impersonators often have new accounts
- Report impersonators to the platform

#### 5. Smart Contract Exploits

Malicious contracts that drain your wallet when you approve a transaction.

**Protection:**
- Only interact with verified contracts
- BitFlow's mainnet contract: `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core`
- Check contract verification on the Stacks Explorer
- Review post-conditions in your wallet before confirming

---

## Safe Borrowing Practices

### Conservative Borrowing

| Risk Level | Borrow Ratio | Health Factor | Recommendation |
|---|---|---|---|
| Very Safe | < 40% of deposit | > 250% | Best for beginners |
| Safe | 40–50% of deposit | 200–250% | Comfortable buffer |
| Moderate | 50–60% of deposit | 166–200% | Monitor weekly |
| Risky | 60–66% of deposit | 150–166% | Monitor daily |
| Maximum | 66.67% of deposit | 150% | **Not recommended** |

### Golden Rules

1. **Never borrow the maximum** — Always leave a safety buffer
2. **Monitor your health factor** — Check at least weekly
3. **Repay before traveling** — If you can't monitor your position, reduce or close it
4. **Keep reserve STX** — Always have enough in your wallet to repay if needed
5. **Set personal alerts** — Track your health factor manually or use the dashboard

### Emergency Repayment Plan

Before borrowing, have an emergency plan:

1. **Know your repayment amount** — Check `get-repayment-amount` regularly
2. **Have STX ready** — Keep enough in your wallet or on an exchange to repay
3. **Know how to repay quickly** — Test the repay flow with a small amount first
4. **Bookmark the explorer** — Know how to verify your position on-chain

---

## Browser Security

### Recommended Setup

- **Browser:** Chrome, Firefox, or Brave (latest version)
- **Extensions:** Minimize installed extensions — each is a potential attack vector
- **Updates:** Keep your browser and wallet extension updated
- **Incognito:** Don't use incognito mode for DeFi — sessions don't persist
- **Public WiFi:** Avoid using DeFi on public WiFi. Use a VPN if necessary

### Extension Safety

- Only install wallet extensions from official sources:
  - Leather: [leather.io](https://leather.io)
  - Xverse: [xverse.app](https://xverse.app)
- Verify extension publisher and download count
- Regularly review installed extensions — remove ones you don't use
- Be cautious of extensions requesting broad permissions

---

## What To Do If Something Goes Wrong

### If You Suspect a Scam

1. **Stop all activity** — Don't approve anything else
2. **Disconnect your wallet** from any suspicious sites
3. **Check your balances** on the Stacks Explorer
4. **If seed phrase was compromised** — Immediately create a new wallet and transfer all assets
5. **Report** the scam to the platform where you encountered it

### If a Transaction Failed

1. Don't panic — failed transactions don't cost significant fees
2. Check the [Troubleshooting Guide](TROUBLESHOOTING.md) for your specific error
3. Verify your funds on the explorer — they're almost certainly safe

### If You Were Liquidated

1. Understand what happened — see [Liquidation Guide](LIQUIDATION_GUIDE.md)
2. Your borrowed STX is still in your wallet
3. Your deposit (collateral) was seized by the liquidator
4. There's no way to reverse a liquidation
5. Learn from the experience and borrow more conservatively next time

---

## Security Checklist

Use this checklist before each session:

- [ ] Using the correct, bookmarked URL
- [ ] Wallet is on Mainnet
- [ ] Browser and wallet extension are up to date
- [ ] No suspicious browser extensions installed
- [ ] Reviewed transaction details before confirming
- [ ] Sufficient wallet balance for gas fees
- [ ] Health factor monitored (if you have an active loan)

---

## Related Documentation

- [Security Analysis](SECURITY.md) — Protocol-level security architecture
- [Troubleshooting](TROUBLESHOOTING.md) — Fix common issues
- [Health Factor Guide](HEALTH_FACTOR_GUIDE.md) — Keep your loan safe
- [Liquidation Guide](LIQUIDATION_GUIDE.md) — Understand liquidation risks
- [FAQ](FAQ.md) — Frequently asked questions
