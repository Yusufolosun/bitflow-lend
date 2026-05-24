# Contributing to BitFlow

Thank you for your interest in contributing to BitFlow! This document provides guidelines and instructions for contributing to the vault-core project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender, gender identity, and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race, ethnicity, or nationality
- Age
- Religion or lack thereof

### Our Standards

**Positive behaviors:**
- Using welcoming and inclusive language
- Respecting differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what's best for the community
- Showing empathy towards other community members

**Unacceptable behaviors:**
- Harassment, trolling, or insulting comments
- Public or private harassment
- Publishing others' private information
- Any conduct that could reasonably be considered inappropriate

### Enforcement

Violations can be reported to: conduct@bitflow.finance

All complaints will be reviewed and investigated promptly and fairly.

---

## How Can I Contribute?

### 1. Report Bugs

Found a bug? Help us improve by reporting it!

**Before Submitting:**
- Check the [issue tracker](https://github.com/bitflow/vault-core/issues) for existing reports
- Verify the bug exists in the latest version
- Collect relevant information (logs, screenshots, steps to reproduce)

**How to Report:**
1. Go to [GitHub Issues](https://github.com/bitflow/vault-core/issues/new)
2. Use the "Bug Report" template
3. Provide detailed information
4. Add relevant labels

**Security Bugs:**
- **DO NOT** open public issues for security vulnerabilities
- Email: security@bitflow.finance
- See [SECURITY.md](./docs/SECURITY.md) for bug bounty details

### 2. Suggest Features

Have an idea to improve BitFlow?

**Process:**
1. Check [GitHub Discussions](https://github.com/bitflow/vault-core/discussions) for similar ideas
2. Open a new discussion in the "Ideas" category
3. Describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternatives you've considered
   - Why this benefits the community

**Popular Requests:**
- After community discussion and approval, create a feature request issue
- See [ROADMAP.md](./docs/ROADMAP.md) for planned features

### 3. Improve Documentation

Documentation improvements are always welcome!

**Areas to Contribute:**
- Fix typos or unclear explanations
- Add code examples
- Improve API documentation
- Translate documentation (future)
- Create tutorials or guides

**Process:**
1. Fork the repository
2. Make your changes in the `docs/` directory
3. Submit a pull request

### 4. Write Code

Ready to contribute code?

**Types of Contributions:**
- Bug fixes
- Feature implementations
- Test improvements
- Performance optimizations
- Refactoring

**Before Starting:**
1. Comment on an existing issue or create one
2. Wait for maintainer feedback to avoid duplicate work
3. Fork and create a branch
4. Start coding!

---

## Development Setup

### Prerequisites

- Node.js 18+
- Clarinet 2.0+
- Git
- VS Code (recommended) or your favorite editor

### Setup Steps

```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/vault-core.git
cd vault-core

# 3. Add upstream remote
git remote add upstream https://github.com/bitflow/vault-core.git

# 4. Install dependencies
npm install

# 5. Verify setup
clarinet check
npm test

# 6. Create a branch for your work
git checkout -b feature/my-awesome-feature
```

### Keeping Your Fork Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream changes into your main branch
git checkout main
git merge upstream/main

# Push updated main to your fork
git push origin main
```

---

## Coding Standards

### Clarity (Smart Contracts)

**Style Guide:**

```clarity
;; Use descriptive function names
(define-public (borrow (amount uint) (interest-rate-bps uint) (loan-term-days uint))
  ;; Function body
)

;; Use kebab-case for function and variable names
(define-data-var total-deposits uint u0)

;; Add comments for complex logic
;; Calculate interest: principal * rate * time / time-per-year
(let ((interest (/ (* (* principal rate) blocks-elapsed) blocks-per-year)))
  interest
)

;; Use descriptive error codes
(err u101) ;; ERR-INSUFFICIENT-COLLATERAL

;; Group related functions
;; === DEPOSIT FUNCTIONS ===
(define-public (deposit (amount uint)) ...)
(define-public (withdraw (amount uint)) ...)

;; === LOAN FUNCTIONS ===
(define-public (borrow ...) ...)
(define-public (repay) ...)
```

**Best Practices:**
- Use constants for magic numbers
- Validate inputs early
- Use `asserts!` for preconditions
- Minimize state changes
- Use `let` for intermediate calculations
- Document error codes

### TypeScript/JavaScript

**Style Guide:**

```typescript
// Use TypeScript for type safety
interface LoanInfo {
  loanAmount: number;
  collateralAmount: number;
  interestRate: number;
  loanEndBlock: number;
}

// Use async/await for promises
async function getUserDeposit(address: string): Promise<number> {
  const result = await callReadOnlyFunction({
    // ...config
  });
  return Number((result as UIntCV).value) / 1_000_000;
}

// Use descriptive variable names
const depositAmountSTX = 1000;
const depositAmountMicroSTX = depositAmountSTX * 1_000_000;

// Add JSDoc comments for public functions
/**
 * Calculates the health factor for a borrower
 * @param borrower - The principal address of the borrower
 * @param stxPrice - Current STX price in USD
 * @returns Health factor as a percentage (e.g., 150 for 150%)
 */
async function getHealthFactor(
  borrower: string,
  stxPrice: number
): Promise<number> {
  // Implementation
}

// Use const/let, never var
const immutableValue = 100;
let mutableValue = 200;

// Prefer === over ==
if (healthFactor === 150) { ... }

// Handle errors gracefully
try {
  await deposit(amount);
} catch (error) {
  console.error('Deposit failed:', error);
  showErrorMessage('Failed to deposit. Please try again.');
}
```

**Linting:**

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Testing

**Write Tests For:**
- All new features
- Bug fixes
- Edge cases
- Error conditions

**Test Structure:**

```typescript
describe('feature name', () => {
  it('should do something specific', () => {
    // Arrange: Setup test data
    const accounts = simnet.getAccounts();
    const user = accounts.get('wallet_1')!;

    // Act: Execute the function
    const result = simnet.callPublicFn('vault-core', 'deposit', [Cl.uint(1000)], user);

    // Assert: Verify the outcome
    expect(result).toBeOk(Cl.bool(true));
  });
});
```

**Coverage Requirements:**
- New code: 100% coverage
- Bug fixes: Add regression test
- Refactoring: Maintain existing coverage

---

## Testing Guidelines

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npx vitest run tests/vault-core.test.ts

# Run tests matching pattern
npx vitest run --grep "deposit"
```

### Writing Good Tests

**DO:**
- ✅ Test one thing per test
- ✅ Use descriptive test names
- ✅ Test happy paths and error cases
- ✅ Keep tests independent
- ✅ Use helpers for common setup

**DON'T:**
- ❌ Test implementation details
- ❌ Write flaky tests
- ❌ Share state between tests
- ❌ Make tests too complex

**Example:**

```typescript
// ✅ GOOD: Clear, specific test
it('prevents withdrawal when amount exceeds deposit', () => {
  const user = setupUserWithDeposit(1000);
  const result = withdraw(user, 1500);
  expect(result).toBeErr(Cl.uint(102)); // ERR-INSUFFICIENT-BALANCE
});

// ❌ BAD: Vague test name, tests multiple things
it('withdrawal works', () => {
  deposit(1000);
  const result1 = withdraw(500);
  expect(result1).toBeOk();
  const result2 = withdraw(600);
  expect(result2).toBeErr();
});
```

### Test Checklist

Before submitting:
- [ ] All tests pass (`npm test`)
- [ ] Coverage maintained or improved
- [ ] No console errors or warnings
- [ ] Tests are deterministic (no randomness)
- [ ] Edge cases covered

---

## Pull Request Process

### Before Creating a PR

1. **Sync with upstream:**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks:**
   ```bash
   npm run check-all  # Runs tests, linter, type-check
   clarinet check
   ```

3. **Update documentation:**
   - Update relevant docs in `docs/`
   - Update README.md if needed
   - Add entries to CHANGELOG.md (if exists)

### Creating a Pull Request

1. **Push to your fork:**
   ```bash
   git push origin feature/my-awesome-feature
   ```

2. **Open PR on GitHub:**
   - Use a clear, descriptive title
   - Fill out the PR template
   - Link related issues (e.g., "Fixes #123")
   - Add screenshots for UI changes
   - Request review from maintainers

3. **PR Title Format:**
   ```
   [Type] Brief description

   Types:
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation changes
   - test: Test additions/changes
   - refactor: Code refactoring
   - perf: Performance improvement
   - chore: Maintenance tasks
   ```

   **Examples:**
   - `feat: Add partial loan repayment`
   - `fix: Correct interest calculation for leap years`
   - `docs: Update API.md with new examples`

### PR Checklist

- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] New tests added for new features
- [ ] Documentation updated
- [ ] No merge conflicts
- [ ] Commit messages are clear
- [ ] PR description explains changes

### Review Process

1. **Automated Checks:**
   - Tests must pass
   - Linter must pass
   - Coverage must not decrease

2. **Code Review:**
   - At least one maintainer approval required
   - Address all review comments
   - Push additional commits or rebase as needed

3. **Merging:**
   - Maintainers will merge approved PRs
   - Squash commits for cleaner history
   - PR will be linked in changelog

### After Merge

- Delete your feature branch (both locally and on GitHub)
- Pull latest changes to your main branch

---

## Commit Message Guidelines

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Examples

```
feat(vault-core): add partial loan repayment

Allow borrowers to repay loans in installments, releasing
proportional collateral with each payment.

Closes #45
```

```
fix(liquidation): correct health factor edge case

Health factor calculation was incorrect when collateral
equals loan amount exactly. Fixed division by zero.

Fixes #78
```

```
docs(integration): add React component examples

Added complete example of React dashboard component
with wallet integration and state management.
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `test`: Tests
- `refactor`: Code restructuring
- `perf`: Performance
- `chore`: Maintenance

### Scopes

- `vault-core`: Smart contract
- `frontend`: UI/dashboard
- `tests`: Test suite
- `docs`: Documentation
- `ci`: CI/CD
- `deps`: Dependencies

---

## Reporting Bugs

### Bug Report Template

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Actual behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- OS: [e.g., Windows 11, macOS 13]
- Browser: [e.g., Chrome 120, Firefox 121]
- Wallet: [e.g., Hiro Wallet 4.0]
- Network: [Testnet / Mainnet]

**Additional context**
Any other relevant information.

**Possible Solution** (optional)
If you have ideas on how to fix it.
```

### Security Vulnerabilities

**DO NOT** open public issues for security bugs!

**Instead:**
1. Email: security@bitflow.finance
2. Include:
   - Vulnerability description
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)
3. Use PGP encryption (key available on website)

**Response Timeline:**
- Acknowledgment: Within 48 hours
- Status update: Within 7 days
- Fix timeline: Depends on severity

---

## Suggesting Features

### Feature Request Template

```markdown
**Is your feature request related to a problem?**
A clear description of the problem. Ex. I'm frustrated when [...]

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
Other solutions or features you've considered.

**Additional context**
Any other context, mockups, or examples.

**Would you be willing to implement this?**
[ ] Yes, I can submit a PR
[ ] Yes, with guidance
[ ] No, but I can help test
[ ] No
```

---

## Community

### Communication Channels

- **GitHub Issues:** Bug reports and feature requests
- **GitHub Discussions:** General questions and ideas
- **Discord:** Real-time chat and support
- **Twitter:** Announcements and updates
- **Forum:** Long-form discussions

### Getting Help

**Before Asking:**
1. Read the [FAQ](./docs/FAQ.md)
2. Search [GitHub Issues](https://github.com/bitflow/vault-core/issues)
3. Check [Documentation](./docs/)

**Where to Ask:**
- **Technical questions:** GitHub Discussions or Discord #dev-help
- **Usage questions:** Discord #support or FAQ
- **Bug reports:** GitHub Issues
- **Feature ideas:** GitHub Discussions

### Recognition

Contributors are recognized in the project's release notes and developer logs.

---

## Development Resources

### Documentation

- [Clarity Language](https://docs.stacks.co/clarity/)
- [Stacks.js](https://stacks.js.org/)
- [Clarinet](https://github.com/hirosystems/clarinet)
- [Vitest](https://vitest.dev/)

### Tools

- **VS Code Extensions:**
  - Clarity (hirosystems.clarity-lsp)
  - ESLint
  - Prettier
  - GitLens

- **CLI Tools:**
  - Clarinet (smart contract development)
  - Stacks CLI (blockchain interaction)
  - Git (version control)

### Example Projects

- [Stacks DeFi Examples](https://github.com/stacks-network/stacks-examples)
- [ALEX Protocol](https://github.com/alexgo-io)
- [Arkadiko](https://github.com/arkadiko-dao)

---

## License

By contributing to BitFlow, you agree that your contributions will be licensed under the MIT License.

See [LICENSE](./LICENSE) file for details.

---

## Questions?

- **Email:** contribute@bitflow.finance
- **Discord:** #contributors channel
- **GitHub:** [@bitflow/vault-core](https://github.com/bitflow/vault-core)

---

**Thank you for contributing to BitFlow.**

We appreciate your time and effort in contributing to the protocol.

---

**Document Version:** 1.0.0  
**Last Updated:** January 25, 2026
