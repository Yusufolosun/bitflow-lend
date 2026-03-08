# Contributing Guide

Thank you for your interest in contributing to BitFlow Lend! 🚀

We welcome contributions from everyone, whether you're fixing a typo, reporting a bug, or building a new feature.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Commit Messages](#commit-messages)
- [Pull Request Process](#pull-request-process)
- [Community Guidelines](#community-guidelines)
- [Questions?](#questions)

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18.17.0 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Clarinet** (v2.10.0 or higher) - [Installation Guide](https://github.com/hirosystems/clarinet)
- **Git** - [Download](https://git-scm.com/)

### Fork and Clone

1. **Fork the repository** on GitHub
   - Click the "Fork" button in the top-right corner

2. **Clone your fork**
   ```bash
   git clone https://github.com/yourusername/bitflow-lend.git
   cd bitflow-lend/bitflow-core
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/original/bitflow-lend.git
   ```

### Set Up Development Environment

Run the automated setup script:

```bash
make setup
```

Or manually:

```bash
# Install frontend dependencies
cd frontend
npm install
cd ..

# Verify Clarinet installation
clarinet --version

# Run tests to ensure everything works
make test
```

---

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `test/` - Test additions/changes
- `refactor/` - Code refactoring
- `chore/` - Maintenance tasks

**Examples:**
```bash
git checkout -b feature/flash-loans
git checkout -b fix/interest-calculation-bug
git checkout -b docs/update-api-reference
```

### 2. Make Your Changes

Follow the code style guidelines (see below) and write clean, maintainable code.

### 3. Write/Update Tests

All new features and bug fixes must include tests:

```bash
# Run tests while developing
make test

# Check test coverage
make coverage
```

### 4. Run Linter

Ensure your code passes linting:

```bash
make lint
```

Fix any issues before committing.

### 5. Commit Your Changes

Write clear, descriptive commit messages (see guidelines below):

```bash
git add .
git commit -m "feat: add flash loan functionality"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Create a Pull Request

1. Go to the original repository on GitHub
2. Click "New Pull Request"
3. Select your fork and branch
4. Fill out the PR template
5. Submit for review

---

## Code Style

We use automated tools to enforce code style. Please follow these guidelines:

### Clarity Smart Contracts

**Style Guide:**
- Use **2-space indentation**
- Add **comments** for complex logic
- Use **descriptive variable names**
- Follow **existing patterns** in the codebase

**Example:**

```clarity
;; Good
(define-public (deposit-collateral (amount uint))
  (let (
    (sender tx-sender)
    (current-balance (default-to u0 (get collateral (map-get? vaults sender))))
  )
    (asserts! (> amount u0) err-invalid-amount)
    ;; Transfer STX from user to contract
    (try! (stx-transfer? amount sender (as-contract tx-sender)))
    ;; Update vault balance
    (map-set vaults sender { collateral: (+ current-balance amount) })
    (ok amount)
  )
)

;; Bad
(define-public (dep (a uint))
  (begin
  (stx-transfer? a tx-sender (as-contract tx-sender))
  (ok a)))
```

### TypeScript/React

We use **ESLint** and **Prettier** for code formatting:

```bash
# Frontend linting
cd frontend
npm run lint

# Auto-fix issues
npm run lint:fix

# Format code
npm run format
```

**Style Guide:**
- Use **functional components** with hooks
- Write **TypeScript** types for all props and functions
- Use **JSDoc comments** for complex functions
- Follow **React best practices**

**Example:**

```typescript
// Good
interface DepositCardProps {
  onDeposit: (amount: number) => Promise<void>;
  maxAmount: number;
}

/**
 * DepositCard component for depositing STX collateral
 * @param props - Component props
 */
export const DepositCard: React.FC<DepositCardProps> = ({ onDeposit, maxAmount }) => {
  const [amount, setAmount] = useState<number>(0);

  const handleSubmit = async () => {
    if (amount > 0 && amount <= maxAmount) {
      await onDeposit(amount);
    }
  };

  return (
    <div className="card">
      {/* Component JSX */}
    </div>
  );
};

// Bad
export const DepositCard = (props: any) => {
  let amt = 0;
  return <div>{/* ... */}</div>;
};
```

### General Guidelines

- **Keep functions small** - Aim for <50 lines
- **Single responsibility** - One function, one purpose
- **Descriptive names** - Use clear, meaningful names
- **Comments** - Explain "why", not "what"
- **Error handling** - Handle all edge cases
- **No console.log** - Use proper logging in production code

---

## Testing

All contributions must include appropriate tests.

### Writing Tests

**Clarity Contract Tests:**

```typescript
// tests/vault-core_test.ts
Clarinet.test({
  name: "User can deposit STX collateral",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const user1 = accounts.get('wallet_1')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('vault-core', 'deposit-collateral', [
        types.uint(1000000) // 1 STX
      ], user1.address)
    ]);
    
    block.receipts[0].result.expectOk().expectUint(1000000);
  }
});
```

**Frontend Tests:**

```typescript
// frontend/src/components/DepositCard.test.tsx
import { render, fireEvent } from '@testing-library/react';
import { DepositCard } from './DepositCard';

describe('DepositCard', () => {
  it('should call onDeposit with correct amount', async () => {
    const mockOnDeposit = jest.fn();
    const { getByRole } = render(
      <DepositCard onDeposit={mockOnDeposit} maxAmount={1000} />
    );
    
    fireEvent.change(getByRole('textbox'), { target: { value: '100' } });
    fireEvent.click(getByRole('button', { name: /deposit/i }));
    
    expect(mockOnDeposit).toHaveBeenCalledWith(100);
  });
});
```

### Test Coverage Goals

- **Clarity Contracts**: 100% of public functions
- **Frontend**: >80% of components
- **Utilities**: >90% of functions

### Running Tests

```bash
# All tests
make test

# Contract tests only
clarinet test

# Frontend tests only
cd frontend && npm test

# With coverage
make coverage
```

---

## Commit Messages

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **test**: Test additions/changes
- **refactor**: Code refactoring (no behavior change)
- **style**: Code style changes (formatting, etc.)
- **perf**: Performance improvements
- **chore**: Maintenance tasks
- **ci**: CI/CD changes

### Examples

**Good:**
```
feat: add flash loan functionality

Implement flash loan feature that allows users to borrow without
collateral if repaid within the same transaction.

Closes #123
```

```
fix: correct interest calculation for leap years

The interest calculation was not accounting for leap years,
causing incorrect interest amounts. Now uses accurate day count.
```

```
docs: update API reference for liquidate function

Added example usage and clarified parameters.
```

**Bad:**
```
update stuff
```

```
fixed bug
```

```
WIP
```

### Tips

- Use **imperative mood** ("add" not "added")
- Keep subject line **< 72 characters**
- Capitalize first letter
- No period at the end of subject
- Reference issues with `Closes #123`

---

## Pull Request Process

### Before Submitting

- [ ] Tests pass: `make test`
- [ ] Linter passes: `make lint`
- [ ] Documentation updated (if needed)
- [ ] Changelog updated (for notable changes)
- [ ] No merge conflicts with main branch

### PR Template

Use this template when creating a PR:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests passing
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

### Review Process

1. **Automated checks** run (tests, linting)
2. **Maintainer review** (1-2 business days)
3. **Address feedback** if any
4. **Approval and merge** by maintainer

### After Merge

- Delete your feature branch
- Pull latest main branch
- Celebrate! 🎉

---

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** and considerate
- **Be collaborative** and helpful
- **Be patient** with newcomers
- **Focus on what's best** for the community
- **Show empathy** towards others

### Communication

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: General questions, ideas
- **Discord** (coming soon): Real-time chat
- **Twitter** (coming soon): Announcements

### Reporting Issues

When reporting bugs, include:

1. **Clear title** describing the issue
2. **Steps to reproduce** the problem
3. **Expected behavior**
4. **Actual behavior**
5. **Environment** (OS, Node version, etc.)
6. **Screenshots** (if applicable)

**Example:**

```markdown
## Bug: Interest calculation incorrect for large amounts

**Steps to reproduce:**
1. Deposit 1000 STX
2. Borrow 500 STX
3. Wait 1 year
4. Call calculate-interest

**Expected:** ~0.5 STX interest
**Actual:** 500 STX interest

**Environment:**
- OS: macOS 13.0
- Clarinet: v2.10.0
- Network: Testnet
```

---

## Development Tips

### Useful Commands

```bash
# Start frontend dev server
make dev-frontend

# Build frontend
make build-frontend

# Run all checks before committing
make lint && make test

# Clean build artifacts
make clean

# Check dependencies
make check-deps
```

### Debugging

**Contract debugging:**
```bash
# Use clarinet console
clarinet console

# Check contract calls
clarinet check
```

**Frontend debugging:**
```bash
# Use browser DevTools
# Add breakpoints in VS Code
# Use console.log sparingly
```

### Common Issues

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for common problems and solutions.

---

## Recognition

Contributors will be:

- Listed in `CONTRIBUTORS.md`
- Mentioned in release notes
- Eligible for bug bounties (security issues)
- Part of the BitFlow community!

---

## Questions?

- **Open an issue** for bugs or feature requests
- **Start a discussion** for questions or ideas
- **Join our Discord** (coming soon) for real-time help
- **Email**: dev@bitflow.finance

---

## Thank You!

Every contribution, no matter how small, helps make BitFlow better. We appreciate your time and effort! 🙏

Happy coding! 💻✨
