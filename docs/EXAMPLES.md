# User Examples

This document provides complete end-to-end examples of user journeys through the BitFlow vault-core system, from wallet connection to complex DeFi operations.

## Table of Contents

- [Example 1: First-Time Depositor](#example-1-first-time-depositor)
- [Example 2: Borrower Journey](#example-2-borrower-journey)
- [Example 3: Loan Repayment](#example-3-loan-repayment)
- [Example 4: Liquidation Scenario](#example-4-liquidation-scenario)
- [Example 5: Liquidator Bot](#example-5-liquidator-bot)
- [Example 6: DeFi Dashboard](#example-6-defi-dashboard)
- [Example 7: Risk Management](#example-7-risk-management)

---

## Example 1: First-Time Depositor

### Scenario
Alice wants to earn passive income on her STX tokens by depositing them into BitFlow vault-core.

### User Journey

```
1. Connect Wallet → 2. View Available Balance → 3. Enter Deposit Amount → 
4. Review Transaction → 5. Confirm in Wallet → 6. View Deposit Confirmation
```

### Step-by-Step Code

#### Step 1: Connect Wallet

```typescript
import { showConnect } from '@stacks/connect';
import { AppConfig, UserSession } from '@stacks/connect';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

async function connectWallet() {
  showConnect({
    appDetails: {
      name: 'BitFlow Lend',
      icon: 'https://bitflow.finance/logo.png',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
    userSession,
  });
}

// In React component
function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      setIsConnected(true);
      const userData = userSession.loadUserData();
      setUserAddress(userData.profile.stxAddress.mainnet);
    }
  }, []);

  if (!isConnected) {
    return <button onClick={connectWallet}>Connect Wallet</button>;
  }

  return <DepositInterface userAddress={userAddress} />;
}
```

#### Step 2: View Available Balance

```typescript
import { StacksMainnet } from '@stacks/network';
import { AccountsApi, Configuration } from '@stacks/blockchain-api-client';

async function getSTXBalance(address: string): Promise<number> {
  const config = new Configuration({
    basePath: 'https://api.mainnet.hiro.so',
  });
  const accountsApi = new AccountsApi(config);

  const accountInfo = await accountsApi.getAccountBalance({
    principal: address,
  });

  // Convert from microSTX to STX
  return parseInt(accountInfo.stx.balance) / 1_000_000;
}

// Usage
const balance = await getSTXBalance(userAddress);
console.log(`Available: ${balance} STX`);
```

#### Step 3: Enter Deposit Amount

```typescript
function DepositForm() {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    getSTXBalance(userAddress).then(setBalance);
  }, [userAddress]);

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const numValue = parseFloat(value);

    // Validation
    if (numValue <= 0) {
      setError('Amount must be greater than 0');
    } else if (numValue > balance) {
      setError(`Insufficient balance. You have ${balance} STX`);
    } else {
      setError('');
    }
  };

  return (
    <div>
      <label>Deposit Amount (STX)</label>
      <input
        type="number"
        value={amount}
        onChange={(e) => handleAmountChange(e.target.value)}
        placeholder="0.00"
      />
      <p>Available: {balance} STX</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
```

#### Step 4: Review Transaction

```typescript
function ReviewDeposit({ amount }: { amount: number }) {
  // Fetch current user deposit
  const [currentDeposit, setCurrentDeposit] = useState(0);

  useEffect(() => {
    getUserDeposit(userAddress).then(setCurrentDeposit);
  }, []);

  const newTotal = currentDeposit + amount;

  return (
    <div className="review-panel">
      <h3>Review Deposit</h3>
      <div className="detail-row">
        <span>Current Deposit:</span>
        <span>{currentDeposit} STX</span>
      </div>
      <div className="detail-row">
        <span>Deposit Amount:</span>
        <span>+{amount} STX</span>
      </div>
      <div className="detail-row total">
        <span>New Total:</span>
        <span>{newTotal} STX</span>
      </div>
      <p className="note">
        Your funds will be available for withdrawal at any time.
      </p>
    </div>
  );
}
```

#### Step 5: Confirm in Wallet

```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV } from '@stacks/transactions';

async function deposit(amount: number) {
  const amountMicroSTX = amount * 1_000_000;

  await openContractCall({
    network: new StacksMainnet(),
    contractAddress: 'SP2XYZ...', // Your contract address
    contractName: 'vault-core',
    functionName: 'deposit',
    functionArgs: [uintCV(amountMicroSTX)],
    postConditions: [],
    onFinish: (data) => {
      console.log('Transaction ID:', data.txId);
      showSuccessMessage(data.txId);
    },
    onCancel: () => {
      console.log('User canceled transaction');
    },
  });
}
```

#### Step 6: View Deposit Confirmation

```typescript
function DepositConfirmation({ txId }: { txId: string }) {
  const [status, setStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  useEffect(() => {
    // Poll for transaction status
    const interval = setInterval(async () => {
      const tx = await fetchTransaction(txId);
      if (tx.tx_status === 'success') {
        setStatus('success');
        clearInterval(interval);
      } else if (tx.tx_status === 'abort_by_response') {
        setStatus('failed');
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [txId]);

  if (status === 'pending') {
    return <LoadingSpinner text="Confirming transaction..." />;
  }

  if (status === 'success') {
    return (
      <div className="success-panel">
        <h3>✅ Deposit Successful!</h3>
        <p>Your STX has been deposited into BitFlow vault-core.</p>
        <a href={`https://explorer.stacks.co/txid/${txId}`} target="_blank">
          View on Explorer
        </a>
        <button onClick={() => window.location.reload()}>
          View Dashboard
        </button>
      </div>
    );
  }

  return <ErrorPanel message="Transaction failed. Please try again." />;
}
```

---

## Example 2: Borrower Journey

### Scenario
Bob has 2000 STX deposited and wants to borrow 1000 STX for 30 days at 10% APR to invest in another opportunity.

### Prerequisites
- Bob has already deposited 2000 STX
- STX price: $1.00
- Required collateralization: 150%

### Calculations

```typescript
const depositAmount = 2000; // STX
const borrowAmount = 1000; // STX
const stxPrice = 1.00; // USD

// Collateral value in USD
const collateralValue = depositAmount * stxPrice; // $2000

// Required collateral for this loan
const requiredCollateral = borrowAmount * 1.5; // 1500 STX
const requiredCollateralUSD = requiredCollateral * stxPrice; // $1500

// Can Bob borrow?
const canBorrow = collateralValue >= requiredCollateralUSD; // true
console.log(`Can borrow: ${canBorrow}`);

// Remaining collateral after borrowing
const remainingCollateral = depositAmount - requiredCollateral; // 500 STX
console.log(`Remaining available: ${remainingCollateral} STX`);
```

### Complete Borrow Flow

```typescript
import { uintCV } from '@stacks/transactions';
import { openContractCall } from '@stacks/connect';

function BorrowInterface() {
  const [borrowAmount, setBorrowAmount] = useState('');
  const [interestRate, setInterestRate] = useState(10); // 10% APR
  const [loanTerm, setLoanTerm] = useState(30); // 30 days
  const [maxBorrowable, setMaxBorrowable] = useState(0);

  useEffect(() => {
    async function calculateMax() {
      const userDeposit = await getUserDeposit(userAddress);
      const stxPrice = await getSTXPrice();
      
      // Maximum borrowable = (deposit * price) / 1.5
      const maxBorrow = (userDeposit * stxPrice) / 1.5 / stxPrice;
      setMaxBorrowable(Math.floor(maxBorrow));
    }
    calculateMax();
  }, []);

  const handleBorrow = async () => {
    const amountMicroSTX = parseFloat(borrowAmount) * 1_000_000;
    const interestBasisPoints = interestRate * 100; // 10% = 1000 basis points

    await openContractCall({
      network: new StacksMainnet(),
      contractAddress: 'SP2XYZ...',
      contractName: 'vault-core',
      functionName: 'borrow',
      functionArgs: [
        uintCV(amountMicroSTX),
        uintCV(interestBasisPoints),
        uintCV(loanTerm),
      ],
      postConditions: [],
      onFinish: (data) => {
        console.log('Loan created! TX:', data.txId);
        navigateToLoanDashboard();
      },
    });
  };

  return (
    <div className="borrow-panel">
      <h3>Borrow STX</h3>
      
      <div className="info-card">
        <p>Your Deposit: {userDeposit} STX</p>
        <p>Maximum Borrowable: {maxBorrowable} STX</p>
      </div>

      <div className="input-group">
        <label>Borrow Amount</label>
        <input
          type="number"
          value={borrowAmount}
          onChange={(e) => setBorrowAmount(e.target.value)}
          max={maxBorrowable}
        />
        <button onClick={() => setBorrowAmount(maxBorrowable.toString())}>
          Max
        </button>
      </div>

      <div className="input-group">
        <label>Interest Rate (%)</label>
        <input
          type="number"
          value={interestRate}
          onChange={(e) => setInterestRate(parseFloat(e.target.value))}
        />
      </div>

      <div className="input-group">
        <label>Loan Term (days)</label>
        <select value={loanTerm} onChange={(e) => setLoanTerm(parseInt(e.target.value))}>
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
        </select>
      </div>

      <LoanSummary
        amount={parseFloat(borrowAmount)}
        rate={interestRate}
        term={loanTerm}
      />

      <button onClick={handleBorrow} disabled={!borrowAmount}>
        Borrow {borrowAmount} STX
      </button>
    </div>
  );
}

function LoanSummary({ amount, rate, term }: {
  amount: number;
  rate: number;
  term: number;
}) {
  const interest = (amount * rate / 100) * (term / 365);
  const total = amount + interest;

  return (
    <div className="loan-summary">
      <h4>Loan Summary</h4>
      <div className="row">
        <span>Principal:</span>
        <span>{amount} STX</span>
      </div>
      <div className="row">
        <span>Interest ({rate}% for {term} days):</span>
        <span>{interest.toFixed(2)} STX</span>
      </div>
      <div className="row total">
        <span>Total Repayment:</span>
        <span>{total.toFixed(2)} STX</span>
      </div>
    </div>
  );
}
```

---

## Example 3: Loan Repayment

### Scenario
Bob wants to repay his loan after 15 days (halfway through the 30-day term).

### Calculate Repayment

```typescript
async function calculateRepayment(borrower: string) {
  const network = new StacksMainnet();
  const contractAddress = 'SP2XYZ...';
  const contractName = 'vault-core';

  const result = await callReadOnlyFunction({
    network,
    contractAddress,
    contractName,
    functionName: 'get-repayment-amount',
    functionArgs: [principalCV(borrower)],
    senderAddress: borrower,
  });

  // Parse response
  if (result.type === ClarityType.OptionalSome) {
    const tuple = result.value as TupleCV;
    const principal = (tuple.data.principal as UIntCV).value;
    const interest = (tuple.data.interest as UIntCV).value;
    const total = (tuple.data.total as UIntCV).value;

    return {
      principal: Number(principal) / 1_000_000,
      interest: Number(interest) / 1_000_000,
      total: Number(total) / 1_000_000,
    };
  }

  return null;
}

// Usage
const repaymentInfo = await calculateRepayment(userAddress);
console.log(repaymentInfo);
// {
//   principal: 1000,
//   interest: 4.11,  // ~15 days of interest
//   total: 1004.11
// }
```

### Repay Loan

```typescript
function RepayLoanPanel() {
  const [repaymentInfo, setRepaymentInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    calculateRepayment(userAddress).then((info) => {
      setRepaymentInfo(info);
      setLoading(false);
    });
  }, []);

  const handleRepay = async () => {
    await openContractCall({
      network: new StacksMainnet(),
      contractAddress: 'SP2XYZ...',
      contractName: 'vault-core',
      functionName: 'repay',
      functionArgs: [], // No arguments needed
      postConditions: [],
      onFinish: (data) => {
        console.log('Loan repaid! TX:', data.txId);
        showSuccessMessage('Loan repaid successfully!');
      },
    });
  };

  if (loading) return <LoadingSpinner />;
  if (!repaymentInfo) return <p>No active loan found.</p>;

  return (
    <div className="repay-panel">
      <h3>Repay Loan</h3>
      
      <div className="repayment-breakdown">
        <div className="row">
          <span>Principal:</span>
          <span>{repaymentInfo.principal} STX</span>
        </div>
        <div className="row">
          <span>Interest:</span>
          <span>{repaymentInfo.interest.toFixed(2)} STX</span>
        </div>
        <div className="divider"></div>
        <div className="row total">
          <span>Total Due:</span>
          <span>{repaymentInfo.total.toFixed(2)} STX</span>
        </div>
      </div>

      <div className="info-box">
        <p>
          ℹ️ Your collateral ({repaymentInfo.principal * 1.5} STX) will be
          released after repayment.
        </p>
      </div>

      <button onClick={handleRepay} className="repay-button">
        Repay {repaymentInfo.total.toFixed(2)} STX
      </button>
    </div>
  );
}
```

---

## Example 4: Liquidation Scenario

### Scenario
Carol's STX price drops from $1.00 to $0.70, making her position liquidatable. Dave (liquidator) liquidates her position.

### Carol's Position

```typescript
// Initial state
const carolDeposit = 1500; // STX
const carolLoan = 1000; // STX
const initialPrice = 1.00; // USD

// Collateral value at $1.00
const initialCollateralValue = carolDeposit * initialPrice; // $1500
const loanValue = carolLoan * initialPrice; // $1000
const initialHealthFactor = initialCollateralValue / loanValue; // 1.5 (150%)

console.log(`Initial health factor: ${initialHealthFactor}`);
// Health factor: 1.5 ✅ HEALTHY

// Price drops to $0.70
const newPrice = 0.70;
const newCollateralValue = carolDeposit * newPrice; // $1050
const newLoanValue = carolLoan * newPrice; // $700
const newHealthFactor = newCollateralValue / newLoanValue; // 1.5

// Wait, health factor is still 1.5? Yes! Both numerator and denominator
// decrease proportionally. The real issue is the USD value requirement.

// Actual health factor calculation (in contract):
// health-factor = (collateral-stx * stx-price-usd) / (loan-stx * stx-price-usd) * 100
// But we need to consider the REQUIRED collateral ratio (150%)

// More accurate liquidation check:
const requiredCollateralValue = carolLoan * newPrice * 1.5; // $1050
const actualCollateralValue = carolDeposit * newPrice; // $1050
const isLiquidatable = actualCollateralValue < requiredCollateralValue * 1.1; // threshold 110%

// Threshold for liquidation = 110% of loan value
const liquidationThreshold = carolLoan * newPrice * 1.1; // $770
const liquidatableAt = liquidationThreshold / carolDeposit; // $0.51 per STX

console.log(`Carol becomes liquidatable when STX < $${liquidatableAt.toFixed(2)}`);
```

### Corrected Liquidation Example

```typescript
// Let's use a more dramatic price drop
const drasticPrice = 0.50; // STX drops to $0.50

const collateralValueUSD = carolDeposit * drasticPrice; // $750
const loanValueUSD = carolLoan * drasticPrice; // $500
const healthFactorPercent = (collateralValueUSD / loanValueUSD) * 100; // 150%

// Liquidation threshold is 110%
const isLiquidatable = healthFactorPercent < 110; // false, still 150%

// Actually, liquidation happens when:
// collateral-value < loan-value * 1.1
const liquidationThreshold = loanValueUSD * 1.1; // $550
const isActuallyLiquidatable = collateralValueUSD < liquidationThreshold; // $750 < $550? No

// For Carol to be liquidatable, we need:
// 1500 * price < 1000 * price * 1.1
// 1500 < 1100
// This is never true!

// ERROR IN SCENARIO: Carol's position is over-collateralized
// Let's fix the scenario:

const carolDeposit2 = 1200; // STX
const carolLoan2 = 1000; // STX
const priceAtLiquidation = 0.90; // USD

const collateralValue2 = carolDeposit2 * priceAtLiquidation; // $1080
const loanValue2 = carolLoan2 * priceAtLiquidation; // $900
const threshold2 = loanValue2 * 1.1; // $990

const isLiquidatable2 = collateralValue2 < threshold2; // $1080 < $990? No

// Still not liquidatable! Let's calculate the exact price:
// collateral * price < loan * price * 1.1
// 1200 * price < 1000 * price * 1.1
// 1200 < 1100
// Still false!

// Actual liquidation condition in contract:
// Let me re-read the contract...
```

### Correct Liquidation Scenario

After reviewing the contract, the liquidation condition is:

```clarity
(< (get-health-factor borrower stx-price-usd) u110)
```

Where health-factor is:
```clarity
(/ (* (* collateral-stx stx-price-usd) u100) (* loan-amount stx-price-usd))
```

So with Carol's position:
- Collateral: 1200 STX
- Loan: 1000 STX

```typescript
// Health factor at different prices
function calculateHealthFactor(collateral: number, loan: number, price: number): number {
  return (collateral * price * 100) / (loan * price);
}

// Notice price cancels out!
const healthFactor = calculateHealthFactor(1200, 1000, 1.00);
// = (1200 * 100) / 1000 = 120

console.log(`Health factor: ${healthFactor}%`);
// Carol is liquidatable because 120% < 110%? No, 120 > 110, so HEALTHY

// For liquidation, we need health factor < 110%
// (collateral * 100) / loan < 110
// collateral / loan < 1.1
// collateral < loan * 1.1

// So Carol needs:
const maxLoanForCarol = 1200 / 1.1; // = 1090.9 STX
// Carol can borrow up to 1090 STX before being liquidatable

// If Carol borrows 1100 STX:
const carolBorrowed = 1100;
const healthFactorUnsafe = (1200 * 100) / 1100; // = 109.09%
// 109.09% < 110% → LIQUIDATABLE! ✅

// Dave can liquidate Carol
async function liquidateCarol() {
  await openContractCall({
    network: new StacksMainnet(),
    contractAddress: 'SP2XYZ...',
    contractName: 'vault-core',
    functionName: 'liquidate',
    functionArgs: [
      principalCV('SP1CAROL...'), // Carol's address
      uintCV(100_000_000), // STX price: $1.00 (in 6 decimals: 1000000)
    ],
    postConditions: [],
    onFinish: (data) => {
      console.log('Liquidation successful! TX:', data.txId);
      
      // Dave receives:
      // - Carol's loan amount: 1100 STX
      // - 5% bonus: 55 STX
      // - Total: 1155 STX (from Carol's 1200 STX collateral)
      // - Remaining 45 STX stays in vault
    },
  });
}
```

### Liquidation Dashboard

```typescript
function LiquidationDashboard() {
  const [liquidatablePositions, setLiquidatablePositions] = useState([]);

  useEffect(() => {
    async function findLiquidatablePositions() {
      const stxPrice = await getSTXPrice();
      const allBorrowers = await getAllBorrowers(); // You'd need to track this

      const liquidatable = [];
      for (const borrower of allBorrowers) {
        const healthFactor = await getHealthFactor(borrower, stxPrice);
        if (healthFactor < 110) {
          const loanInfo = await getLoan(borrower);
          liquidatable.push({
            borrower,
            healthFactor,
            collateral: loanInfo.collateralAmount,
            loan: loanInfo.loanAmount,
            profit: loanInfo.loanAmount * 0.05, // 5% bonus
          });
        }
      }

      setLiquidatablePositions(liquidatable);
    }

    findLiquidatablePositions();
    const interval = setInterval(findLiquidatablePositions, 30000); // Check every 30s

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="liquidation-dashboard">
      <h2>Liquidation Opportunities</h2>
      <p>Found {liquidatablePositions.length} liquidatable positions</p>

      {liquidatablePositions.map((position) => (
        <LiquidationCard key={position.borrower} {...position} />
      ))}
    </div>
  );
}

function LiquidationCard({ borrower, healthFactor, collateral, loan, profit }) {
  const handleLiquidate = async () => {
    const stxPrice = await getSTXPrice();
    const priceInMicro = Math.floor(stxPrice * 1_000_000);

    await openContractCall({
      network: new StacksMainnet(),
      contractAddress: 'SP2XYZ...',
      contractName: 'vault-core',
      functionName: 'liquidate',
      functionArgs: [
        principalCV(borrower),
        uintCV(priceInMicro),
      ],
      postConditions: [],
      onFinish: (data) => {
        alert(`Liquidation successful! You earned ${profit} STX`);
      },
    });
  };

  return (
    <div className={`liquidation-card health-${Math.floor(healthFactor / 10)}`}>
      <div className="borrower">
        {borrower.slice(0, 10)}...{borrower.slice(-6)}
      </div>
      <div className="stats">
        <div>
          <label>Health Factor:</label>
          <span className="danger">{healthFactor.toFixed(2)}%</span>
        </div>
        <div>
          <label>Collateral:</label>
          <span>{collateral} STX</span>
        </div>
        <div>
          <label>Loan:</label>
          <span>{loan} STX</span>
        </div>
        <div>
          <label>Your Profit:</label>
          <span className="profit">+{profit.toFixed(2)} STX</span>
        </div>
      </div>
      <button onClick={handleLiquidate} className="liquidate-btn">
        Liquidate & Earn {profit.toFixed(2)} STX
      </button>
    </div>
  );
}
```

---

## Example 5: Liquidator Bot

### Automated Liquidation Bot

```typescript
import { StacksMainnet } from '@stacks/network';
import { makeContractCall, broadcastTransaction } from '@stacks/transactions';

class LiquidationBot {
  private network: StacksMainnet;
  private contractAddress: string;
  private botPrivateKey: string;
  private minProfitSTX: number;

  constructor(config: {
    contractAddress: string;
    botPrivateKey: string;
    minProfitSTX: number;
  }) {
    this.network = new StacksMainnet();
    this.contractAddress = config.contractAddress;
    this.botPrivateKey = config.botPrivateKey;
    this.minProfitSTX = config.minProfitSTX;
  }

  async start() {
    console.log('🤖 Liquidation bot started');
    console.log(`Min profit: ${this.minProfitSTX} STX`);

    // Check every 30 seconds
    setInterval(() => this.checkForLiquidations(), 30000);
    
    // Run immediately on start
    await this.checkForLiquidations();
  }

  private async checkForLiquidations() {
    try {
      const stxPrice = await this.getSTXPrice();
      console.log(`📊 STX Price: $${stxPrice}`);

      const borrowers = await this.getAllBorrowers();
      console.log(`👥 Checking ${borrowers.length} borrowers`);

      for (const borrower of borrowers) {
        await this.checkBorrower(borrower, stxPrice);
      }
    } catch (error) {
      console.error('❌ Error in liquidation check:', error);
    }
  }

  private async checkBorrower(borrower: string, stxPrice: number) {
    const healthFactor = await this.getHealthFactor(borrower, stxPrice);

    if (healthFactor < 110) {
      console.log(`🎯 Found liquidatable position: ${borrower}`);
      console.log(`   Health factor: ${healthFactor}%`);

      const loanInfo = await this.getLoan(borrower);
      const profit = loanInfo.loanAmount * 0.05;

      if (profit >= this.minProfitSTX) {
        console.log(`💰 Profit: ${profit} STX - LIQUIDATING...`);
        await this.executeLiquidation(borrower, stxPrice);
      } else {
        console.log(`⏭️  Profit too low (${profit} STX), skipping`);
      }
    }
  }

  private async executeLiquidation(borrower: string, stxPrice: number) {
    try {
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: 'vault-core',
        functionName: 'liquidate',
        functionArgs: [
          principalCV(borrower),
          uintCV(Math.floor(stxPrice * 1_000_000)),
        ],
        senderKey: this.botPrivateKey,
        network: this.network,
        postConditions: [],
      };

      const transaction = await makeContractCall(txOptions);
      const broadcastResponse = await broadcastTransaction(transaction, this.network);

      if ('error' in broadcastResponse) {
        console.error('❌ Liquidation failed:', broadcastResponse.error);
      } else {
        console.log('✅ Liquidation successful!');
        console.log(`   TX: ${broadcastResponse.txid}`);
        
        // Send notification
        await this.sendNotification({
          type: 'liquidation_success',
          borrower,
          txid: broadcastResponse.txid,
        });
      }
    } catch (error) {
      console.error('❌ Error executing liquidation:', error);
    }
  }

  private async getSTXPrice(): Promise<number> {
    // In production, fetch from multiple oracles and use median
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=blockstack&vs_currencies=usd');
    const data = await response.json();
    return data.blockstack.usd;
  }

  private async getHealthFactor(borrower: string, stxPrice: number): Promise<number> {
    const result = await callReadOnlyFunction({
      network: this.network,
      contractAddress: this.contractAddress,
      contractName: 'vault-core',
      functionName: 'get-health-factor',
      functionArgs: [
        principalCV(borrower),
        uintCV(Math.floor(stxPrice * 1_000_000)),
      ],
      senderAddress: borrower,
    });

    return Number((result as UIntCV).value);
  }

  private async getLoan(borrower: string) {
    const result = await callReadOnlyFunction({
      network: this.network,
      contractAddress: this.contractAddress,
      contractName: 'vault-core',
      functionName: 'get-loan',
      functionArgs: [principalCV(borrower)],
      senderAddress: borrower,
    });

    if (result.type === ClarityType.OptionalSome) {
      const tuple = result.value as TupleCV;
      return {
        loanAmount: Number((tuple.data['loan-amount'] as UIntCV).value) / 1_000_000,
        collateralAmount: Number((tuple.data['collateral-amount'] as UIntCV).value) / 1_000_000,
      };
    }

    throw new Error('No loan found');
  }

  private async getAllBorrowers(): Promise<string[]> {
    // In production, you'd maintain an index of borrowers
    // For this example, we'll return a mock list
    return [
      'SP1ABC...',
      'SP1DEF...',
      'SP1GHI...',
    ];
  }

  private async sendNotification(data: any) {
    // Send to Discord, Telegram, email, etc.
    console.log('📧 Notification sent:', data);
  }
}

// Usage
const bot = new LiquidationBot({
  contractAddress: 'SP2XYZ...',
  botPrivateKey: process.env.BOT_PRIVATE_KEY!,
  minProfitSTX: 10, // Only liquidate if profit >= 10 STX
});

bot.start();
```

---

## Example 6: DeFi Dashboard

### Complete User Dashboard

```typescript
import React, { useEffect, useState } from 'react';

interface UserPosition {
  deposit: number;
  availableToWithdraw: number;
  activeLoan: {
    principal: number;
    interest: number;
    collateral: number;
    healthFactor: number;
    dueDate: Date;
  } | null;
  totalEarned: number;
}

function DeFiDashboard({ userAddress }: { userAddress: string }) {
  const [position, setPosition] = useState<UserPosition | null>(null);
  const [stxPrice, setStxPrice] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserPosition() {
      const [deposit, loan, totalRepaid, price] = await Promise.all([
        getUserDeposit(userAddress),
        getLoan(userAddress),
        getTotalRepaid(userAddress),
        getSTXPrice(),
      ]);

      let activeLoan = null;
      let availableToWithdraw = deposit;

      if (loan) {
        const repaymentInfo = await calculateRepayment(userAddress);
        const healthFactor = await getHealthFactor(userAddress, price);

        activeLoan = {
          principal: loan.loanAmount,
          interest: repaymentInfo.interest,
          collateral: loan.collateralAmount,
          healthFactor,
          dueDate: new Date(loan.loanEndBlock * 10 * 60 * 1000), // Approx
        };

        availableToWithdraw = deposit - loan.collateralAmount;
      }

      setPosition({
        deposit,
        availableToWithdraw,
        activeLoan,
        totalEarned: totalRepaid - deposit, // Simplified
      });

      setStxPrice(price);
      setLoading(false);
    }

    loadUserPosition();
    const interval = setInterval(loadUserPosition, 15000);
    return () => clearInterval(interval);
  }, [userAddress]);

  if (loading) return <LoadingSpinner />;
  if (!position) return <ErrorPanel />;

  const totalValueUSD = position.deposit * stxPrice;

  return (
    <div className="defi-dashboard">
      <header className="dashboard-header">
        <h1>BitFlow Dashboard</h1>
        <div className="stx-price">
          STX: ${stxPrice.toFixed(2)}
        </div>
      </header>

      {/* Overview Cards */}
      <div className="overview-cards">
        <Card title="Total Deposited" value={`${position.deposit} STX`} subvalue={`$${totalValueUSD.toFixed(2)}`} />
        <Card title="Available to Withdraw" value={`${position.availableToWithdraw} STX`} />
        <Card title="Total Earned" value={`${position.totalEarned.toFixed(2)} STX`} trend="up" />
      </div>

      {/* Active Loan Section */}
      {position.activeLoan && (
        <div className="active-loan-section">
          <h2>Active Loan</h2>
          <LoanCard loan={position.activeLoan} />
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions">
        <ActionButton icon="💰" label="Deposit" onClick={() => navigateTo('/deposit')} />
        <ActionButton icon="💸" label="Withdraw" onClick={() => navigateTo('/withdraw')} />
        <ActionButton icon="🏦" label="Borrow" onClick={() => navigateTo('/borrow')} disabled={!!position.activeLoan} />
        {position.activeLoan && (
          <ActionButton icon="✅" label="Repay" onClick={() => navigateTo('/repay')} />
        )}
      </div>

      {/* Transaction History */}
      <TransactionHistory userAddress={userAddress} />
    </div>
  );
}

function LoanCard({ loan }) {
  const healthColor = loan.healthFactor >= 150 ? 'green' : loan.healthFactor >= 120 ? 'yellow' : 'red';
  const daysUntilDue = Math.ceil((loan.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="loan-card">
      <div className="loan-stat">
        <label>Principal:</label>
        <value>{loan.principal} STX</value>
      </div>
      <div className="loan-stat">
        <label>Interest:</label>
        <value>{loan.interest.toFixed(2)} STX</value>
      </div>
      <div className="loan-stat">
        <label>Collateral:</label>
        <value>{loan.collateral} STX</value>
      </div>
      <div className="loan-stat">
        <label>Health Factor:</label>
        <value className={healthColor}>
          {loan.healthFactor}%
          {loan.healthFactor < 120 && <span className="warning"> ⚠️ Risk of liquidation</span>}
        </value>
      </div>
      <div className="loan-stat">
        <label>Due in:</label>
        <value>{daysUntilDue} days</value>
      </div>
    </div>
  );
}
```

---

## Example 7: Risk Management

### Monitor Health Factor

```typescript
class HealthFactorMonitor {
  private userAddress: string;
  private warningThreshold: number = 120; // Warn at 120%
  private criticalThreshold: number = 115; // Alert at 115%

  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.startMonitoring();
  }

  private async startMonitoring() {
    setInterval(async () => {
      await this.checkHealthFactor();
    }, 60000); // Check every minute
  }

  private async checkHealthFactor() {
    const stxPrice = await getSTXPrice();
    const healthFactor = await getHealthFactor(this.userAddress, stxPrice);

    if (healthFactor < this.criticalThreshold) {
      this.sendCriticalAlert(healthFactor);
    } else if (healthFactor < this.warningThreshold) {
      this.sendWarning(healthFactor);
    }
  }

  private sendCriticalAlert(healthFactor: number) {
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 CRITICAL: Risk of Liquidation!', {
        body: `Your health factor is ${healthFactor}%. Add collateral immediately!`,
        icon: '/alert-icon.png',
        requireInteraction: true,
      });
    }

    // Email/SMS notification
    this.sendEmail({
      subject: '🚨 CRITICAL: BitFlow Position at Risk',
      body: `Your health factor has dropped to ${healthFactor}%. You are at risk of liquidation. Please add more collateral or repay your loan immediately.`,
    });
  }

  private sendWarning(healthFactor: number) {
    console.warn(`⚠️ Health factor: ${healthFactor}%`);
    // Show in-app banner
    showBanner({
      type: 'warning',
      message: `Your health factor is ${healthFactor}%. Consider adding collateral.`,
    });
  }

  private async sendEmail(content: { subject: string; body: string }) {
    // Integration with email service
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    });
  }
}

// Usage
const monitor = new HealthFactorMonitor(userAddress);
```

### Auto-Repayment Strategy

```typescript
async function autoRepayIfNearLiquidation() {
  const stxPrice = await getSTXPrice();
  const healthFactor = await getHealthFactor(userAddress, stxPrice);

  // If health factor drops below 115%, auto-repay
  if (healthFactor < 115) {
    console.log('🤖 Auto-repaying to avoid liquidation');

    const repaymentInfo = await calculateRepayment(userAddress);
    
    // Check if user has enough STX in wallet
    const walletBalance = await getSTXBalance(userAddress);

    if (walletBalance >= repaymentInfo.total) {
      // Repay the loan
      await repayLoan();
      
      showNotification({
        type: 'success',
        message: 'Loan automatically repaid to avoid liquidation',
      });
    } else {
      // Partial repayment or add collateral
      showNotification({
        type: 'error',
        message: 'Insufficient funds for auto-repayment. Please add collateral!',
      });
    }
  }
}
```

---

## Complete User Journeys

Three end-to-end scenarios showing the full lifecycle from deposit through withdrawal.

### Journey 1: The Conservative Saver

**Profile:** New user who wants to test the protocol with a small amount before committing larger funds.

```typescript
// Step 1: Connect wallet and check balance
const userData = useAuth();
console.log(`Balance: ${userData.balance} microSTX`);
// Balance: 50000000 microSTX (50 STX)

// Step 2: Make a small test deposit (1 STX)
const testDeposit = await openContractCall({
  contractAddress: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
  contractName: 'bitflow-vault-core',
  functionName: 'deposit',
  functionArgs: [uintCV(1_000_000)], // 1 STX
  postConditions: [
    makeStandardSTXPostCondition(userAddress, FungibleConditionCode.Equal, 1_000_000)
  ],
});
// Result: (ok true) — 1 STX deposited

// Step 3: Verify deposit on-chain
const deposit = await callReadOnlyFunction({
  functionName: 'get-user-deposit',
  functionArgs: [principalCV(userAddress)],
  // ...
});
// Returns: u1000000 (1 STX confirmed)

// Step 4: User decides protocol works, deposits more (19 STX)
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(19_000_000)],
  // ...
});
// Total deposit: 20 STX

// Step 5: No borrowing — user just wants to save
// Collateral sits safely, withdrawable at any time

// Step 6: After 3 months, user withdraws everything
await openContractCall({
  functionName: 'withdraw',
  functionArgs: [uintCV(20_000_000)],
  // ...
});
// 20 STX returned to wallet
// Net cost: only gas fees (~0.003 STX total for 3 transactions)
```

**Outcome:** User deposited, stored safely, and withdrew — zero interest paid, zero risk of liquidation.

### Journey 2: The Strategic Borrower

**Profile:** Experienced user who borrows conservatively and repays before the due date.

```typescript
// Step 1: Deposit 30 STX as collateral
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(30_000_000)],
});

// Step 2: Calculate safe borrow amount
// Max: 30 / 1.5 = 20 STX (health = 150%)
// Target: 30 / 2.0 = 15 STX (health = 200% — much safer)
const maxBorrow = await callReadOnlyFunction({
  functionName: 'get-max-borrow-amount',
  functionArgs: [principalCV(userAddress)],
});
// Returns: u20000000 (20 STX maximum)

// Step 3: Borrow 15 STX at 5% APR for 30 days
await openContractCall({
  functionName: 'borrow',
  functionArgs: [
    uintCV(15_000_000),  // 15 STX
    uintCV(500),          // 5% APR
    uintCV(30),           // 30 days
  ],
});
// Health factor: 200%

// Step 4: Monitor health factor (every few days)
const health = await callReadOnlyFunction({
  functionName: 'calculate-health-factor',
  functionArgs: [principalCV(userAddress), uintCV(100)],
});
// Day 10: 199.7%
// Day 20: 199.5%
// Still very safe

// Step 5: Repay on day 20 (10 days early)
const repayment = await callReadOnlyFunction({
  functionName: 'get-repayment-amount',
  functionArgs: [principalCV(userAddress)],
});
// Returns: { principal: 15.0, interest: 0.027, total: 15.027 }

await openContractCall({
  functionName: 'repay',
  functionArgs: [],
});
// Paid 15.027 STX — saved ~0.014 STX by repaying early

// Step 6: Withdraw collateral
await openContractCall({
  functionName: 'withdraw',
  functionArgs: [uintCV(30_000_000)],
});
// 30 STX back in wallet
// Total cost: 0.027 STX interest + ~0.008 STX gas = 0.035 STX
```

**Outcome:** Borrowed 15 STX for 20 days, paid only 0.027 STX in interest. Health factor never dropped below 199%.

### Journey 3: The Close Call

**Profile:** User who borrows near the maximum and has to take corrective action.

```typescript
// Step 1: Deposit 10 STX
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(10_000_000)],
});

// Step 2: Borrow 6 STX (60% ratio — aggressive)
await openContractCall({
  functionName: 'borrow',
  functionArgs: [
    uintCV(6_000_000),   // 6 STX
    uintCV(1000),         // 10% APR (high rate)
    uintCV(90),           // 90 days
  ],
});
// Starting health factor: 166.7%

// Step 3: Forget to monitor for 60 days...
// Day 60 health check:
const health60 = await callReadOnlyFunction({
  functionName: 'calculate-health-factor',
  functionArgs: [principalCV(userAddress), uintCV(100)],
});
// Health: 161.3% — interest has been accruing

// Step 4: User realizes they forgot, checks repayment amount
const repay = await callReadOnlyFunction({
  functionName: 'get-repayment-amount',
  functionArgs: [principalCV(userAddress)],
});
// { principal: 6.0, interest: 0.099, total: 6.099 }

// Step 5: Add collateral to be safe (deposit 5 more STX)
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(5_000_000)],
});
// Health factor jumps: 15 STX / 6.099 STX = 245.9% — safe!

// Step 6: Repay at day 85 (5 days before due)
const repay85 = await callReadOnlyFunction({
  functionName: 'get-repayment-amount',
  functionArgs: [principalCV(userAddress)],
});
// { principal: 6.0, interest: 0.140, total: 6.140 }

await openContractCall({
  functionName: 'repay',
  functionArgs: [],
});

// Step 7: Withdraw all
await openContractCall({
  functionName: 'withdraw',
  functionArgs: [uintCV(15_000_000)],
});
// Cost: 0.140 STX interest + ~0.012 STX gas
```

**Outcome:** Started risky, forgot to monitor, but recovered by adding collateral. Lesson: always monitor active loans.

---

## Edge Cases

Five unusual but valid scenarios that demonstrate protocol behavior at the boundaries.

### Edge Case 1: Minimum Possible Loan

**Scenario:** A user borrows the smallest possible amount (1 microSTX) with the lowest rate for the shortest term.

```typescript
// Deposit 2 microSTX (150% of 1 microSTX, rounded up)
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(2)], // 2 microSTX
});

// Borrow 1 microSTX at 1% APR for 1 day
await openContractCall({
  functionName: 'borrow',
  functionArgs: [
    uintCV(1),    // 1 microSTX
    uintCV(100),  // 1% APR
    uintCV(1),    // 1 day
  ],
});

// Check interest after 1 day (144 blocks):
// interest = 1 × 100 × 144 / (100 × 52560)
//          = 14400 / 5256000
//          = 0 (integer division rounds to zero)

// Repayment: principal only (1 microSTX) — zero interest
```

**Result:** Due to integer division, very small loans at low rates for short periods may accrue zero interest. The user effectively gets a free loan.

**Why it works:** Clarity uses integer arithmetic. When the numerator is smaller than the denominator, the result is 0.

### Edge Case 2: Maximum Rate, Maximum Term

**Scenario:** A user takes the most expensive possible loan — 100% APR for 365 days.

```typescript
// Deposit 100 STX
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(100_000_000)],
});

// Borrow 50 STX at 100% APR for 365 days
await openContractCall({
  functionName: 'borrow',
  functionArgs: [
    uintCV(50_000_000),   // 50 STX
    uintCV(10000),         // 100% APR (maximum)
    uintCV(365),           // 365 days (maximum)
  ],
});

// After 365 days:
// interest = 50,000,000 × 10000 × 52560 / (100 × 52560)
//          = 50,000,000 × 10000 / 100
//          = 5,000,000,000 microSTX... 

// Wait — that's 5,000 STX in interest on a 50 STX loan!
// Actually: interest = principal × rate / 10000 × (blocks/52560)
// = 50 × (10000/10000) × 1 = 50 STX interest
// Total repayment: 50 + 50 = 100 STX

// Health factor at day 365:
// 100 STX deposit / 100 STX debt = 100% — BELOW liquidation threshold!
```

**Result:** At 100% APR, the interest equals the principal over a full year. The health factor would drop below 110% before the term ends, making liquidation possible. This is an extreme scenario that users should never do.

### Edge Case 3: Deposit, Borrow, Repay in Same Block

**Scenario:** All three operations happen in the same block (0 blocks elapsed).

```typescript
// Transaction 1: Deposit 10 STX
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(10_000_000)],
});

// Transaction 2: Borrow 5 STX (same block)
await openContractCall({
  functionName: 'borrow',
  functionArgs: [uintCV(5_000_000), uintCV(500), uintCV(30)],
});

// Transaction 3: Repay immediately (same block)
await openContractCall({
  functionName: 'repay',
  functionArgs: [],
});

// Interest: principal × rate × 0 / (100 × 52560) = 0
// Repayment: 5 STX + 0 interest = 5 STX (principal only)
```

**Result:** If repaid in the same block as borrowing, zero interest is owed. This is valid but pointless (you pay gas for nothing).

### Edge Case 4: Multiple Deposits Before Borrowing

**Scenario:** A user makes 10 small deposits before taking a single loan.

```typescript
// 10 deposits of 1 STX each
for (let i = 0; i < 10; i++) {
  await openContractCall({
    functionName: 'deposit',
    functionArgs: [uintCV(1_000_000)],
  });
}

// Check total deposit
const deposit = await callReadOnlyFunction({
  functionName: 'get-user-deposit',
  functionArgs: [principalCV(userAddress)],
});
// Returns: u10000000 (10 STX)

// All 10 deposits are cumulative
// Max borrow: 10 / 1.5 = 6.67 STX
```

**Result:** Deposits are additive. Each `deposit` call adds to the existing balance in the `user-deposits` map. The protocol doesn't care how many transactions it took to reach the total.

**Gas cost:** 10 separate deposits cost ~10× the gas of a single 10 STX deposit. Always deposit in one transaction when possible.

### Edge Case 5: Withdrawal Reduces Collateral Below Borrow Threshold

**Scenario:** User deposited 20 STX, didn't borrow, then tries to withdraw more than they have.

```typescript
// Deposit 20 STX
await openContractCall({
  functionName: 'deposit',
  functionArgs: [uintCV(20_000_000)],
});

// Try to withdraw 25 STX
await openContractCall({
  functionName: 'withdraw',
  functionArgs: [uintCV(25_000_000)],
});
// Result: ERR-INSUFFICIENT-BALANCE (u101)
// Cannot withdraw more than deposited

// Withdraw exactly 20 STX — works fine
await openContractCall({
  functionName: 'withdraw',
  functionArgs: [uintCV(20_000_000)],
});
// Result: (ok true) — all funds returned

// Note: If user had an active loan, ANY withdrawal would still
// succeed IF the remaining deposit >= 0, because the contract
// only checks balance, not collateral ratio on withdrawal.
// However, this could make the position liquidatable.
```

**Result:** The contract prevents over-withdrawal (can't withdraw more than deposited) but doesn't prevent withdrawal below the collateral ratio. In the current implementation, users cannot withdraw while they have an active loan — the collateral is locked.

---

**Document Version:** 1.2.0  
**Last Updated:** February 14, 2026

For more examples and support:
- **Documentation:** See [INTEGRATION.md](./INTEGRATION.md)
- **GitHub:** [github.com/bitflow/vault-core](https://github.com/bitflow/vault-core)
