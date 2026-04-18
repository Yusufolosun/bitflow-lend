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