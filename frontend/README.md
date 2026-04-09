# BitFlow Lend - Frontend Application

React-based web interface for the BitFlow Lend protocol on Stacks blockchain.

## Overview

Modern, responsive dashboard for depositing STX, borrowing against collateral, and managing loans with real-time protocol statistics and health monitoring.

**Tech Stack:**
- React 18 with TypeScript
- Vite for fast development and optimized builds
- Tailwind CSS for styling
- @stacks/connect for wallet integration
- Vitest for testing

## Prerequisites

- Node.js 18+ (20.x recommended)
- npm or yarn
- Modern web browser with [Hiro Wallet](https://wallet.hiro.so/) extension

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your contract address in .env
# VITE_CONTRACT_ADDRESS=ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

All environment variables must be prefixed with `VITE_` to be accessible in the browser.

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_CONTRACT_ADDRESS` | Deployed vault contract address | `ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_NETWORK` | Stacks network (`testnet` or `mainnet`) | `testnet` |
| `VITE_STACKS_API_URL` | Stacks API endpoint | `https://api.testnet.hiro.so` |
| `VITE_API_URL` | Custom API URL (if using backend) | - |
| `VITE_APP_NAME` | Application name | `BitFlow Lend` |
| `VITE_APP_VERSION` | App version for display | `1.0.0` |
| `VITE_ENABLE_LIQUIDATIONS` | Enable liquidation features | `true` |
| `VITE_ENABLE_NOTIFICATIONS` | Enable toast notifications | `true` |

**Important:** Environment variables are baked into the build at compile time. Changing them requires rebuilding the app.

### Environment Files

- `.env.example` - Template with all variables documented
- `.env` - Local development config (gitignored)
- `.env.production` - Production config (gitignored)

Never commit `.env` files with real values to version control.

## Available Scripts

### Development

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Production build (TypeScript + Vite)
npm run preview      # Preview production build locally
```

### Code Quality

```bash
npm run lint         # Run ESLint
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Generate coverage report
```

### Deployment

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete deployment guide.

```bash
# Build for production
npm run build

# Output directory: dist/
# Deploy dist/ to any static host (Vercel, Netlify, etc.)
```

## Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── favicon.svg        # App icon
│   └── logo.svg           # BitFlow logo
│
├── src/
│   ├── components/        # React components
│   │   ├── Dashboard.tsx       # Main dashboard layout
│   │   ├── WalletConnect.tsx   # Wallet connection UI
│   │   ├── DepositCard.tsx     # Deposit interface
│   │   ├── BorrowCard.tsx      # Borrow interface
│   │   ├── RepayCard.tsx       # Loan repayment
│   │   ├── WithdrawCard.tsx    # Withdrawal interface
│   │   ├── HealthMonitor.tsx   # Health factor display
│   │   └── __tests__/          # Component tests
│   │
│   ├── hooks/             # Custom React hooks
│   │   ├── useAuth.ts          # Wallet authentication
│   │   ├── useVault.ts         # Contract interactions
│   │   ├── useProtocolStats.ts # Protocol statistics
│   │   ├── useSmartPolling.ts  # Efficient data polling
│   │   ├── useStxPrice.ts      # STX price feed
│   │   └── __tests__/          # Hook tests
│   │
│   ├── utils/             # Helper functions
│   │   ├── formatters.ts       # Data formatting
│   │   ├── calculations.ts     # Financial calculations
│   │   └── __tests__/          # Utility tests
│   │
│   ├── config/            # Configuration
│   │   └── contracts.ts        # Contract addresses & networks
│   │
│   ├── types/             # TypeScript definitions
│   │   └── vault.ts            # Contract types
│   │
│   ├── App.tsx            # Root component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles (Tailwind)
│
├── .env.example           # Environment template
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── vite.config.ts         # Vite config
├── tailwind.config.js     # Tailwind config
├── vercel.json            # Vercel deployment config
└── README.md              # This file
```

## Key Features

### User Interface
- **Responsive Design:** Mobile-first, works on all screen sizes
- **Wallet Integration:** Seamless connection with Hiro Wallet
- **Real-time Updates:** Auto-refresh protocol stats every 30s
- **Smart Polling:** Background updates pause when tab is hidden
- **Accessibility:** WCAG-compliant with keyboard navigation

### Smart Contract Integration
- **Read-Only Calls:** Fetch user deposits, loans, and protocol stats
- **Transactions:** Deposit, borrow, repay, and withdraw with post-conditions
- **Transaction Polling:** Monitor pending transactions until confirmed
- **Error Handling:** Clear error messages for all failure scenarios

### Performance
- **Code Splitting:** Separate chunks for React and Stacks libraries
- **Lazy Loading:** Components load on-demand (future enhancement)
- **Optimized Polling:** Smart intervals prevent unnecessary API calls
- **Minimal Re-renders:** Optimized state management

## Architecture

### Component Hierarchy

```
App
└── ErrorBoundary
    └── ToastProvider
        └── Dashboard
            ├── WalletConnect
            ├── NetworkIndicator
            ├── StatsCard (x4)
            ├── DepositCard
            ├── BorrowCard
            ├── RepayCard
            ├── WithdrawCard
            ├── HealthMonitor
            └── TransactionHistory
```

### Data Flow

1. **Authentication:** `useAuth` hook manages wallet connection and balance
2. **Contract Calls:** `useVault` hook provides contract interaction methods
3. **Polling:** `useSmartPolling` efficiently fetches user and protocol data
4. **State Management:** React hooks with local state (no Redux needed)
5. **Notifications:** Toast system for user feedback

### Network Configuration

The app supports both testnet and mainnet. Configure via `VITE_NETWORK` environment variable or by editing `src/config/contracts.ts`:

```typescript
export const ACTIVE_NETWORK: NetworkType = 'testnet'; // or 'mainnet'
```

**Testnet:**
- API: `https://api.testnet.hiro.so`
- Explorer: `https://explorer.hiro.so/?chain=testnet`

**Mainnet:**
- API: `https://api.mainnet.hiro.so`
- Explorer: `https://explorer.hiro.so/?chain=mainnet`

## Testing

The frontend has comprehensive test coverage (~95%).

### Run Tests

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Test Structure

- **Component Tests:** Render tests, user interactions, edge cases
- **Hook Tests:** State management, async operations, error handling
- **Utility Tests:** Formatters, calculations, validation
- **Integration Tests:** End-to-end user flows

### Writing Tests

Tests use Vitest and React Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { WalletConnect } from '../WalletConnect';

describe('WalletConnect', () => {
  it('renders connect button when not connected', () => {
    render(<WalletConnect />);
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
  });
});
```

## Common Tasks

### Adding a New Component

1. Create component file in `src/components/`
2. Add TypeScript interface for props
3. Create test file in `src/components/__tests__/`
4. Export from `src/components/index.ts`

```typescript
// src/components/MyComponent.tsx
import React from 'react';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({ title, onAction }) => {
  return (
    <div>
      <h2>{title}</h2>
      <button onClick={onAction}>Action</button>
    </div>
  );
};
```

### Adding a Custom Hook

1. Create hook file in `src/hooks/`
2. Follow `use` prefix convention
3. Add test coverage
4. Export from `src/hooks/index.ts`

```typescript
// src/hooks/useCustomHook.ts
import { useState, useEffect } from 'react';

export const useCustomHook = (param: string) => {
  const [data, setData] = useState<string | null>(null);

  useEffect(() => {
    // Hook logic
    setData(param);
  }, [param]);

  return { data };
};
```

### Styling Guidelines

The app uses Tailwind CSS with custom design tokens:

```css
/* Custom classes in index.css */
.card              /* Base card style */
.card-elevated     /* Card with shadow */
.card-hover        /* Hover animation */
.btn-primary       /* Primary button */
.btn-ghost         /* Subtle button */
.section-title     /* Section headings */
```

**Color Palette:**
- Primary: Slate scale (`primary-50` to `primary-950`)
- Accent: Orange scale (`accent-50` to `accent-950`)
- Status: Emerald (success), Amber (warning), Red (error)

## Troubleshooting

### Common Issues

**Build fails with TypeScript errors:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment variables not loading:**
- Ensure variables are prefixed with `VITE_`
- Restart dev server after changing `.env`
- Check `import.meta.env.VITE_VARIABLE_NAME` syntax

**Wallet connection fails:**
- Install [Hiro Wallet](https://wallet.hiro.so/) browser extension
- Ensure wallet is on correct network (testnet/mainnet)
- Check browser console for errors

**CORS errors:**
- Verify `VITE_STACKS_API_URL` is correct
- Check Hiro API status: https://status.hiro.so
- Test API endpoint directly in browser

**Transaction not confirming:**
- Transactions can take 10-30 minutes on Stacks
- Check transaction in explorer using txId
- Ensure sufficient STX balance for fees

### Debug Mode

Enable verbose logging in browser console:

```typescript
// Add to main.tsx for debugging
if (import.meta.env.DEV) {
  console.log('Network:', import.meta.env.VITE_NETWORK);
  console.log('Contract:', import.meta.env.VITE_CONTRACT_ADDRESS);
}
```

## Security

### Best Practices

- **Never commit `.env` files** with real values
- **Validate user input** before contract calls
- **Use post-conditions** on all transactions
- **Verify contract addresses** before deployment
- **Keep dependencies updated** for security patches

### Environment Security

```bash
# Check for exposed secrets
git log --all --full-history -- "*.env"

# Ensure .gitignore is correct
cat ../.gitignore | grep .env
```

### Audit Checklist

- [ ] No hardcoded private keys or mnemonics
- [ ] Environment variables properly prefixed with `VITE_`
- [ ] Contract addresses verified against explorer
- [ ] Post-conditions on all STX transfers
- [ ] Input validation on user-entered amounts
- [ ] XSS protection via React's built-in escaping

## Performance Optimization

### Current Optimizations

- Code splitting: React and Stacks libraries in separate chunks
- Smart polling: Pauses when tab is hidden
- Debounced inputs: Prevents excessive re-renders
- Memoized calculations: Cached expensive computations

### Future Improvements

- [ ] Add React.lazy for route-based code splitting
- [ ] Implement virtual scrolling for transaction history
- [ ] Cache read-only contract calls
- [ ] Add service worker for offline support
- [ ] Optimize image assets

## Deployment

### Quick Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel --prod
```

For detailed deployment guide, see [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md).

### Other Platforms

**Netlify:**
```bash
npm run build
netlify deploy --dir=dist --prod
```

**GitHub Pages:**
```bash
npm run build
# Configure base path in vite.config.ts
# Deploy dist/ to gh-pages branch
```

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with atomic commits
3. Add tests for new features
4. Run `npm test` and `npm run build`
5. Submit pull request

### Commit Message Format

```
type(scope): brief description

Detailed explanation if needed.
```

**Types:** feat, fix, docs, style, refactor, test, chore

## Resources

- **Stacks Documentation:** https://docs.stacks.co
- **@stacks/connect Guide:** https://github.com/hirosystems/connect
- **Hiro Wallet:** https://wallet.hiro.so
- **Stacks Explorer:** https://explorer.hiro.so
- **API Reference:** https://docs.hiro.so/api

## Support

- **Issues:** https://github.com/Yusufolosun/bitflow-lend/issues
- **Security Reports:** See [../SECURITY.md](../SECURITY.md)

## License

MIT License - see [LICENSE](../LICENSE) file for details

---

**Built with ❤️ on Stacks**
