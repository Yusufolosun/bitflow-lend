import { BitflowSDK } from '@bitflowlabs/core-sdk';

const network = import.meta.env.VITE_NETWORK;
const isMainnet = network === 'mainnet';

// Determine default host URLs based on the target network
const defaultApiHost = isMainnet
  ? '/api/bitflow'
  : '/api/bitflow-testnet';

const defaultKeeperHost = isMainnet
  ? 'https://bitflow-keeper-7owjsmt8.uc.gateway.dev'
  : 'https://bitflow-keeper-test-7owjsmt8.uc.gateway.dev';

/**
 * Shared BitflowSDK singleton.
 *
 * Every module that needs to call the Bitflow API should import this instance
 * instead of creating its own `new BitflowSDK()`. This keeps the connection
 * pool small and makes it straightforward to swap in a test double globally.
 *
 * Configured dynamically to resolve correct mainnet/testnet endpoints,
 * allowing local or environment-specific overrides via Vite variables.
 */
export const bitflowClient = new BitflowSDK({
  BITFLOW_API_HOST: import.meta.env.VITE_BITFLOW_API_HOST || defaultApiHost,
  KEEPER_API_HOST: import.meta.env.VITE_KEEPER_API_HOST || defaultKeeperHost,
  ...(import.meta.env.VITE_READONLY_CALL_API_HOST
    ? { READONLY_CALL_API_HOST: import.meta.env.VITE_READONLY_CALL_API_HOST }
    : {}),
});
