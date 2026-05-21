import { BitflowSDK } from '@bitflowlabs/core-sdk';

/**
 * Shared BitflowSDK singleton.
 *
 * Every module that needs to call the Bitflow API should import this instance
 * instead of creating its own `new BitflowSDK()`. This keeps the connection
 * pool small and makes it straightforward to swap in a test double globally.
 *
 * Zero-config — no API key required for the public tier (up to 500 req/min).
 */
export const bitflowClient = new BitflowSDK();
