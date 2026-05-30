import { BitflowSDK } from '@bitflowlabs/core-sdk';

const network = import.meta.env.VITE_NETWORK;
const isMainnet = network === 'mainnet';

// Determine default host URLs based on the target network
const defaultApiHost = isMainnet
  ? '/api/bitflow'
  : '/api/bitflow-testnet';

const defaultKeeperHost = isMainnet
  ? '/api/bitflow-keeper'
  : '/api/bitflow-keeper-testnet';

// Prevent testnet environments from querying the mainnet node by defaulting
// to the public testnet node for testnet transactions.
const defaultReadonlyHost = isMainnet
  ? 'https://node.bitflowapis.finance'
  : 'https://api.testnet.hiro.so';

// Extract the deployer address from the contract address configuration to serve
// as the default provider address. This avoids serialization warnings when 
// provider parameters are null or undefined.
const [deployerAddress] = (import.meta.env.VITE_CONTRACT_ADDRESS || '').split('.');

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
  READONLY_CALL_API_HOST: import.meta.env.VITE_READONLY_CALL_API_HOST || defaultReadonlyHost,
  ...(deployerAddress ? { BITFLOW_PROVIDER_ADDRESS: deployerAddress } : {}),
});

