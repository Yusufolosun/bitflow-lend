import { BitflowSDK } from '@bitflowlabs/core-sdk';
import { bitflowClient } from './bitflowClient';

export const LIQUIDATION_COLLATERAL_TOKEN = 'token-stx';
export const LIQUIDATION_DEBT_TOKEN = 'token-usda';

export type LiquidationQuoteResult = Awaited<
  ReturnType<BitflowSDK['getQuoteForRoute']>
>;

export type LiquidationSwapExecutionData =
  Parameters<BitflowSDK['getSwapParams']>[0];

export type LiquidationSwapParams = Awaited<
  ReturnType<BitflowSDK['getSwapParams']>
>;
export const MAX_SLIPPAGE_PERCENT = 50;

const assertPositiveNumber = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
  }
};

const assertSlippageRange = (slippage: number): void => {
  assertPositiveNumber(slippage, 'slippage');
  if (slippage > MAX_SLIPPAGE_PERCENT) {
    throw new Error(
      `slippage must not exceed ${MAX_SLIPPAGE_PERCENT}%. Received ${slippage}%.`
    );
  }
};

export const mapQuoteToSwapExecutionData = (
  quote: LiquidationQuoteResult,
  collateralAmount: number
): LiquidationSwapExecutionData => {
  const { bestRoute } = quote;

  if (!bestRoute?.route) {
    throw new Error('No swap route available for liquidation collateral.');
  }

  return {
    route: bestRoute.route,
    amount: collateralAmount,
    tokenXDecimals: bestRoute.tokenXDecimals,
    tokenYDecimals: bestRoute.tokenYDecimals,
  };
};

export const executeLiquidationSwap = async (
  senderAddress: string,
  collateralAmount: number,
  slippage: number
): Promise<LiquidationSwapParams> => {
  if (!senderAddress.trim()) {
    throw new Error('senderAddress is required.');
  }

  assertPositiveNumber(collateralAmount, 'collateralAmount');
  assertSlippageRange(slippage);

  const quote = await bitflowClient.getQuoteForRoute(
    LIQUIDATION_COLLATERAL_TOKEN,
    LIQUIDATION_DEBT_TOKEN,
    collateralAmount
  );

  const swapExecutionData = mapQuoteToSwapExecutionData(quote, collateralAmount);

  return bitflowClient.getSwapParams(swapExecutionData, senderAddress, slippage);
};
