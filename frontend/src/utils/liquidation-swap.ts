import { BitflowSDK } from '@bitflowlabs/core-sdk';

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

const bitflow = new BitflowSDK();

const assertPositiveNumber = (value: number, label: string): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive number.`);
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
  assertPositiveNumber(slippage, 'slippage');

  const quote = await bitflow.getQuoteForRoute(
    LIQUIDATION_COLLATERAL_TOKEN,
    LIQUIDATION_DEBT_TOKEN,
    collateralAmount
  );

  const swapExecutionData = mapQuoteToSwapExecutionData(quote, collateralAmount);

  return bitflow.getSwapParams(swapExecutionData, senderAddress, slippage);
};