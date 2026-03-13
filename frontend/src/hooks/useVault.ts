import { useState, useCallback } from 'react';
import { openContractCall } from '@stacks/connect';
import {
  callReadOnlyFunction,
  uintCV,
  principalCV,
  ClarityType,
  cvToValue,
  PostConditionMode,
  FungibleConditionCode,
  makeStandardSTXPostCondition,
} from '@stacks/transactions';
import {
  UserDeposit,
  UserLoan,
  RepaymentAmount,
  ContractCallResponse,
} from '../types/vault';
import { microStxToStx, stxToMicroStx } from '../utils/formatters';
import { 
  getNetwork, 
  getContractAddress, 
  VAULT_CONTRACT,
  PROTOCOL_CONSTANTS,
  getApiEndpoint,
} from '../config/contracts';
import { UserSession } from '@stacks/connect';

/**
 * Possible results from polling a transaction's on-chain status
 */
export type PollResult = 'confirmed' | 'failed' | 'timeout';

/**
 * Poll transaction status until confirmed, explicitly failed, or timed out.
 * Returns a three-state result so callers can show the right message.
 */
const pollTransactionStatus = async (txId: string, maxAttempts = 60): Promise<PollResult> => {
  const apiUrl = getApiEndpoint();

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${apiUrl}/extended/v1/tx/${txId}`);

      if (!response.ok) {
        console.warn(`API returned status ${response.status}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }

      const data = await response.json();

      if (data.tx_status === 'success') {
        return 'confirmed';
      }

      if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
        console.error('Transaction failed:', data.tx_result);
        return 'failed';
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (err) {
      console.error('Error checking transaction status:', err);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.warn(`Transaction polling timed out after ${maxAttempts * 3} seconds`);
  return 'timeout';
};

/**
 * Custom hook for vault operations
 * Handles all interactions with the vault-core contract
 */
export const useVault = (_userSession: UserSession, userAddress: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = getNetwork();
  const contractAddress = getContractAddress();
  const contractName = VAULT_CONTRACT.name;

  /**
   * Deposit STX into the vault
   */
  const deposit = useCallback(async (amountSTX: number): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);

      // Create post-condition: user must transfer exact amount of STX
      const postConditions = [
        makeStandardSTXPostCondition(
          userAddress,
          FungibleConditionCode.Equal,
          amountMicroSTX
        ),
      ];

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'deposit',
          functionArgs: [uintCV(amountMicroSTX)],
          postConditions,
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data: any) => {
            // Transaction submitted
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            // Transaction cancelled
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to deposit';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Withdraw STX from the vault
   */
  const withdraw = useCallback(async (amountSTX: number): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'withdraw',
          functionArgs: [uintCV(amountMicroSTX)],
          postConditions: [],
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data: any) => {
            // Transaction submitted
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            // Transaction cancelled
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to withdraw';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Borrow STX against collateral
   */
  const borrow = useCallback(async (
    amountSTX: number,
    interestRatePercent: number,
    termDays: number
  ): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);
      const interestRateBPS = interestRatePercent * 100; // Convert to basis points

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'borrow',
          functionArgs: [
            uintCV(amountMicroSTX),
            uintCV(interestRateBPS),
            uintCV(termDays),
          ],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            // Transaction submitted
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            // Transaction cancelled
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to borrow';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Repay active loan
   */
  const repay = useCallback(async (): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'repay',
          functionArgs: [],
          postConditions: [],
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data: any) => {
            // Transaction submitted
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            // Transaction cancelled
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to repay';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Get user's deposit balance
   */
  const getUserDeposit = useCallback(async (): Promise<UserDeposit | null> => {
    if (!userAddress) return null;

    try {
      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-user-deposit',
        functionArgs: [principalCV(userAddress)],
        senderAddress: userAddress,
      });

      if (result.type === ClarityType.UInt) {
        const amount = result.value;
        const amountSTX = microStxToStx(amount);

        // Calculate available to withdraw (assuming no active loan for now)
        // In a real implementation, you'd check if there's an active loan
        const availableToWithdraw = amount;
        const availableToWithdrawSTX = amountSTX;

        return {
          amount,
          amountSTX,
          availableToWithdraw,
          availableToWithdrawSTX,
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching user deposit:', err);
      return null;
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Get user's active loan
   */
  const getUserLoan = useCallback(async (): Promise<UserLoan | null> => {
    if (!userAddress) return null;

    try {
      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-user-loan',
        functionArgs: [principalCV(userAddress)],
        senderAddress: userAddress,
      });

      // Handle optional some (loan exists)
      if (result.type === ClarityType.OptionalSome && result.value) {
        const loanData = cvToValue(result.value);

        const amount = BigInt(loanData.amount);
        const interestRate = Number(loanData['interest-rate']);
        const startBlock = Number(loanData['start-block']);
        const termEnd = Number(loanData['term-end']);

        const amountSTX = microStxToStx(amount);
        const interestRatePercent = interestRate / 100;
        const durationDays = Math.floor((termEnd - startBlock) / 144); // Approx blocks per day

        // Calculate required collateral
        const collateralAmount = (amount * BigInt(PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO)) / BigInt(100);
        const collateralAmountSTX = microStxToStx(collateralAmount);

        // Estimate start timestamp (blocks are ~10 minutes apart)
        // This is an approximation - in production you'd use block height API
        const blocksElapsed = 0; // For now, assume loan just started
        const startTimestamp = Date.now() / 1000 - (blocksElapsed * 600);

        const loanResult = {
          amount,
          amountSTX,
          interestRate,
          interestRatePercent,
          startBlock,
          termEnd,
          durationDays,
          startTimestamp,
          collateralAmount,
          collateralAmountSTX,
        };

        return loanResult;
      }

      return null;
    } catch (err) {
      console.error('Error fetching user loan:', err);
      return null;
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Get repayment amount for active loan
   */
  const getRepaymentAmount = useCallback(async (): Promise<RepaymentAmount | null> => {
    if (!userAddress) return null;

    try {
      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'get-repayment-amount',
        functionArgs: [principalCV(userAddress)],
        senderAddress: userAddress,
      });

      if (result.type === ClarityType.OptionalSome) {
        const repaymentData = cvToValue(result.value);

        const principal = BigInt(repaymentData.principal);
        const interest = BigInt(repaymentData.interest);
        const penalty = BigInt(repaymentData.penalty ?? 0);
        const total = BigInt(repaymentData.total);

        return {
          principal,
          principalSTX: microStxToStx(principal),
          interest,
          interestSTX: microStxToStx(interest),
          penalty,
          penaltySTX: microStxToStx(penalty),
          total,
          totalSTX: microStxToStx(total),
        };
      }

      return null;
    } catch (err) {
      console.error('Error fetching repayment amount:', err);
      return null;
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Calculate health factor
   */
  const getHealthFactor = useCallback(async (stxPriceUSD: number): Promise<{ healthFactorPercent: number; collateralValueUSD: number; debtValueUSD: number } | null> => {
    if (!userAddress) return null;

    try {
      // Price with 6 decimals (e.g., $1.00 = 1000000)
      const priceWithDecimals = Math.floor(stxPriceUSD * 1_000_000);

      const result = await callReadOnlyFunction({
        network,
        contractAddress,
        contractName,
        functionName: 'calculate-health-factor',
        functionArgs: [
          principalCV(userAddress),
          uintCV(priceWithDecimals),
        ],
        senderAddress: userAddress,
      });

      if (result.type === ClarityType.OptionalSome && result.value.type === ClarityType.UInt) {
        const healthFactorPercent = Number(result.value.value);

        // Get loan data for USD values - call the function directly
        const loanResult = await callReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-user-loan',
          functionArgs: [principalCV(userAddress)],
          senderAddress: userAddress,
        });

        let collateralValueUSD = 0;
        let debtValueUSD = 0;

        if (loanResult.type === ClarityType.OptionalSome) {
          const loanData = cvToValue(loanResult.value);
          const amountSTX = microStxToStx(BigInt(loanData.amount));
          const collateralAmountSTX = microStxToStx((BigInt(loanData.amount) * BigInt(PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO)) / BigInt(100));

          collateralValueUSD = collateralAmountSTX * stxPriceUSD;
          debtValueUSD = amountSTX * stxPriceUSD;
        }

        return {
          healthFactorPercent,
          collateralValueUSD,
          debtValueUSD,
        };
      }

      return null;
    } catch (err) {
      console.error('Error calculating health factor:', err);
      return null;
    }
  }, [userAddress, network, contractAddress, contractName]);

  /**
   * Liquidate an undercollateralized borrower position
   */
  const liquidate = useCallback(async (borrowerAddress: string): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }

    setIsLoading(true);
    setError(null);

    try {
      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'liquidate',
          functionArgs: [principalCV(borrowerAddress)],
          postConditionMode: PostConditionMode.Allow,
          onFinish: (data: any) => {
            // Transaction submitted
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            // Transaction cancelled
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to liquidate';
      setError(errorMsg);
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  }, [userAddress, network, contractAddress, contractName]);

  return {
    // State
    isLoading,
    error,

    // Write operations
    deposit,
    withdraw,
    borrow,
    repay,
    liquidate,

    // Read operations
    getUserDeposit,
    getUserLoan,
    getRepaymentAmount,
    getHealthFactor,

    // Utilities
    pollTransactionStatus: (txId: string) => pollTransactionStatus(txId),
  };
};

export default useVault;
