/**
 * Utility Functions for Formatting
 * Provides formatting utilities for STX amounts, timestamps, addresses, and more
 */

/**
 * Format STX amount with proper decimals
 * @param amount - Amount in STX (number or bigint)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatSTX(amount: number | bigint, decimals: number = 2): string {
  const numAmount = typeof amount === 'bigint' ? Number(amount) : amount;
  if (numAmount === 0) return '0.00';
  if (numAmount < 0.01) return '<0.01';
  return numAmount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format microSTX to STX
 * @param microStx - Amount in microSTX
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted STX string
 */
export function formatMicroSTX(microStx: bigint | number, decimals: number = 2): string {
  const stx = typeof microStx === 'bigint' 
    ? Number(microStx) / 1_000_000 
    : microStx / 1_000_000;
  return formatSTX(stx, decimals);
}

/**
 * Convert microSTX to STX
 * @param microStx - Amount in microSTX (bigint)
 * @returns Amount in STX (number)
 */
export function microStxToStx(microStx: bigint): number {
  return Number(microStx) / 1_000_000;
}

/**
 * Convert STX to microSTX
 * @param stx - Amount in STX (number)
 * @returns Amount in microSTX (bigint)
 */
export function stxToMicroStx(stx: number): bigint {
  return BigInt(Math.round(stx * 1_000_000));
}

/**
 * Format USD amount
 * @param amount - Amount in USD
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted USD string with $ symbol
 */
export function formatUSD(amount: number, decimals: number = 2): string {
  return '$' + amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage
 * @param value - Percentage value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + '%';
}

/**
 * Format wallet address (shortened)
 * @param address - Full wallet address
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Shortened address with ellipsis
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format timestamp to human-readable date
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Formatted date string
 */
export function formatDate(timestamp: number): string {
  // Convert to milliseconds if in seconds
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format timestamp to human-readable date and time
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Formatted date and time string
 */
export function formatDateTime(timestamp: number): string {
  // Convert to milliseconds if in seconds
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format timestamp to relative time (e.g., "2 hours ago")
 * @param timestamp - Unix timestamp in seconds or milliseconds
 * @returns Relative time string
 */
export function formatTimestamp(timestamp: number): string {
  // Convert to milliseconds if in seconds
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const now = Date.now();
  const diff = now - ms;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (weeks < 4) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

/**
 * Format duration in seconds to human-readable format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 && parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

/**
 * Format APY (Annual Percentage Yield) with proper styling
 * @param apy - APY value
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted APY string
 */
export function formatAPY(apy: number, decimals: number = 2): string {
  return apy.toFixed(decimals) + '% APY';
}

/**
 * Format large numbers with K, M, B suffixes
 * @param num - Number to format
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted number string
 */
export function formatCompactNumber(num: number, decimals: number = 1): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
}

/**
 * Format transaction hash (shortened)
 * @param txHash - Transaction hash
 * @returns Shortened hash
 */
export function formatTxHash(txHash: string): string {
  if (!txHash) return '';
  if (txHash.length <= 12) return txHash;
  return `${txHash.slice(0, 6)}...${txHash.slice(-6)}`;
}

/**
 * Format block height with thousands separators
 * @param blockHeight - Block height
 * @returns Formatted block height
 */
export function formatBlockHeight(blockHeight: number): string {
  return blockHeight.toLocaleString('en-US');
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format interest rate from basis points to percentage
 * @param basisPoints - Interest rate in basis points (e.g., 1000 = 10%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export function formatInterestRate(basisPoints: number, decimals: number = 2): string {
  const percentage = basisPoints / 100;
  return formatPercentage(percentage, decimals);
}

/**
 * Convert and format health factor to percentage
 * @param healthFactor - Health factor value
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted health factor percentage
 */
export function formatHealthFactor(healthFactor: number, decimals: number = 1): string {
  return formatPercentage(healthFactor, decimals);
}

/**
 * Format collateral ratio
 * @param collateralRatio - Collateral ratio as decimal (e.g., 1.5 = 150%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted collateral ratio
 */
export function formatCollateralRatio(collateralRatio: number, decimals: number = 1): string {
  return formatPercentage(collateralRatio * 100, decimals);
}
