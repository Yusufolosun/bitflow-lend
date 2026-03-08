# Frequently Asked Questions (FAQ)

Common questions and answers about BitFlow vault-core lending protocol.

## Table of Contents

- [General Questions](#general-questions)
- [Deposits & Withdrawals](#deposits--withdrawals)
- [Borrowing & Loans](#borrowing--loans)
- [Repayment](#repayment)
- [Liquidations](#liquidations)
- [Security & Safety](#security--safety)
- [Technical Questions](#technical-questions)
- [Fees & Economics](#fees--economics)
- [Troubleshooting](#troubleshooting)

---

## General Questions

### What is BitFlow?

BitFlow is a decentralized lending protocol built on the Stacks blockchain. It allows users to:
- Deposit STX to earn interest
- Borrow STX against their deposits
- Participate in liquidations to earn rewards

### Why use BitFlow instead of centralized platforms?

- **No KYC**: No identity verification required
- **Non-custodial**: You control your private keys
- **Transparent**: All transactions verifiable on-chain
- **Permissionless**: No account approvals needed
- **Bitcoin-backed**: Secured by Bitcoin via Stacks Proof-of-Transfer

### Is BitFlow decentralized?

**Currently:** Partially decentralized (Phase 1)
- Smart contracts are immutable and permissionless
- No admin keys or centralized control
- Oracle price feeds are semi-centralized

**Future:** Full decentralization (Phase 4)
- DAO governance
- Decentralized price oracles
- Community-driven development

### What is Stacks?

Stacks is a Bitcoin Layer 2 blockchain that enables smart contracts secured by Bitcoin's proof-of-work. Learn more at [stacks.co](https://www.stacks.co).

### Do I need Bitcoin to use BitFlow?

No, you only need STX (Stacks tokens). However, you'll need a small amount of STX for transaction fees (~0.001 STX per transaction).

---

## Deposits & Withdrawals

### How do I deposit STX?

1. Connect your wallet (Hiro or Xverse)
2. Click "Deposit"
3. Enter amount
4. Confirm transaction in wallet

See [EXAMPLES.md](./EXAMPLES.md#example-1-first-time-depositor) for detailed walkthrough.

### Can I withdraw my deposit anytime?

**Yes**, but only the portion not locked as collateral.

**Example:**
- Total deposit: 1500 STX
- Locked as collateral: 1500 STX (for 1000 STX loan)
- Available to withdraw: 0 STX

After repaying your loan, all 1500 STX becomes available for withdrawal.

### Is there a minimum deposit?

**Testnet:** No minimum  
**Mainnet:** TBD (likely 10-100 STX to prevent spam)

### Is there a maximum deposit?

No maximum. However, for large deposits (>100,000 STX), we recommend:
1. Start with a small test deposit
2. Verify successful transaction
3. Deposit the remaining amount

### How long do deposits take to confirm?

Typically 10-20 minutes (1-2 Stacks blocks). You can monitor your transaction on [Stacks Explorer](https://explorer.stacks.co).

### Can I earn interest on my deposits?

**Phase 1 (Current):** No deposit interest yet  
**Phase 2 (Planned):** Depositors will earn a portion of borrower interest payments

### What happens if I deposit from a centralized exchange?

**⚠️ DO NOT deposit from exchanges!**

Why:
- You don't control the private keys
- Withdrawals may be locked
- Exchange may not support smart contract interactions

**Always deposit from a non-custodial wallet** (Hiro Wallet, Xverse).

---

## Borrowing & Loans

### How much can I borrow?

You can borrow up to **66.67%** of your deposit value.

**Formula:**
```
Maximum Borrow = Deposit ÷ 1.5
```

**Example:**
- Deposit: 1500 STX
- Maximum Borrow: 1000 STX

### Why only 66.67%?

To maintain **150% collateralization**, ensuring the system stays solvent even if prices fluctuate.

### What is the minimum loan amount?

**Testnet:** No minimum  
**Mainnet:** TBD (likely 100 STX)

### What are the interest rates?

**Currently:** Borrowers set their own interest rate  
**Future:** Dynamic rates based on supply/demand

**Typical Rates:**
- Short-term (7-30 days): 5-15% APR
- Medium-term (30-90 days): 10-20% APR
- Long-term (90-365 days): 15-30% APR

### Can I have multiple loans?

**No**, you can only have one active loan at a time. Repay your current loan before borrowing again.

### Can I borrow more after taking a loan?

No, the contract doesn't support increasing existing loans. You must:
1. Repay current loan
2. Deposit more collateral (if needed)
3. Create a new, larger loan

### What are loan terms?

- **Minimum:** 7 days
- **Maximum:** 365 days
- **Flexibility:** Choose any duration in between

**Note:** Longer terms = more interest accrued

### What happens when my loan term ends?

Nothing automatic. Your loan can extend beyond the term, but interest continues accruing. You should repay as soon as possible to avoid excessive interest.

### Can I extend my loan?

**Phase 1:** No extensions  
**Phase 2:** Loan extensions planned (pay small fee to extend term)

### What if I can't repay my loan?

If your health factor drops below 110%, your position may be liquidated. Options:

1. **Add more collateral** (deposit more STX)
2. **Repay partially** to improve health factor
3. **Find someone to take over your loan** (informal arrangement)
4. **Accept liquidation** (lose 5% of collateral)

---

## Repayment

### How do I repay my loan?

Call the `repay` function. The contract automatically calculates:
- Principal amount
- Accrued interest
- Total repayment

See [EXAMPLES.md](./EXAMPLES.md#example-3-loan-repayment) for code example.

### How is interest calculated?

**Formula:**
```
Interest = Principal × Rate × (Blocks Elapsed ÷ Blocks Per Year)
```

**Example:**
- Principal: 1000 STX
- Rate: 10% (0.10)
- Blocks elapsed: 26280 (6 months)
- Blocks per year: 52560
- Interest: 1000 × 0.10 × (26280 ÷ 52560) = 50 STX

### Can I repay early?

**Yes!** You can repay anytime. Interest only accrues for the time you've borrowed.

**Example:**
- Loan term: 30 days (4320 blocks)
- You repay after: 15 days (2160 blocks)
- Interest charged: Only for 15 days

### Can I partially repay?

**Phase 1:** No, must repay full amount  
**Phase 2:** Partial repayments planned

### What if I overpay?

The contract only takes the exact repayment amount. Overpayment is not possible.

### Where does my repayment go?

- **Principal:** Returned to vault (available for others to borrow)
- **Interest:** Currently burned / locked in contract
- **Future:** Interest distributed to depositors

### Do I get my collateral back immediately?

Yes, upon successful repayment:
1. Loan is marked as repaid
2. Collateral is unlocked
3. You can withdraw immediately

---

## Liquidations

### What is liquidation?

Liquidation is when your collateral is sold to repay your loan because your health factor dropped below 110%.

### When can I be liquidated?

When your **health factor < 110%**.

**Calculation:**
```
Health Factor = (Collateral STX ÷ Loan STX) × 100
```

**Example:**
- Collateral: 1100 STX
- Loan: 1000 STX
- Health Factor: 110%

If collateral value drops to 1099 STX → **LIQUIDATABLE**

### Who can liquidate me?

Anyone! Liquidations are permissionless. Typically:
- Automated bots
- Other users monitoring liquidatable positions

### How much do I lose in liquidation?

**5% liquidation penalty**

**Example:**
- Loan: 1000 STX
- Collateral: 1100 STX
- Liquidator repays: 1000 STX
- Liquidator receives: 1050 STX (1000 + 5%)
- You lose: 50 STX (5%)
- Remaining in vault: 50 STX (may be distributed to depositors)

### Can I self-liquidate?

**No**, the contract prevents you from liquidating your own position. This prevents gaming the liquidation bonus.

### How can I avoid liquidation?

1. **Maintain high health factor** (150%+ recommended)
2. **Monitor your position** daily
3. **Set up alerts** when health drops below 120%
4. **Add collateral** if health factor drops
5. **Repay loan** if uncertain about price movements

### What happens if liquidation fails?

If no one liquidates your unhealthy position:
- Your loan continues accruing interest
- Health factor may worsen
- Eventually, someone will liquidate for the 5% bonus

The protocol cannot force liquidation, but incentives make it likely.

### Can I recover after liquidation?

Yes! After liquidation:
1. Your loan is cleared
2. Any excess collateral is returned
3. You can deposit and borrow again

**Example:**
- Collateral: 1200 STX
- Loan: 1000 STX
- Liquidation: Liquidator takes 1050 STX
- You get back: 150 STX

---

## Security & Safety

### Is my money safe?

**Smart Contract Risk:** Code is open-source and will be audited, but bugs may exist  
**Oracle Risk:** Price feed manipulation could affect liquidations  
**User Error:** You could lose funds through mistakes

**Recommendation:** Only deposit what you can afford to lose.

### Has the contract been audited?

**Status:** Audit scheduled for Q1 2026  
**Auditor:** TBD

Until audited, consider this **experimental software**.

### What if there's a bug in the contract?

**Phase 1:** Contracts are immutable; bugs cannot be fixed  
**Phase 4:** Insurance fund will cover verified exploits

**Best Practice:** Start with small amounts until protocol is battle-tested.

### Can the team steal my funds?

**No.** The contract has:
- No admin keys
- No upgrade mechanism
- No withdrawal functions for the contract owner

All code is verifiable on-chain.

### What if Stacks blockchain goes down?

- Your funds remain in the contract
- No transactions can occur until chain resumes
- No funds are lost

Stacks has 99.9%+ uptime historically.

### How do I protect my wallet?

1. **Use hardware wallet** (Ledger support via Hiro/Xverse)
2. **Never share seed phrase**
3. **Verify contract addresses** before transactions
4. **Use official app** only (bitflow.finance)
5. **Bookmark official site** to avoid phishing

---

## Technical Questions

### What blockchain is BitFlow on?

**Stacks** (Bitcoin Layer 2)

### What programming language is the contract written in?

**Clarity** - a decidable smart contract language designed for security and predictability.

### Can I view the source code?

Yes! The contract is open-source:
- **GitHub:** [github.com/bitflow/vault-core](https://github.com/bitflow/vault-core)
- **Explorer:** View on [Stacks Explorer](https://explorer.stacks.co)

### Is the contract upgradeable?

**No.** Contracts on Stacks/Clarity are immutable once deployed. This ensures:
- No rug pulls
- Predictable behavior
- Trustless operation

### How do you handle price feeds?

**Phase 1:** Oracle integration pending  
**Phase 2:** Use Redstone or Pragma oracles  
**Phase 4:** Decentralized oracle network

See [SECURITY.md](./SECURITY.md#oracle-price-feeds) for details.

### What wallets are supported?

- [Hiro Wallet](https://wallet.hiro.so/) ✅
- [Xverse](https://www.xverse.app/) ✅
- Leather Wallet ✅
- Any Stacks-compatible wallet

### Can I integrate BitFlow into my app?

Yes! See [INTEGRATION.md](./INTEGRATION.md) for:
- API documentation
- TypeScript examples
- React components
- Testing guides

### Are there API rate limits?

Reading from the blockchain (read-only functions) has no limits. Writing (transactions) is limited by:
- Block time (~10 minutes)
- Your STX balance (for fees)
- Wallet rate limiting

---

## Fees & Economics

### What are the fees?

**Phase 1 (Current):**
- Deposit: 0 fees ✅
- Withdraw: 0 fees ✅
- Borrow: 0 fees ✅
- Repay: 0 fees ✅
- Liquidate: 0 fees ✅

**Stacks Network Fees:**
- ~0.001-0.01 STX per transaction (paid to miners)

**Phase 4 (Future):**
- Small protocol fees (0.05-0.5%)
- Fees distributed to BFLOW token holders

### How are interest rates determined?

**Phase 1:** Borrowers choose their own rate  
**Phase 2:** Dynamic rates based on utilization

**Utilization Formula:**
```
Utilization = Total Borrowed ÷ Total Deposits
```

**Example Rate Curve:**
- 0-50% utilization: 5% APR
- 50-80% utilization: 10% APR
- 80-100% utilization: 20% APR

### Where does interest go?

**Phase 1:** Interest stays in contract  
**Phase 2:** Distributed to depositors  
**Phase 4:** Split between depositors (80%) and BFLOW stakers (20%)

### What is the liquidation bonus?

**5%** of the loan amount.

**Example:**
- You liquidate a 1000 STX loan
- You pay: 1000 STX
- You receive: 1050 STX
- Your profit: 50 STX (5%)

### Is there a governance token?

**Phase 1:** No token  
**Phase 4:** BFLOW governance token

**Planned Utility:**
- Vote on protocol changes
- Earn staking rewards
- Fee discounts
- Treasury allocation

---

## Troubleshooting

### My transaction is stuck / pending

**Cause:** Stacks block time (~10 minutes)

**Solution:**
1. Wait 10-20 minutes
2. Check [Stacks Explorer](https://explorer.stacks.co)
3. Verify transaction status

### I get "Insufficient Balance" error

**Causes:**
1. Not enough STX for transaction
2. Not enough STX for network fees
3. Trying to withdraw locked collateral

**Solution:**
1. Check wallet balance
2. Ensure you have 0.01 STX for fees
3. Verify available vs locked amounts

### I get "ERR-INSUFFICIENT-COLLATERAL" (u101)

**Cause:** Trying to borrow more than 66.67% of deposit

**Solution:**
1. Reduce borrow amount
2. Deposit more STX
3. Calculate max: `Max Borrow = Deposit ÷ 1.5`

### I get "ERR-ACTIVE-LOAN-EXISTS" (u103)

**Cause:** You already have an active loan

**Solution:**
1. Repay existing loan first
2. Then create new loan

### My health factor is < 110%, what do I do?

**URGENT - You may be liquidated!**

**Immediate Actions:**
1. Deposit more STX to increase collateral
2. Repay loan immediately
3. Monitor health factor every hour

### Transaction failed but I was charged fees

**Explanation:** Stacks charges fees even for failed transactions (this prevents spam)

**Prevention:**
1. Test with small amounts first
2. Double-check function parameters
3. Verify contract address

### I can't see my deposit in the wallet

**Explanation:** Deposited STX is in the contract, not your wallet

**How to Verify:**
1. Call `get-user-deposit(your-address)`
2. Check contract on Explorer
3. Use BitFlow dashboard

### The app shows incorrect balance

**Causes:**
1. Cached data
2. Oracle price outdated
3. Browser issue

**Solutions:**
1. Refresh page (Ctrl+R)
2. Clear browser cache
3. Try different browser
4. Check on Stacks Explorer directly

### I need help with integration

**Resources:**
1. Read [INTEGRATION.md](./INTEGRATION.md)
2. Check [EXAMPLES.md](./EXAMPLES.md)
3. Ask on [Discord](https://discord.gg/bitflow)
4. Open [GitHub Issue](https://github.com/bitflow/vault-core/issues)

### Where can I report bugs?

1. **Security bugs:** security@bitflow.finance (PGP key available)
2. **Other bugs:** [GitHub Issues](https://github.com/bitflow/vault-core/issues)
3. **General questions:** [Discord](https://discord.gg/bitflow)

---

## Still Have Questions?

### Community Support

- **Discord:** [discord.gg/bitflow](https://discord.gg/bitflow) - Get help from community
- **Forum:** [forum.bitflow.finance](https://forum.bitflow.finance) - Discussions
- **Twitter:** [@BitFlowLend](https://twitter.com/BitFlowLend) - Updates

### Documentation

- **Contracts:** [CONTRACTS.md](./CONTRACTS.md)
- **Integration:** [INTEGRATION.md](./INTEGRATION.md)
- **Security:** [SECURITY.md](./SECURITY.md)
- **Examples:** [EXAMPLES.md](./EXAMPLES.md)

### Contact

- **General:** hello@bitflow.finance
- **Security:** security@bitflow.finance
- **Partnership:** partnerships@bitflow.finance

---

---

## For Beginners

New to DeFi? Start here. These questions assume no prior knowledge.

### What is DeFi?

**DeFi** stands for **Decentralized Finance**. It's a system of financial applications built on blockchains that operate without banks or intermediaries. Instead of a bank holding your money and deciding who gets loans, smart contracts (code on the blockchain) handle everything automatically and transparently.

BitFlow Lend is a DeFi application — it lets you deposit, borrow, and repay using code instead of a bank.

### What is a blockchain?

A blockchain is a shared digital ledger that records transactions. Think of it like a public spreadsheet that thousands of computers maintain simultaneously. No single person controls it, and once something is recorded, it can't be secretly changed.

BitFlow runs on the **Stacks** blockchain, which is connected to Bitcoin for security.

### What is STX?

**STX** is the native cryptocurrency of the Stacks blockchain, similar to how ETH is the native currency of Ethereum. You need STX to:
- Pay transaction fees (tiny amounts, ~0.001 STX per transaction)
- Use as collateral in BitFlow
- Borrow against your deposits

1 STX = 1,000,000 microSTX (similar to how 1 dollar = 100 cents).

### What is collateral?

Collateral is an asset you pledge to secure a loan. In BitFlow, your deposited STX is your collateral. If you deposit 10 STX, that deposit backs any loan you take.

This is similar to a home mortgage — the house is collateral for the loan. If you don't repay, the lender can take the house. In BitFlow, if your loan becomes undercollateralized, your deposit can be liquidated.

### Why do I need 150% collateral?

The 150% requirement is a safety buffer. If you want to borrow 10 STX, you need at least 15 STX deposited. This protects the protocol:

| You Deposit | You Can Borrow (max) | Safety Buffer |
|---|---|---|
| 15 STX | 10 STX | 5 STX buffer |
| 30 STX | 20 STX | 10 STX buffer |

The buffer exists because crypto prices can be volatile. If the value of STX drops, the buffer prevents the loan from becoming insolvent.

### What is a health factor?

Your **health factor** is a number that shows how safe your loan is. Think of it like a safety score:

- **Above 150%** → You're safe. No action needed.
- **110% to 150%** → Warning zone. Consider adding more collateral or repaying.
- **Below 110%** → Danger! Your loan can be liquidated by anyone.

The higher the number, the safer you are. There's no upper limit.

### What happens if I get liquidated?

If your health factor drops below 110%, another user can **liquidate** your loan. Here's what happens:

1. The liquidator pays off your debt (principal + interest)
2. The liquidator receives your collateral (deposit) as a reward
3. Your loan is deleted and your deposit is zeroed out
4. You keep the STX you originally borrowed

**Example:** You deposited 10 STX and borrowed 6 STX. After liquidation, you lose your 10 STX deposit but keep the 6 STX you borrowed. Net loss: 4 STX + interest.

**How to avoid liquidation:** Keep your health factor high by not borrowing the maximum amount.

### What is interest and how is it calculated?

Interest is the cost of borrowing. BitFlow uses **simple interest** (not compound). The formula is:

```
Interest = Principal × Rate × Time
```

For example, if you borrow 10 STX at 5% APR for 30 days:
- Interest ≈ 10 × 0.05 × (30/365) ≈ 0.041 STX
- Total repayment ≈ 10.041 STX

Interest accrues every block (~10 minutes) but you pay it all at once when you repay.

### Is my money safe?

BitFlow uses several security measures:

- **Smart contract** — Code is open source and auditable
- **No admin keys** — Nobody can steal funds or change rules after deployment
- **Overcollateralization** — Loans are always backed by more collateral than borrowed
- **Immutable** — The contract code cannot be changed once deployed
- **Bitcoin-secured** — Stacks blockchain settles on Bitcoin

However, like all DeFi, there are risks: smart contract bugs, oracle manipulation, and market volatility. Never deposit more than you can afford to lose.

### How do I get started?

1. Install a Stacks wallet ([Leather](https://leather.io) or [Xverse](https://xverse.app))
2. Buy STX from an exchange and send it to your wallet
3. Connect your wallet to BitFlow
4. Deposit STX
5. Optionally borrow against your deposit

See the [Quick Start Guide](QUICKSTART.md) for a detailed 5-minute walkthrough.

---

---

## Advanced Topics

Technical questions for developers and power users.

### Can the contract be upgraded?

No. Clarity smart contracts on Stacks are **immutable** once deployed. The contract at `SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193.bitflow-vault-core` cannot be modified.

To introduce new features, a new contract version would be deployed with a migration path:

1. Deploy `bitflow-vault-core-v2` with new logic
2. Build a migration function or frontend that reads from v1 and writes to v2
3. Users migrate their positions voluntarily
4. The old contract continues to work for anyone who doesn't migrate

This is by design — immutability means users can trust that the rules won't change under them.

### How does gas optimization work in Clarity?

Clarity gas costs are based on the number and type of operations. BitFlow v1.0.1 reduced contract size by 78% through these optimizations:

- **Minimal state reads** — Each function reads only the maps it needs
- **No redundant checks** — Validations are ordered to fail fast
- **Efficient math** — Integer arithmetic avoids unnecessary intermediate values
- **Single-map design** — Using `user-deposits` (uint) instead of a complex tuple saves gas

Approximate gas costs per operation:

| Function | Estimated Gas | STX Cost (~) |
|---|---|---|
| `deposit` | ~15,000 | ~0.001 STX |
| `withdraw` | ~18,000 | ~0.001 STX |
| `borrow` | ~25,000 | ~0.002 STX |
| `repay` | ~30,000 | ~0.002 STX |
| `liquidate` | ~35,000 | ~0.003 STX |

### How does the liquidation math work internally?

The liquidation function performs these calculations in order:

```clarity
;; 1. Calculate accrued interest
(let ((interest (calculate-interest principal rate blocks-elapsed)))

;; 2. Total debt = principal + interest
(let ((total-debt (+ principal interest)))

;; 3. Liquidator bonus = 5% of total debt
(let ((bonus (/ (* total-debt u5) u100)))

;; 4. Liquidator pays: total debt + bonus
(let ((liquidator-payment (+ total-debt bonus)))

;; 5. Liquidator receives: all of borrower's collateral
;; 6. Borrower's deposit → 0, loan deleted
```

The 5% bonus incentivizes liquidators to act quickly, keeping the protocol solvent. Liquidators profit when `collateral > debt + bonus`.

### What are the block time assumptions?

BitFlow uses these constants for time calculations:

| Constant | Value | Meaning |
|---|---|---|
| 1 block | ~10 minutes | Average Stacks block time |
| 1 day | 144 blocks | 24 × 60 / 10 |
| 1 year | 52,560 blocks | 365 × 144 |

Interest accrues per block using: `interest = principal × rate × blocks / (100 × 52560)`

If Stacks block times change significantly (e.g., after a network upgrade), interest calculations would drift. The contract uses block height, not wall-clock time, so actual elapsed time may differ from expected time.

### Why is there a single-loan-per-user limitation?

This is a deliberate Phase 1 design decision:

**Benefits:**
- Simpler state management (one map entry per user)
- Lower gas costs (no array iteration)
- Easier health factor calculation
- Reduced smart contract complexity = fewer bugs

**Tradeoffs:**
- Users can't have multiple loans with different terms
- Must repay fully before borrowing again
- No partial liquidation support

**Future plans:** Phase 2 may introduce loan IDs (`map loan-id → loan-data`) to support multiple concurrent loans per user.

---

**Document Version:** 1.2.0  
**Last Updated:** February 14, 2026

💡 **Tip:** If you can't find your question here, check the [GLOSSARY.md](./GLOSSARY.md) for term definitions, or ask in our Discord community!
