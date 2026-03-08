# Acronyms

> **Common acronyms and abbreviations used in BitFlow Lend documentation.**

---

| Acronym | Full Form | Context |
|---------|-----------|---------|
| **APR** | Annual Percentage Rate | Interest rate expressed as a yearly rate |
| **BPS** | Basis Points | 1/100th of 1%; used for interest rates (500 BPS = 5%) |
| **BTC** | Bitcoin | Layer 1 blockchain that anchors Stacks |
| **CLI** | Command Line Interface | Terminal-based tools like Clarinet |
| **CV** | Clarity Value | Data type wrapper in `@stacks/transactions` |
| **DeFi** | Decentralized Finance | Financial services on blockchain without intermediaries |
| **DEX** | Decentralized Exchange | Token trading without a central exchange |
| **dApp** | Decentralized Application | Application built on blockchain |
| **E2E** | End-to-End | Testing that covers the full user flow |
| **EVM** | Ethereum Virtual Machine | Not used by Stacks (Stacks uses Clarity) |
| **FAQ** | Frequently Asked Questions | Common questions and answers |
| **GUI** | Graphical User Interface | Visual interface (the frontend) |
| **HF** | Health Factor | Collateral-to-debt ratio percentage |
| **HTTP** | Hypertext Transfer Protocol | Used for API requests to Stacks nodes |
| **JSON** | JavaScript Object Notation | Data format used in API responses |
| **KV** | Key-Value | Storage pattern used by Clarity data maps |
| **LTV** | Loan-to-Value | Ratio of loan amount to collateral (inverse of collateral ratio) |
| **MCR** | Minimum Collateral Ratio | 150% in BitFlow — minimum deposit-to-borrow ratio |
| **PoX** | Proof of Transfer | Stacks consensus mechanism (anchored to Bitcoin) |
| **RPC** | Remote Procedure Call | API call pattern used by Stacks nodes |
| **SDK** | Software Development Kit | `@stacks/transactions`, `@stacks/connect` |
| **SIP** | Stacks Improvement Proposal | Standards for the Stacks ecosystem |
| **STX** | Stacks Token | Native token of the Stacks blockchain |
| **TX** | Transaction | An on-chain operation (deposit, borrow, etc.) |
| **TXID** | Transaction ID | Unique identifier for a blockchain transaction |
| **UI** | User Interface | The frontend application |
| **UX** | User Experience | Overall user interaction quality |
| **μSTX** | microSTX | Smallest STX unit; 1 STX = 1,000,000 μSTX |

---

## BitFlow-Specific Abbreviations

| Abbreviation | Meaning |
|-------------|---------|
| **BVC** | BitFlow Vault Core (the main contract) |
| **CR** | Collateral Ratio (deposit ÷ borrow, as percentage) |
| **LB** | Liquidator Bonus (5% of seized collateral) |
| **LT** | Liquidation Threshold (110% health factor) |

---

## Usage Examples

- "The MCR is 150%, so a 15 STX deposit supports a 10 STX borrow."
- "Set the interest rate to 500 BPS (5% APR)."
- "Check the HF before borrowing; below 110% means liquidation risk."
- "Submit the TX and wait for the TXID confirmation."
- "The contract uses μSTX (microSTX) internally: 10 STX = 10,000,000 μSTX."

---

## Related Documentation

- [Glossary](GLOSSARY.md) — Full term definitions
- [Constants Reference](CONSTANTS_REFERENCE.md) — Protocol constants
- [FAQ](FAQ.md) — Common questions
