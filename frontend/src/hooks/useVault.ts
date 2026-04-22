import { useState, useCallback } from 'react';
import { openContractCall, type FinishedTxData } from '@stacks/connect';
import {
  fetchCallReadOnlyFunction,
  uintCV,
  principalCV,
  ClarityType,
  cvToValue,
  PostConditionMode,
  Pc,
} from '@stacks/transactions';
import type { PostCondition } from '@stacks/transactions';
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
  getActiveContractVersion,
  PROTOCOL_CONSTANTS,
} from '../config/contracts';
import { UserSession } from '@stacks/connect';

// Alias to keep the existing call sites readable while using the current API.
const callReadOnlyFunction = fetchCallReadOnlyFunction;

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};


/**
 * Custom hook for vault operations
 * Handles all interactions with the vault contract
 */
export const useVault = (_userSession: UserSession, userAddress: string | null) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const network = getNetwork();
  const contractAddress = getContractAddress();
  const contractName = getActiveContractVersion().contractName;

  const isValidPositiveNumber = (value: number): boolean => Number.isFinite(value) && value > 0;

  /**
   * Deposit STX into the vault
   */
  const deposit = useCallback(async (amountSTX: number): Promise<ContractCallResponse> => {
    if (!userAddress) {
      return { success: false, error: 'Wallet not connected' };
    }
    if (!isValidPositiveNumber(amountSTX)) {
      const message = 'Deposit amount must be greater than 0';
      setError(message);
      return { success: false, error: message };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);

      // Create post-condition: user must transfer exact amount of STX
      const postConditions = [
        Pc.principal(userAddress).willSendEq(amountMicroSTX).ustx(),
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
          onFinish: (data: FinishedTxData) => {
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to deposit');
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
    if (!isValidPositiveNumber(amountSTX)) {
      const message = 'Withdrawal amount must be greater than 0';
      setError(message);
      return { success: false, error: message };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);

      // Post-condition: contract must send exactly the withdrawal amount to user
      const postConditions = [
        Pc.principal(`${contractAddress}.${contractName}`).willSendEq(amountMicroSTX).ustx(),
      ];

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'withdraw',
          functionArgs: [uintCV(amountMicroSTX)],
          postConditions,
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data: FinishedTxData) => {
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to withdraw');
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
    if (!isValidPositiveNumber(amountSTX)) {
      const message = 'Borrow amount must be greater than 0';
      setError(message);
      return { success: false, error: message };
    }
    if (!isValidPositiveNumber(interestRatePercent) || interestRatePercent > 100) {
      const message = 'Interest rate must be greater than 0 and at most 100%';
      setError(message);
      return { success: false, error: message };
    }
    if (!Number.isInteger(termDays) || termDays <= 0) {
      const message = 'Loan term must be a positive integer in days';
      setError(message);
      return { success: false, error: message };
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountMicroSTX = stxToMicroStx(amountSTX);
      const interestRateBPS = Math.round(interestRatePercent * 100); // Convert to basis points

      // Post-condition: contract sends exactly the borrowed amount to user
      const postConditions = [
        Pc.principal(`${contractAddress}.${contractName}`).willSendEq(amountMicroSTX).ustx(),
      ];

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
          postConditions,
          postConditionMode: PostConditionMode.Deny,
          onFinish: (data: FinishedTxData) => {
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to borrow');
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
      let repaymentInfo: RepaymentAmount | null = null;
      try {
        const repaymentResult = await callReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-repayment-amount',
          functionArgs: [principalCV(userAddress)],
          senderAddress: userAddress,
        });

        if (repaymentResult.type === ClarityType.OptionalSome) {
          const repaymentData = cvToValue(repaymentResult.value);
          const principal = BigInt(repaymentData.principal);
          const interest = BigInt(repaymentData.interest);
          const penalty = BigInt(repaymentData.penalty ?? 0);
          const total = BigInt(repaymentData.total);

          repaymentInfo = {
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
      } catch {
        // Fallback to no post-condition if read-only fetch is unavailable.
      }

      // Query the on-chain repayment amount for a ceiling post-condition.
      // The actual total at mining time may be slightly higher due to
      // additional blocks elapsed, so we add a 1% buffer as the upper bound.
      const postConditions = repaymentInfo
        ? [
            Pc.principal(userAddress)
              .willSendLte(repaymentInfo.total + repaymentInfo.total / BigInt(100))
              .ustx(),
          ]
        : [];
      const conditionMode = repaymentInfo
        ? PostConditionMode.Deny
        : PostConditionMode.Allow;

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'repay',
          functionArgs: [],
          postConditions,
          postConditionMode: conditionMode,
          onFinish: (data: FinishedTxData) => {
            setIsLoading(false);
            resolve({ success: true, txId: data.txId });
          },
          onCancel: () => {
            setIsLoading(false);
            resolve({ success: false, error: 'Transaction cancelled by user' });
          },
        });
      });
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to repay');
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
        const amount = BigInt(result.value);
        const amountSTX = microStxToStx(amount);

        // Check for active loan to calculate locked collateral
        let lockedCollateral = BigInt(0);
        try {
          const loanResult = await callReadOnlyFunction({
            network,
            contractAddress,
            contractName,
            functionName: 'get-user-loan',
            functionArgs: [principalCV(userAddress)],
            senderAddress: userAddress,
          });
          if (loanResult.type === ClarityType.OptionalSome && loanResult.value) {
            const loanData = cvToValue(loanResult.value);
            const loanAmount = BigInt(loanData.amount);
            lockedCollateral = (loanAmount * BigInt(PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO)) / BigInt(100);
          }
        } catch {
          // If loan check fails, assume no loan (safe default: shows full balance)
        }

        const availableToWithdraw = amount > lockedCollateral ? amount - lockedCollateral : BigInt(0);
        const availableToWithdrawSTX = microStxToStx(availableToWithdraw);

        return {
          amount,
          amountSTX,
          availableToWithdraw,
          availableToWithdrawSTX,
        };
      }

      return null;
       * Removed legacy transaction polling logic
       */

        // Calculate required collateral
        const collateralAmount = (amount * BigInt(PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO)) / BigInt(100);
        const collateralAmountSTX = microStxToStx(collateralAmount);

        // Estimate start timestamp using chain tip height
        let blocksElapsed = 0;
        try {
          const apiUrl = getApiEndpoint();
          const tipRes = await fetch(`${apiUrl}/v2/info`);
          if (tipRes.ok) {
            const tipData = await tipRes.json();
            const currentBlock = Number(tipData.stacks_tip_height || 0);
            if (currentBlock > startBlock) {
              blocksElapsed = currentBlock - startBlock;
            }
          }
        } catch {
          // Fall back to 0 if chain info unavailable
        }
        const startTimestamp = Date.now() / 1000 - (blocksElapsed * 600);

        return {
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
      }

      // Handle optional none (no loan)
      return null;
    } catch {
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
    } catch {
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

          // Fetch actual deposit to use as collateral value, not the required collateral
          const depositResult = await callReadOnlyFunction({
            network,
            contractAddress,
            contractName,
            functionName: 'get-user-deposit',
            functionArgs: [principalCV(userAddress)],
            senderAddress: userAddress,
          });
          const depositSTX = depositResult.type === ClarityType.UInt
            ? microStxToStx(BigInt(depositResult.value))
            : 0;

          collateralValueUSD = depositSTX * stxPriceUSD;
          debtValueUSD = amountSTX * stxPriceUSD;
        }

        return {
          healthFactorPercent,
          collateralValueUSD,
          debtValueUSD,
        };
      }

      return null;
    } catch {
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
    if (!borrowerAddress || borrowerAddress.trim().length === 0) {
      const message = 'Borrower address is required';
      setError(message);
      return { success: false, error: message };
    }

    setIsLoading(true);
    setError(null);

    try {
      // Pre-fetch borrower's loan to compute a ceiling post-condition.
      // Liquidator pays: loan_amount + 5% bonus. We add a 1% buffer
      // in case the on-chain values shift slightly between query and mining.
      let postConditions: PostCondition[] = [];
      let conditionMode = PostConditionMode.Allow;

      try {
        const loanResult = await callReadOnlyFunction({
          network,
          contractAddress,
          contractName,
          functionName: 'get-user-loan',
          functionArgs: [principalCV(borrowerAddress)],
          senderAddress: userAddress,
        });

        if (loanResult.type === ClarityType.OptionalSome && loanResult.value) {
          const loanData = cvToValue(loanResult.value);
          const loanAmount = BigInt(loanData.amount);
          const bonus = loanAmount * BigInt(5) / BigInt(100);
          const ceiling = (loanAmount + bonus) + (loanAmount + bonus) / BigInt(100);

          postConditions = [
            Pc.principal(userAddress).willSendLte(ceiling).ustx(),
          ];
          conditionMode = PostConditionMode.Deny;
        }
      } catch {
        // Fallback to Allow if we can't fetch loan data
      }

      return new Promise((resolve) => {
        openContractCall({
          network,
          contractAddress,
          contractName,
          functionName: 'liquidate',
          functionArgs: [principalCV(borrowerAddress)],
          postConditions,
          postConditionMode: conditionMode,
          onFinish: (data: FinishedTxData) => {
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
    } catch (err: unknown) {
      const errorMsg = getErrorMessage(err, 'Failed to liquidate');
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
  };
};

export default useVault;
