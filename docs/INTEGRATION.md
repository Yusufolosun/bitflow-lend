# BitFlow Vault Integration Guide

This guide provides step-by-step instructions for integrating with the BitFlow vault-core contract. Whether you're building a DApp, bot, or backend service, this document covers all the essentials.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Wallet Connection](#wallet-connection)
- [Contract Interaction](#contract-interaction)
  - [Depositing Collateral](#depositing-collateral)
  - [Borrowing STX](#borrowing-stx)
  - [Repaying Loans](#repaying-loans)
  - [Liquidating Positions](#liquidating-positions)
- [Read-Only Queries](#read-only-queries)
- [Frontend Integration](#frontend-integration)
- [Backend Integration](#backend-integration)
- [Testing](#testing)
- [Production Checklist](#production-checklist)

---

## Prerequisites

### Required Knowledge

- JavaScript/TypeScript fundamentals
- React (for frontend integration)
- Node.js (for backend integration)
- Basic understanding of Stacks blockchain
- Familiarity with async/await patterns

### Required Packages

```bash
npm install @stacks/transactions @stacks/network @stacks/connect
npm install --save-dev @stacks/clarinet-sdk vitest
```

### Package Versions

```json
{
  "dependencies": {
    "@stacks/transactions": "^6.13.0",
    "@stacks/network": "^6.13.0",
    "@stacks/connect": "^7.8.0"
  },
  "devDependencies": {
    "@stacks/clarinet-sdk": "^2.0.0",
    "vitest": "^4.0.0"
  }
}
```

---

## Environment Setup

### 1. Network Configuration

```typescript
import { StacksMainnet, StacksTestnet, StacksDevnet } from '@stacks/network';

// Mainnet
export const mainnet = new StacksMainnet();

// Testnet
export const testnet = new StacksTestnet();

// Devnet (local)
export const devnet = new StacksDevnet();

// Select based on environment
export const network = process.env.NETWORK === 'mainnet' 
  ? mainnet 
  : testnet;
```

### 2. Contract Configuration

```typescript
export const VAULT_CONTRACT = {
  address: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', // Update with actual
  name: 'vault-core'
};

export const contractAddress = VAULT_CONTRACT.address;
export const contractName = VAULT_CONTRACT.name;
```

### 3. Environment Variables

```bash
# .env
VITE_NETWORK=testnet
VITE_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
VITE_CONTRACT_NAME=vault-core
```

---

## Wallet Connection

### Frontend: Using Stacks Connect

#### 1. Install Stacks Connect

```bash
npm install @stacks/connect
```

#### 2. Setup Authentication

```typescript
import { AppConfig, UserSession, showConnect } from '@stacks/connect';

// Configure app
const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

// Connect wallet
export function connectWallet() {
  showConnect({
    appDetails: {
      name: 'BitFlow Vault',
      icon: window.location.origin + '/logo.png',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
}

// Check if authenticated
export function isAuthenticated(): boolean {
  return userSession.isUserSignedIn();
}

// Get user address
export function getUserAddress(): string | null {
  if (!isAuthenticated()) return null;
  
  const userData = userSession.loadUserData();
  return userData.profile.stxAddress.testnet; // or .mainnet
}

// Disconnect wallet
export function disconnectWallet() {
  userSession.signUserOut('/');
}
```

#### 3. React Hook for Wallet

```typescript
import { useState, useEffect } from 'react';

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      const userAddress = getUserAddress();
      setAddress(userAddress);
      setIsConnected(true);
    }
  }, []);

  const connect = async () => {
    connectWallet();
  };

  const disconnect = () => {
    disconnectWallet();
    setAddress(null);
    setIsConnected(false);
  };

  return {
    address,
    isConnected,
    connect,
    disconnect,
  };
}

// Usage in component
function App() {
  const { address, isConnected, connect, disconnect } = useWallet();

  return (
    <div>
      {isConnected ? (
        <div>
          <p>Connected: {address}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button onClick={connect}>Connect Wallet</button>
      )}
    </div>
  );
}
```

### Backend: Using Private Keys

```typescript
import { makeSTXTokenTransfer, broadcastTransaction } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

// Load private key from environment
const PRIVATE_KEY = process.env.PRIVATE_KEY!;

// Get address from private key
import { getAddressFromPrivateKey, TransactionVersion } from '@stacks/transactions';

const address = getAddressFromPrivateKey(
  PRIVATE_KEY,
  TransactionVersion.Testnet
);

console.log('Bot address:', address);
```

---

## Contract Interaction

### Depositing Collateral

#### Frontend Implementation

```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';

export async function deposit(
  amount: number,
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  const amountMicroStx = amount; // Amount in microSTX

  try {
    await openContractCall({
      network,
      contractAddress,
      contractName,
      functionName: 'deposit',
      functionArgs: [uintCV(amountMicroStx)],
      onFinish: (data) => {
        console.log('Transaction submitted:', data.txId);
        if (onSuccess) onSuccess();
      },
      onCancel: () => {
        console.log('User cancelled transaction');
      },
    });
  } catch (error) {
    console.error('Deposit failed:', error);
    if (onError) onError(error);
  }
}

// Usage
async function handleDeposit() {
  const amount = 1000; // 1000 microSTX

  await deposit(
    amount,
    () => {
      showSuccess('Deposit transaction submitted!');
      // Wait for confirmation and refresh balance
      waitForConfirmation(txId).then(refreshBalance);
    },
    (error) => {
      showError('Deposit failed: ' + error.message);
    }
  );
}
```

#### Backend Implementation

```typescript
import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from '@stacks/transactions';

export async function depositBackend(
  privateKey: string,
  amount: number
): Promise<string> {
  const senderAddress = getAddressFromPrivateKey(
    privateKey,
    TransactionVersion.Testnet
  );

  // Create post-condition to ensure STX transfer
  const postCondition = makeStandardSTXPostCondition(
    senderAddress,
    FungibleConditionCode.Equal,
    amount
  );

  const txOptions = {
    contractAddress,
    contractName,
    functionName: 'deposit',
    functionArgs: [uintCV(amount)],
    senderKey: privateKey,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    postConditions: [postCondition],
  };

  const transaction = await makeContractCall(txOptions);
  const result = await broadcastTransaction(transaction, network);

  if (result.error) {
    throw new Error(result.error);
  }

  return result.txid;
}

// Usage
const txId = await depositBackend(PRIVATE_KEY, 1000);
console.log('Deposit transaction:', txId);
```

#### With Validation

```typescript
export async function depositWithValidation(amount: number) {
  // 1. Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  // 2. Check user balance
  const userBalance = await getUserSTXBalance(userAddress);
  if (userBalance < amount) {
    throw new Error(`Insufficient balance. You have ${userBalance} STX`);
  }

  // 3. Execute deposit
  await deposit(amount);
}

// Helper: Get STX balance
async function getUserSTXBalance(address: string): Promise<number> {
  const response = await fetch(
    `https://api.testnet.hiro.so/extended/v1/address/${address}/balances`
  );
  const data = await response.json();
  return parseInt(data.stx.balance);
}
```

---

### Borrowing STX

#### Frontend Implementation

```typescript
export async function borrow(
  amount: number,
  interestRate: number,
  termDays: number,
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  try {
    await openContractCall({
      network,
      contractAddress,
      contractName,
      functionName: 'borrow',
      functionArgs: [
        uintCV(amount),
        uintCV(interestRate),
        uintCV(termDays),
      ],
      onFinish: (data) => {
        console.log('Borrow transaction submitted:', data.txId);
        if (onSuccess) onSuccess();
      },
      onCancel: () => {
        console.log('User cancelled transaction');
      },
    });
  } catch (error) {
    console.error('Borrow failed:', error);
    if (onError) onError(error);
  }
}

// Usage with validation
export async function borrowWithValidation(
  amount: number,
  interestRate: number,
  termDays: number
) {
  // 1. Check for existing loan
  const existingLoan = await getUserLoan(userAddress);
  if (existingLoan) {
    throw new Error('You already have an active loan. Please repay it first.');
  }

  // 2. Check collateral
  const deposit = await getUserDeposit(userAddress);
  const requiredCollateral = await calculateRequiredCollateral(amount);
  
  if (deposit < requiredCollateral) {
    throw new Error(
      `Insufficient collateral. You need ${requiredCollateral} STX but have ${deposit} STX. ` +
      `Please deposit ${requiredCollateral - deposit} more STX.`
    );
  }

  // 3. Execute borrow
  await borrow(amount, interestRate, termDays);
}
```

#### React Component Example

```typescript
function BorrowForm() {
  const [amount, setAmount] = useState(0);
  const [interestRate, setInterestRate] = useState(10);
  const [termDays, setTermDays] = useState(30);
  const [deposit, setDeposit] = useState(0);
  const [maxBorrow, setMaxBorrow] = useState(0);

  useEffect(() => {
    // Load user deposit
    getUserDeposit(userAddress).then(setDeposit);
  }, [userAddress]);

  useEffect(() => {
    // Calculate max borrow based on deposit
    setMaxBorrow(Math.floor(deposit / 1.5));
  }, [deposit]);

  const handleBorrow = async () => {
    try {
      await borrowWithValidation(amount, interestRate, termDays);
      showSuccess('Loan created successfully!');
    } catch (error) {
      showError(error.message);
    }
  };

  const requiredCollateral = Math.ceil(amount * 1.5);
  const collateralRatio = deposit > 0 ? (deposit / amount) * 100 : 0;

  return (
    <form>
      <div>
        <label>Your Deposit: {deposit} STX</label>
        <label>Max Borrow: {maxBorrow} STX</label>
      </div>

      <div>
        <label>Borrow Amount (STX)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          max={maxBorrow}
          min={0}
        />
        <span>Required Collateral: {requiredCollateral} STX</span>
      </div>

      <div>
        <label>Interest Rate (%)</label>
        <input
          type="number"
          value={interestRate}
          onChange={(e) => setInterestRate(Number(e.target.value))}
          min={0}
          max={100}
        />
      </div>

      <div>
        <label>Term (Days)</label>
        <select value={termDays} onChange={(e) => setTermDays(Number(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      <div>
        <p>Collateral Ratio: {collateralRatio.toFixed(0)}%</p>
        {collateralRatio < 150 && (
          <Warning>
            Insufficient collateral. You need at least 150% collateralization.
          </Warning>
        )}
      </div>

      <button
        type="button"
        onClick={handleBorrow}
        disabled={amount > maxBorrow || amount <= 0}
      >
        Borrow {amount} STX
      </button>
    </form>
  );
}
```

---

### Repaying Loans

#### Frontend Implementation

```typescript
export async function repay(
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  try {
    await openContractCall({
      network,
      contractAddress,
      contractName,
      functionName: 'repay',
      functionArgs: [], // No arguments needed
      onFinish: (data) => {
        console.log('Repayment transaction submitted:', data.txId);
        if (onSuccess) onSuccess();
      },
      onCancel: () => {
        console.log('User cancelled transaction');
      },
    });
  } catch (error) {
    console.error('Repayment failed:', error);
    if (onError) onError(error);
  }
}

// With validation
export async function repayWithValidation() {
  // 1. Check for active loan
  const loan = await getUserLoan(userAddress);
  if (!loan) {
    throw new Error('You have no active loan to repay');
  }

  // 2. Get repayment amount
  const repaymentAmount = await getRepaymentAmount(userAddress);
  if (!repaymentAmount) {
    throw new Error('Unable to calculate repayment amount');
  }

  // 3. Check user balance
  const balance = await getUserSTXBalance(userAddress);
  if (balance < repaymentAmount.total) {
    throw new Error(
      `Insufficient balance. You need ${repaymentAmount.total} STX but have ${balance} STX`
    );
  }

  // 4. Execute repayment
  await repay();
}
```

#### React Component Example

```typescript
function RepaymentView() {
  const [loan, setLoan] = useState<Loan | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<RepaymentAmount | null>(null);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    // Load loan details
    getUserLoan(userAddress).then(setLoan);
    getRepaymentAmount(userAddress).then(setRepaymentAmount);
    getUserSTXBalance(userAddress).then(setBalance);

    // Refresh repayment amount every 10 seconds (interest accrues)
    const interval = setInterval(() => {
      getRepaymentAmount(userAddress).then(setRepaymentAmount);
    }, 10000);

    return () => clearInterval(interval);
  }, [userAddress]);

  if (!loan || !repaymentAmount) {
    return <div>No active loan</div>;
  }

  const canRepay = balance >= repaymentAmount.total;

  const handleRepay = async () => {
    try {
      await repayWithValidation();
      showSuccess('Loan repaid successfully!');
      // Reload page or navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <div>
      <h2>Repay Loan</h2>
      
      <div>
        <h3>Loan Details</h3>
        <p>Principal: {loan.amount} STX</p>
        <p>Interest Rate: {loan['interest-rate']}%</p>
        <p>Start Block: {loan['start-block']}</p>
        <p>Term End: {loan['term-end']}</p>
      </div>

      <div>
        <h3>Repayment Breakdown</h3>
        <p>Principal: {repaymentAmount.principal} STX</p>
        <p>Interest: {repaymentAmount.interest} STX</p>
        <p><strong>Total: {repaymentAmount.total} STX</strong></p>
      </div>

      <div>
        <p>Your Balance: {balance} STX</p>
        {!canRepay && (
          <Warning>
            Insufficient balance. You need {repaymentAmount.total - balance} more STX.
          </Warning>
        )}
      </div>

      <button onClick={handleRepay} disabled={!canRepay}>
        Repay {repaymentAmount.total} STX
      </button>
    </div>
  );
}
```

---

### Liquidating Positions

#### Frontend Implementation

```typescript
export async function liquidate(
  borrowerAddress: string,
  stxPrice: number,
  onSuccess?: () => void,
  onError?: (error: any) => void
) {
  try {
    await openContractCall({
      network,
      contractAddress,
      contractName,
      functionName: 'liquidate',
      functionArgs: [
        principalCV(borrowerAddress),
        uintCV(stxPrice),
      ],
      onFinish: (data) => {
        console.log('Liquidation transaction submitted:', data.txId);
        if (onSuccess) onSuccess();
      },
      onCancel: () => {
        console.log('User cancelled transaction');
      },
    });
  } catch (error) {
    console.error('Liquidation failed:', error);
    if (onError) onError(error);
  }
}

// With validation
export async function liquidateWithValidation(
  borrowerAddress: string,
  stxPrice: number
) {
  // 1. Check borrower has loan
  const loan = await getUserLoan(borrowerAddress);
  if (!loan) {
    throw new Error('Target address has no active loan');
  }

  // 2. Check if liquidatable
  const isLiquidatable = await checkIsLiquidatable(borrowerAddress, stxPrice);
  if (!isLiquidatable) {
    const healthFactor = await calculateHealthFactor(borrowerAddress, stxPrice);
    throw new Error(
      `Position is not liquidatable. Health factor: ${healthFactor}% (must be < 110%)`
    );
  }

  // 3. Check self-liquidation
  if (borrowerAddress === userAddress) {
    throw new Error('You cannot liquidate your own position');
  }

  // 4. Calculate costs and profit
  const deposit = await getUserDeposit(borrowerAddress);
  const bonus = Math.floor(loan.amount * 0.05);
  const totalCost = loan.amount + bonus;
  const profit = deposit - totalCost;

  if (profit <= 0) {
    throw new Error(`Liquidation not profitable. Profit: ${profit} STX`);
  }

  // 5. Check liquidator balance
  const liquidatorBalance = await getUserSTXBalance(userAddress);
  if (liquidatorBalance < totalCost) {
    throw new Error(
      `Insufficient balance. You need ${totalCost} STX but have ${liquidatorBalance} STX`
    );
  }

  // 6. Execute liquidation
  console.log(`Liquidating ${borrowerAddress} with profit: ${profit} STX`);
  await liquidate(borrowerAddress, stxPrice);
}
```

#### Liquidation Bot Example

```typescript
import { callReadOnlyFunction, principalCV, uintCV } from '@stacks/transactions';

interface LiquidationOpportunity {
  borrower: string;
  loan: number;
  collateral: number;
  healthFactor: number;
  profit: number;
}

class LiquidationBot {
  private positions: string[] = [];
  private stxPrice: number = 100; // Default $1.00

  constructor(
    private privateKey: string,
    private priceOracle: PriceOracle
  ) {}

  // Scan for liquidation opportunities
  async scan(): Promise<LiquidationOpportunity[]> {
    const opportunities: LiquidationOpportunity[] = [];
    
    // Get current STX price from oracle
    this.stxPrice = await this.priceOracle.getPrice();

    for (const borrower of this.positions) {
      const opportunity = await this.checkPosition(borrower);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }

    // Sort by profit (highest first)
    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  private async checkPosition(
    borrower: string
  ): Promise<LiquidationOpportunity | null> {
    // Get loan details
    const loan = await getUserLoan(borrower);
    if (!loan) return null;

    // Check if liquidatable
    const isLiquidatable = await checkIsLiquidatable(borrower, this.stxPrice);
    if (!isLiquidatable) return null;

    // Calculate health factor
    const healthFactor = await calculateHealthFactor(borrower, this.stxPrice);
    if (!healthFactor || healthFactor >= 110) return null;

    // Calculate profit
    const collateral = await getUserDeposit(borrower);
    const bonus = Math.floor(loan.amount * 0.05);
    const cost = loan.amount + bonus;
    const profit = collateral - cost;

    if (profit <= 0) return null;

    return {
      borrower,
      loan: loan.amount,
      collateral,
      healthFactor,
      profit,
    };
  }

  // Execute liquidation
  async liquidate(opportunity: LiquidationOpportunity): Promise<string> {
    console.log(`Liquidating ${opportunity.borrower} for ${opportunity.profit} STX profit`);

    const txId = await liquidateBackend(
      this.privateKey,
      opportunity.borrower,
      this.stxPrice
    );

    console.log(`Liquidation transaction: ${txId}`);
    return txId;
  }

  // Main bot loop
  async run(intervalSeconds: number = 30) {
    console.log('Liquidation bot started');

    setInterval(async () => {
      try {
        const opportunities = await this.scan();
        
        if (opportunities.length > 0) {
          console.log(`Found ${opportunities.length} liquidation opportunities`);
          
          // Liquidate the most profitable
          const best = opportunities[0];
          await this.liquidate(best);
        }
      } catch (error) {
        console.error('Bot error:', error);
      }
    }, intervalSeconds * 1000);
  }
}

// Usage
const bot = new LiquidationBot(PRIVATE_KEY, priceOracle);
bot.run(30); // Check every 30 seconds
```

---

## Read-Only Queries

### Helper Functions

```typescript
import { callReadOnlyFunction, cvToValue } from '@stacks/transactions';

// Get user deposit
export async function getUserDeposit(userAddress: string): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-user-deposit',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });

  return cvToValue(result);
}

// Get user loan
export async function getUserLoan(userAddress: string): Promise<Loan | null> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-user-loan',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });

  return cvToValue(result);
}

// Get repayment amount
export async function getRepaymentAmount(
  userAddress: string
): Promise<RepaymentAmount | null> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-repayment-amount',
    functionArgs: [principalCV(userAddress)],
    network,
    senderAddress: userAddress,
  });

  return cvToValue(result);
}

// Calculate health factor
export async function calculateHealthFactor(
  userAddress: string,
  stxPrice: number
): Promise<number | null> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'calculate-health-factor',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    network,
    senderAddress: userAddress,
  });

  return cvToValue(result);
}

// Check if liquidatable
export async function checkIsLiquidatable(
  userAddress: string,
  stxPrice: number
): Promise<boolean> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'is-liquidatable',
    functionArgs: [principalCV(userAddress), uintCV(stxPrice)],
    network,
    senderAddress: userAddress,
  });

  return cvToValue(result);
}

// Calculate required collateral
export async function calculateRequiredCollateral(
  borrowAmount: number
): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'calculate-required-collateral',
    functionArgs: [uintCV(borrowAmount)],
    network,
    senderAddress: contractAddress,
  });

  return cvToValue(result);
}

// Get total deposits
export async function getTotalDeposits(): Promise<number> {
  const result = await callReadOnlyFunction({
    contractAddress,
    contractName,
    functionName: 'get-total-deposits',
    functionArgs: [],
    network,
    senderAddress: contractAddress,
  });

  return cvToValue(result);
}
```

### Type Definitions

```typescript
export interface Loan {
  amount: number;
  'interest-rate': number;
  'start-block': number;
  'term-end': number;
}

export interface RepaymentAmount {
  principal: number;
  interest: number;
  total: number;
}

export interface LiquidationResult {
  'seized-collateral': number;
  paid: number;
  bonus: number;
}
```

---

## Frontend Integration

### Complete Dashboard Example

```typescript
import { useState, useEffect } from 'react';

function Dashboard() {
  const { address, isConnected } = useWallet();
  const [deposit, setDeposit] = useState(0);
  const [loan, setLoan] = useState<Loan | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<RepaymentAmount | null>(null);
  const [healthFactor, setHealthFactor] = useState<number | null>(null);
  const [stxPrice, setStxPrice] = useState(100); // $1.00

  useEffect(() => {
    if (!isConnected || !address) return;

    loadUserData();

    // Refresh data every 30 seconds
    const interval = setInterval(loadUserData, 30000);
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const loadUserData = async () => {
    if (!address) return;

    const [depositData, loanData, repaymentData, healthData] = await Promise.all([
      getUserDeposit(address),
      getUserLoan(address),
      getRepaymentAmount(address),
      calculateHealthFactor(address, stxPrice),
    ]);

    setDeposit(depositData);
    setLoan(loanData);
    setRepaymentAmount(repaymentData);
    setHealthFactor(healthData);
  };

  const maxBorrow = Math.floor(deposit / 1.5);

  return (
    <div>
      <h1>BitFlow Vault Dashboard</h1>

      {!isConnected ? (
        <ConnectWalletButton />
      ) : (
        <>
          {/* Deposit Section */}
          <section>
            <h2>Your Deposit</h2>
            <p>{deposit} STX</p>
            <p>Max Borrow Capacity: {maxBorrow} STX</p>
            <button onClick={() => navigate('/deposit')}>Deposit More</button>
            <button onClick={() => navigate('/withdraw')}>Withdraw</button>
          </section>

          {/* Loan Section */}
          <section>
            <h2>Your Loan</h2>
            {loan ? (
              <div>
                <p>Amount: {loan.amount} STX</p>
                <p>Interest Rate: {loan['interest-rate']}%</p>
                <p>Health Factor: {healthFactor}%</p>
                
                {healthFactor && healthFactor < 110 && (
                  <Alert severity="error">
                    Warning: Your position is liquidatable!
                  </Alert>
                )}
                
                {healthFactor && healthFactor < 150 && (
                  <Alert severity="warning">
                    Warning: Health factor below minimum. Consider adding collateral.
                  </Alert>
                )}

                {repaymentAmount && (
                  <div>
                    <h3>Repayment Amount</h3>
                    <p>Principal: {repaymentAmount.principal} STX</p>
                    <p>Interest: {repaymentAmount.interest} STX</p>
                    <p><strong>Total: {repaymentAmount.total} STX</strong></p>
                    <button onClick={() => navigate('/repay')}>Repay Now</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p>No active loan</p>
                <button onClick={() => navigate('/borrow')}>Borrow STX</button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
```

---

## Backend Integration

### Node.js Service Example

```typescript
import express from 'express';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Get user position
app.get('/position/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    const [deposit, loan, repayment, health] = await Promise.all([
      getUserDeposit(address),
      getUserLoan(address),
      getRepaymentAmount(address),
      calculateHealthFactor(address, 100), // Use current price
    ]);

    res.json({
      deposit,
      loan,
      repayment,
      healthFactor: health,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute deposit (requires authentication)
app.post('/deposit', async (req, res) => {
  try {
    const { amount, privateKey } = req.body;
    
    const txId = await depositBackend(privateKey, amount);
    
    res.json({ txId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Testing

### Integration Tests

```typescript
import { describe, it, expect, beforeAll } from 'vitest';

describe('BitFlow Integration Tests', () => {
  let userAddress: string;

  beforeAll(() => {
    userAddress = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  });

  it('should get user deposit', async () => {
    const deposit = await getUserDeposit(userAddress);
    expect(typeof deposit).toBe('number');
  });

  it('should calculate required collateral', async () => {
    const required = await calculateRequiredCollateral(1000);
    expect(required).toBe(1500);
  });

  it('should validate borrow requirements', async () => {
    const deposit = 1500;
    const borrowAmount = 1000;
    const required = await calculateRequiredCollateral(borrowAmount);
    
    expect(deposit).toBeGreaterThanOrEqual(required);
  });
});
```

---

## Production Checklist

### Before Going Live

- [ ] **Security Audit:** Get contract audited by professional firm
- [ ] **Oracle Integration:** Implement trusted price oracle (Redstone/Chainlink)
- [ ] **Error Handling:** Comprehensive error handling and user feedback
- [ ] **Transaction Monitoring:** Track transaction status and confirmations
- [ ] **Gas Estimation:** Provide gas estimates for transactions
- [ ] **Rate Limiting:** Implement rate limiting for API endpoints
- [ ] **Logging:** Set up comprehensive logging and monitoring
- [ ] **Testing:** 100% test coverage on critical paths
- [ ] **Documentation:** User guides and FAQs
- [ ] **Support:** Customer support system
- [ ] **Backup:** Private key backup and recovery system
- [ ] **Insurance:** Consider smart contract insurance

### Performance Optimization

- [ ] Cache read-only function results (with TTL)
- [ ] Batch multiple read-only calls
- [ ] Use WebSockets for real-time updates
- [ ] Implement optimistic UI updates
- [ ] Lazy load transaction history
- [ ] Use CDN for static assets

### Security Best Practices

- [ ] Never expose private keys in frontend code
- [ ] Validate all user inputs
- [ ] Use post-conditions for critical transactions
- [ ] Implement CSRF protection
- [ ] Use HTTPS only
- [ ] Enable Content Security Policy
- [ ] Regular security updates
- [ ] Bug bounty program

---

## Additional Resources

- [Stacks Documentation](https://docs.stacks.co/)
- [@stacks/transactions API](https://stacks.js.org/)
- [@stacks/connect Guide](https://github.com/hirosystems/connect)
- [Contract Documentation](./CONTRACTS.md)
- [API Reference](./API.md)
- [Security Guide](./SECURITY.md)
- [Error Codes](./ERROR_REFERENCE.md)

---

## React Integration

Complete guide to integrating BitFlow Lend into a React application.

### Prerequisites

```bash
npm install @stacks/connect @stacks/transactions @stacks/network react react-dom
```

### Wallet Connection Hook

```typescript
// hooks/useBitFlowAuth.ts
import { useState, useCallback, useEffect } from 'react';
import { showConnect, UserSession, AppConfig } from '@stacks/connect';

const appConfig = new AppConfig(['store_write']);
const userSession = new UserSession({ appConfig });

export function useBitFlowAuth() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      setIsConnected(true);
      setAddress(userData.profile.stxAddress.mainnet);
    }
  }, []);

  const connect = useCallback(() => {
    showConnect({
      appDetails: { name: 'BitFlow Lend', icon: '/logo.png' },
      onFinish: () => {
        const userData = userSession.loadUserData();
        setIsConnected(true);
        setAddress(userData.profile.stxAddress.mainnet);
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut();
    setIsConnected(false);
    setAddress(null);
  }, []);

  return { isConnected, address, connect, disconnect, userSession };
}
```

### Contract Interaction Hook

```typescript
// hooks/useBitFlowVault.ts
import { useCallback, useState } from 'react';
import { openContractCall } from '@stacks/connect';
import {
  callReadOnlyFunction,
  uintCV,
  principalCV,
  cvToValue,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
} from '@stacks/transactions';

const CONTRACT_ADDRESS = 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193';
const CONTRACT_NAME = 'bitflow-vault-core';
const MICRO_STX = 1_000_000;

export function useBitFlowVault(userAddress: string) {
  const [loading, setLoading] = useState(false);

  // Read-only: get user deposit
  const getDeposit = useCallback(async () => {
    const result = await callReadOnlyFunction({
      contractAddress: CONTRACT_ADDRESS,
      contractName: CONTRACT_NAME,
      functionName: 'get-user-deposit',
      functionArgs: [principalCV(userAddress)],
      senderAddress: userAddress,
      network: 'mainnet',
    });
    return Number(cvToValue(result)) / MICRO_STX;
  }, [userAddress]);

  // Write: deposit STX
  const deposit = useCallback(async (amountSTX: number) => {
    setLoading(true);
    const amountMicro = Math.floor(amountSTX * MICRO_STX);
    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'deposit',
        functionArgs: [uintCV(amountMicro)],
        postConditions: [
          makeStandardSTXPostCondition(
            userAddress,
            FungibleConditionCode.Equal,
            amountMicro
          ),
        ],
        network: 'mainnet',
      });
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Write: borrow STX
  const borrow = useCallback(async (
    amountSTX: number,
    rateBPS: number,
    termDays: number
  ) => {
    setLoading(true);
    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'borrow',
        functionArgs: [
          uintCV(Math.floor(amountSTX * MICRO_STX)),
          uintCV(rateBPS),
          uintCV(termDays),
        ],
        network: 'mainnet',
      });
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  // Write: repay loan
  const repay = useCallback(async () => {
    setLoading(true);
    try {
      await openContractCall({
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'repay',
        functionArgs: [],
        network: 'mainnet',
      });
    } finally {
      setLoading(false);
    }
  }, [userAddress]);

  return { getDeposit, deposit, borrow, repay, loading };
}
```

### Complete React Component

```tsx
// components/BitFlowDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useBitFlowAuth } from '../hooks/useBitFlowAuth';
import { useBitFlowVault } from '../hooks/useBitFlowVault';

export const BitFlowDashboard: React.FC = () => {
  const { isConnected, address, connect, disconnect } = useBitFlowAuth();
  const vault = useBitFlowVault(address || '');
  const [depositAmount, setDepositAmount] = useState('');
  const [userDeposit, setUserDeposit] = useState(0);

  useEffect(() => {
    if (address) {
      vault.getDeposit().then(setUserDeposit);
    }
  }, [address]);

  if (!isConnected) {
    return (
      <div className="p-8 text-center">
        <h1>BitFlow Lend</h1>
        <p>Connect your wallet to get started</p>
        <button onClick={connect}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1>BitFlow Lend</h1>
        <div>
          <span>{address?.slice(0, 8)}...{address?.slice(-4)}</span>
          <button onClick={disconnect} className="ml-4">Disconnect</button>
        </div>
      </div>

      <div className="mb-4">
        <p>Your Deposit: {userDeposit.toFixed(6)} STX</p>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          placeholder="Amount in STX"
        />
        <button
          onClick={() => vault.deposit(parseFloat(depositAmount))}
          disabled={vault.loading}
        >
          {vault.loading ? 'Processing...' : 'Deposit'}
        </button>
      </div>
    </div>
  );
};
```

---

## Vue.js Integration

Integrate BitFlow Lend using Vue 3 Composition API.

### Setup

```bash
npm install @stacks/connect @stacks/transactions @stacks/network vue
```

### Composable: useWallet

```typescript
// composables/useWallet.ts
import { ref, onMounted } from 'vue';
import { showConnect, UserSession, AppConfig } from '@stacks/connect';

const appConfig = new AppConfig(['store_write']);
const userSession = new UserSession({ appConfig });

export function useWallet() {
  const isConnected = ref(false);
  const address = ref<string | null>(null);

  onMounted(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      isConnected.value = true;
      address.value = userData.profile.stxAddress.mainnet;
    }
  });

  function connect() {
    showConnect({
      appDetails: { name: 'BitFlow Lend', icon: '/logo.png' },
      onFinish: () => {
        const userData = userSession.loadUserData();
        isConnected.value = true;
        address.value = userData.profile.stxAddress.mainnet;
      },
      userSession,
    });
  }

  function disconnect() {
    userSession.signUserOut();
    isConnected.value = false;
    address.value = null;
  }

  return { isConnected, address, connect, disconnect };
}
```

### Composable: useVault

```typescript
// composables/useVault.ts
import { ref } from 'vue';
import { openContractCall } from '@stacks/connect';
import { callReadOnlyFunction, uintCV, principalCV, cvToValue } from '@stacks/transactions';

const CONTRACT = {
  address: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
  name: 'bitflow-vault-core',
};

export function useVault(userAddress: () => string | null) {
  const loading = ref(false);
  const deposit = ref(0);

  async function fetchDeposit() {
    const addr = userAddress();
    if (!addr) return;
    const result = await callReadOnlyFunction({
      ...CONTRACT, contractAddress: CONTRACT.address, contractName: CONTRACT.name,
      functionName: 'get-user-deposit',
      functionArgs: [principalCV(addr)],
      senderAddress: addr,
      network: 'mainnet',
    });
    deposit.value = Number(cvToValue(result)) / 1_000_000;
  }

  async function makeDeposit(amountSTX: number) {
    loading.value = true;
    try {
      await openContractCall({
        contractAddress: CONTRACT.address,
        contractName: CONTRACT.name,
        functionName: 'deposit',
        functionArgs: [uintCV(Math.floor(amountSTX * 1_000_000))],
        network: 'mainnet',
      });
    } finally {
      loading.value = false;
    }
  }

  return { loading, deposit, fetchDeposit, makeDeposit };
}
```

### Vue Component

```vue
<!-- components/BitFlowDashboard.vue -->
<template>
  <div class="p-8">
    <div v-if="!wallet.isConnected.value" class="text-center">
      <h1>BitFlow Lend</h1>
      <button @click="wallet.connect">Connect Wallet</button>
    </div>
    <div v-else>
      <p>Connected: {{ wallet.address.value }}</p>
      <p>Deposit: {{ vault.deposit.value.toFixed(6) }} STX</p>
      <input v-model="amount" type="number" placeholder="STX amount" />
      <button @click="vault.makeDeposit(parseFloat(amount))" :disabled="vault.loading.value">
        {{ vault.loading.value ? 'Processing...' : 'Deposit' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useWallet } from '../composables/useWallet';
import { useVault } from '../composables/useVault';

const wallet = useWallet();
const vault = useVault(() => wallet.address.value);
const amount = ref('');

watch(() => wallet.isConnected.value, (connected) => {
  if (connected) vault.fetchDeposit();
});
</script>
```

---

## Vanilla JavaScript

Integrate BitFlow without any framework — pure JavaScript.

### HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BitFlow Lend</title>
  <script src="https://unpkg.com/@stacks/connect@7.4.0/dist/umd/index.js"></script>
  <script src="https://unpkg.com/@stacks/transactions@6.13.0/dist/umd/index.js"></script>
</head>
<body>
  <div id="app">
    <h1>BitFlow Lend</h1>
    <div id="wallet-section">
      <button id="connect-btn">Connect Wallet</button>
    </div>
    <div id="dashboard" style="display: none;">
      <p>Address: <span id="user-address"></span></p>
      <p>Deposit: <span id="user-deposit">0</span> STX</p>
      <input id="deposit-amount" type="number" placeholder="STX amount" />
      <button id="deposit-btn">Deposit</button>
    </div>
  </div>
  <script src="app.js"></script>
</body>
</html>
```

### JavaScript Logic

```javascript
// app.js
const CONTRACT_ADDRESS = 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193';
const CONTRACT_NAME = 'bitflow-vault-core';
const MICRO_STX = 1000000;

const { showConnect, UserSession, AppConfig } = window.StacksConnect;
const { callReadOnlyFunction, uintCV, principalCV, cvToValue, openContractCall } = window.StacksTransactions;

const appConfig = new AppConfig(['store_write']);
const userSession = new UserSession({ appConfig });

let currentAddress = null;

// Connect wallet
document.getElementById('connect-btn').addEventListener('click', () => {
  showConnect({
    appDetails: { name: 'BitFlow Lend', icon: '/logo.png' },
    onFinish: () => {
      const userData = userSession.loadUserData();
      currentAddress = userData.profile.stxAddress.mainnet;
      showDashboard();
    },
    userSession,
  });
});

// Show dashboard after connection
async function showDashboard() {
  document.getElementById('wallet-section').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('user-address').textContent = currentAddress;
  await refreshDeposit();
}

// Fetch deposit balance
async function refreshDeposit() {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-user-deposit',
    functionArgs: [principalCV(currentAddress)],
    senderAddress: currentAddress,
    network: 'mainnet',
  });
  const deposit = Number(cvToValue(result)) / MICRO_STX;
  document.getElementById('user-deposit').textContent = deposit.toFixed(6);
}

// Deposit STX
document.getElementById('deposit-btn').addEventListener('click', async () => {
  const amount = parseFloat(document.getElementById('deposit-amount').value);
  if (isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount');
    return;
  }
  
  await openContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'deposit',
    functionArgs: [uintCV(Math.floor(amount * MICRO_STX))],
    network: 'mainnet',
    onFinish: (data) => {
      console.log('Transaction:', data.txId);
      setTimeout(refreshDeposit, 15000); // Refresh after ~1 block
    },
  });
});

// Auto-connect if already signed in
if (userSession.isUserSignedIn()) {
  const userData = userSession.loadUserData();
  currentAddress = userData.profile.stxAddress.mainnet;
  showDashboard();
}
```

---

## Support

For integration support:
- **Discord:** [Join our Discord](https://discord.gg/bitflow)
- **GitHub Issues:** [Open an issue](https://github.com/bitflow/vault-core/issues)
- **Email:** developers@bitflow.finance

---

**Last Updated:** February 14, 2026  
**SDK Version:** @stacks/transactions@6.13.0
