export const COMMON_ACTIONS = {
  confirm: 'Confirm',
  cancel: 'Cancel',
  close: 'Close',
  retry: 'Retry',
  tryAgain: 'Try again',
  refresh: 'Refresh',
  clear: 'Clear',
  previous: 'Previous',
  next: 'Next',
  max: 'MAX',
} as const;

export const COMMON_STATUS = {
  loadingData: 'Loading data from Stacks...',
  loadingWallet: 'Loading wallet state from Stacks...',
  submitting: 'Submitting to Stacks...',
  confirming: 'Awaiting Stacks confirmation...',
} as const;

export const CONFIRM_DIALOG_COPY = {
  confirmDefault: 'Confirm',
  cancelDefault: 'Cancel',
  closeAriaLabel: 'Close dialog',
  submittingLabel: 'Submitting to Stacks - Bitcoin anchor finality ~10-15 min',
} as const;

export const LOADING_COPY = {
  contentAriaLabel: 'Loading content from Stacks',
  contentSrOnly: 'Loading data from Stacks...',
  statsAriaLabel: 'Loading protocol statistics from Stacks',
  statsSrOnly: 'Loading protocol statistics from Stacks...',
} as const;

export const ERROR_STATE_COPY = {
  defaultTitle: 'Stacks request failed',
  retryInline: 'Retry',
  tryAgain: 'Try again',
} as const;

export const ERROR_BOUNDARY_COPY = {
  title: 'Unexpected UI error on Stacks',
  fallbackMessage: 'This view failed to render. Refresh data or reconnect your Stacks wallet.',
  retry: 'Retry view',
} as const;

export const TOAST_COPY = {
  viewOnExplorer: 'View on explorer',
  dismiss: 'Dismiss',
  dismissNotification: 'Dismiss notification',
} as const;

export const WALLET_COPY = {
  connect: 'Connect Stacks wallet',
  disconnect: 'Disconnect wallet',
  balanceLabel: 'STX balance',
  connectedLabel: 'Connected',
  refreshBalanceTitle: 'Refresh STX balance',
  refreshBalanceAria: 'Refresh STX balance',
  refreshFailedInline: 'Balance refresh failed. Data may be stale.',
  refreshFailedToastTitle: 'Balance refresh failed',
  refreshFailedFallback: 'Stacks API unavailable. Balance may be stale.',
  addressCopiedToast: 'Address copied to clipboard',
  addressCopyFailedToast: 'Unable to copy address. Check browser permissions.',
  copyAddressTitle: 'Copy wallet address',
  copiedAddressTitle: 'Address copied',
  copyAddressAria: 'Copy wallet address',
} as const;

export const COLLATERAL_PREVIEW_COPY = {
  title: 'Collateral preview',
  enterAmount: 'Enter an STX amount to preview its USDA value.',
  loadingAria: 'Loading Bitflow collateral preview',
  loadingSrOnly: 'Loading Bitflow collateral preview',
  previewUnavailableTitle: 'Preview unavailable',
  previewUnavailableMessage: 'We could not load the live Bitflow route.',
  retry: 'Try again',
  bitflowLiveBadge: 'Bitflow live',
  estimatedUsdaLabel: 'Estimated USDA',
  approxWorth: 'Approximate value for the current Bitflow route.',
  priceImpact: (impact: string) => `Price impact ${impact}`,
  updatesAfterTyping: 'Preview updates after you pause typing for half a second.',
  waitingQuote: 'Waiting for a live Bitflow quote.',
  liveRouteLabel: (amount: string) => `Live route for ${amount} STX`,
  noRouteAvailableError: 'No live Bitflow route is available for this amount right now.',
  missingOutputError: 'Bitflow returned a route without an output amount.',
  fallbackError: 'Unable to load the live Bitflow preview right now.',
} as const;

export const TOKEN_RATE_COPY = {
  sectionAriaLabel: 'Bitflow live token rates',
  headerKicker: 'Live Bitflow ticker',
  headerTitle: 'Swap rates against STX',
  refreshing: 'Refreshing',
  live: 'Live',
  updatedAt: (time: string) => `Updated ${time}`,
  stxBadge: 'STX',
  rateUnavailable: 'Unavailable',
  rateUnavailableDetail: 'Live route unavailable',
  noLiveRoute: 'No live Bitflow route is available right now.',
  rateApprox: (name: string, rate: string) => `1 ${name} ~ ${rate} STX`,
  routeUnavailableLabel: 'Bitflow live route unavailable',
  noTokens: 'Bitflow did not return any STX-adjacent tokens for quoting right now.',
  errorFallback: 'Unable to load live Bitflow rate.',
} as const;

export const POSITIONS_COPY = {
  emptyTitle: 'No positions found',
  emptyMessage: 'Your borrowing history will appear here.',
  statusActive: 'Active',
  statusLiquidated: 'Liquidated',
  statusClosed: 'Closed',
  openedLabel: (timestamp: string) => `Opened ${timestamp}`,
  collateralLabel: 'Collateral',
  dueBlockLabel: 'Due block',
  viewOnExplorer: 'View on explorer',
} as const;

export const HEALTH_FACTOR_COPY = {
  loadingAria: 'Loading health factor',
  criticalTitle: 'Critical liquidation risk on Stacks',
  criticalMessage: 'Health factor is 0. Position can be liquidated on Stacks. Add collateral or repay now.',
  invalidValue: 'Invalid health factor value',
  statusLabels: {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  },
  sourceLabel: 'Source: On-chain',
  ariaLabel: (percent: string, statusLabel: string) => `Health factor: ${percent} percent, status: ${statusLabel}`,
} as const;

export const ORACLE_WARNING_COPY = {
  title: 'Oracle price sanity warning',
  borrowMessage: (deviation: string) => `The oracle price differs from Bitflow's live STX/USDA quote by ${deviation}. Review the market price before borrowing.`,
  repayMessage: (deviation: string) => `The oracle price differs from Bitflow's live STX/USDA quote by ${deviation}. Review the market price before repaying.`,
  healthMessage: (deviation: string) => `The oracle price differs from Bitflow's live STX/USDA quote by ${deviation}. Verify the price before borrowing or repaying.`,
} as const;

export const HEALTH_MONITOR_COPY = {
  headerTitle: 'Health Monitor',
  headerSubtitleHealthy: 'Your position is healthy',
  headerSubtitleActive: 'Track your position health',
  noActiveTitle: 'No active position',
  noActiveMessage: 'You do not have any active loans. Your collateral is safe.',
  totalDepositedLabel: 'Total deposited',
  availableForBorrowing: 'Available for borrowing',
  collateralRatioLabel: 'Collateralization ratio',
  liquidationAt: (threshold: number) => `Liquidation at ${threshold}%`,
  safeAt: (threshold: number) => `Safe at ${threshold}%+`,
  positionDetailsTitle: 'Position details',
  collateralLabel: 'Collateral:',
  borrowedLabel: 'Borrowed:',
  collateralValueLabel: 'Collateral value:',
  debtValueLabel: 'Debt value:',
  distanceToLiquidationLabel: 'Distance to liquidation:',
  liquidationRiskTitle: 'Liquidation risk warning',
  liquidationRiskMessage: 'Your position is approaching the liquidation threshold. Add collateral or repay part of your loan to improve your health factor.',
  criticalRiskTitle: 'Critical liquidation risk',
  criticalRiskMessage: (bonus: number) => `Your position is in critical danger of liquidation. You may lose collateral plus a ${bonus}% liquidation penalty.`,
  criticalRiskAction: 'Action required: Add collateral or repay your loan immediately.',
  protectionTitle: 'Liquidation protection',
  protectionItems: [
    'Maintain collateral ratio above the liquidation threshold.',
    'Add more collateral to improve your health factor.',
    'Repay loan to reduce debt and increase safety.',
    'Monitor price moves that can affect your position.',
  ],
  recommendedTitle: 'Recommended actions',
  recommendedAddCollateral: (amount: string) => `Add collateral: Deposit ${amount} STX to reach safe levels.`,
  recommendedRepay: 'Or repay: Pay back your loan to release collateral and eliminate risk.',
  infoHealthUpdates: 'Health factor updates with each on-chain price refresh.',
  infoOnChainPrice: (price: string) => `On-chain STX price: $${price} USD`,
  infoMarketPrice: (price: string) => `Market STX price: $${price} USD`,
  staleNotice: '(stale - using last known price)',
  updatedAt: (time: string) => `updated ${time}`,
  liquidationAuto: (threshold: number) => `Liquidation occurs automatically below ${threshold}%.`,
} as const;

export const NETWORK_COPY = {
  mainnetLabel: 'Mainnet',
  testnetLabel: 'Testnet',
  ariaLabel: (label: string) => `Network: Stacks ${label}`,
  title: (label: string) => `Connected to Stacks ${label}`,
} as const;

export const LIQUIDATION_COPY = {
  headerTitle: 'Liquidation opportunities',
  headerSubtitle: (count: number) => `${count} position${count === 1 ? '' : 's'} available for liquidation`,
  infoTitle: 'How liquidation works',
  infoMessage: (threshold: number, bonus: number) =>
    `When a position falls below ${threshold}% health factor, anyone can liquidate it by repaying the debt and receiving collateral plus a ${bonus}% bonus.`,
  loading: 'Loading positions from Stacks indexer...',
  emptyTitle: 'No liquidatable positions found',
  emptyMessage: 'Liquidatable positions will appear once the on-chain indexer is available. The contract does not support enumerating borrowers directly yet.',
  connectWalletError: 'Connect your Stacks wallet to liquidate positions.',
  successMessage: (address: string) => `Liquidation submitted for ${address}`,
  failureMessage: (address: string) => `Liquidation failed for ${address}. Check your STX balance and post-conditions.`,
  transactionFailed: 'Liquidation transaction failed. Check your STX balance and post-conditions, then try again.',
  tableAddress: 'Address',
  tableCollateral: 'Collateral',
  tableDebt: 'Debt',
  tableHealthFactor: 'Health factor',
  tableProfit: 'Potential profit',
  tableAction: 'Action',
  actionLiquidate: 'Liquidate',
  actionLiquidating: 'Submitting to Stacks...',
  bonusLabel: (bonus: number) => `+${bonus}% bonus`,
  summaryCollateral: 'Total collateral at risk',
  summaryDebt: 'Total debt',
  summaryProfit: 'Total profit potential',
} as const;

export const STACKS_TIMING_COPY = {
  bitcoinFinality: 'Bitcoin anchor finality ~10-15 min.',
  averageBlockTime: (minutes: number) => `Estimated by average Stacks block time: ~${minutes} min`,
  elapsed: (elapsed: string) => `${elapsed} elapsed`,
  remaining: (remaining: string) => `Approx. ${remaining} remaining based on average Stacks block time`,
  longerThanAverage: 'Confirmation is taking longer than average block time but still in mempool.',
  propagationStill: (remaining: string) => `Indexer propagation is still in progress. We will mark this as not found after ${remaining}.`,
  pollingSummary: (elapsed: string) => `We polled for ${elapsed} before marking this as not found.`,
  microblockAnchor: (label: string) => `Microblock anchor time: ${label}`,
} as const;

export const STACKS_TX_STATUS_COPY = {
  pendingMempool: 'Submitted to Stacks - waiting for Bitcoin anchor (~10-15 min).',
  pendingPropagation: 'Submitted to Stacks - waiting for indexer propagation.',
  confirmed: 'Confirmed on Stacks. Bitcoin anchor finality ~10-15 min.',
  rejected: 'Transaction rejected by post-conditions. Check your limits and STX balance.',
  notFound: 'Transaction not found after 60 minutes. Verify the tx id in the explorer and your wallet history.',
  viewOnExplorer: 'View transaction on explorer',
} as const;

export const TRANSACTION_COPY = {
  failureWithReason: (reason: string) => `Transaction failed: ${reason}. Check your STX balance and post-conditions.`,
  cancelled: 'Transaction cancelled in your Stacks wallet.',
  walletNotConnected: 'Stacks wallet not connected. Connect a wallet to continue.',
} as const;

export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Connect your Stacks wallet to continue.',
  INSUFFICIENT_BALANCE: 'Insufficient STX balance for this transaction.',
  INSUFFICIENT_COLLATERAL: 'Insufficient collateral. Deposit more STX or reduce the borrow amount.',
  INVALID_AMOUNT: 'Enter a valid STX amount.',
  AMOUNT_TOO_LOW: 'Amount is below the protocol minimum.',
  AMOUNT_TOO_HIGH: 'Amount exceeds the protocol maximum.',
  TRANSACTION_FAILED: 'Transaction failed. Check your STX balance and post-conditions.',
  NETWORK_ERROR: 'Stacks network error. Check your connection and try again.',
  CONTRACT_ERROR: 'Stacks contract call failed. Review post-conditions and try again.',
  LOAN_NOT_FOUND: 'No active loan found for this address.',
  ALREADY_HEALTHY: 'Position is already healthy.',
  NOT_LIQUIDATABLE: 'Position is not liquidatable at the current health factor.',
} as const;

export const SUCCESS_MESSAGES = {
  DEPOSIT_SUCCESS: 'Deposit confirmed on Stacks.',
  WITHDRAW_SUCCESS: 'Withdrawal confirmed on Stacks.',
  BORROW_SUCCESS: 'Borrow confirmed on Stacks.',
  REPAY_SUCCESS: 'Repayment confirmed on Stacks.',
  LIQUIDATION_SUCCESS: 'Liquidation confirmed on Stacks.',
  WALLET_CONNECTED: 'Stacks wallet connected.',
  WALLET_DISCONNECTED: 'Stacks wallet disconnected.',
} as const;
