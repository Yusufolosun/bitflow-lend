import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockConstructor = vi.fn();

vi.mock('@bitflowlabs/core-sdk', () => {
  return {
    BitflowSDK: class MockBitflowSDK {
      constructor(config?: any) {
        mockConstructor(config);
      }
    },
  };
});

describe('bitflowClient singleton initialization', () => {
  beforeEach(() => {
    vi.resetModules();
    mockConstructor.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses mainnet endpoints when VITE_NETWORK is mainnet', async () => {
    vi.stubEnv('VITE_NETWORK', 'mainnet');

    await import('../bitflowClient');

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith({
      BITFLOW_API_HOST: '/api/bitflow',
      KEEPER_API_HOST: '/api/bitflow-keeper',
      READONLY_CALL_API_HOST: 'https://node.bitflowapis.finance',
      BITFLOW_PROVIDER_ADDRESS: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    });
  });

  it('uses testnet endpoints when VITE_NETWORK is testnet', async () => {
    vi.stubEnv('VITE_NETWORK', 'testnet');

    await import('../bitflowClient');

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith({
      BITFLOW_API_HOST: '/api/bitflow-testnet',
      KEEPER_API_HOST: '/api/bitflow-keeper-testnet',
      READONLY_CALL_API_HOST: 'https://api.testnet.hiro.so',
      BITFLOW_PROVIDER_ADDRESS: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    });
  });

  it('respects explicit environment overrides', async () => {
    vi.stubEnv('VITE_NETWORK', 'mainnet');
    vi.stubEnv('VITE_BITFLOW_API_HOST', 'https://custom-api.com');
    vi.stubEnv('VITE_KEEPER_API_HOST', 'https://custom-keeper.com');
    vi.stubEnv('VITE_READONLY_CALL_API_HOST', 'https://custom-readonly.com');

    await import('../bitflowClient');

    expect(mockConstructor).toHaveBeenCalledTimes(1);
    expect(mockConstructor).toHaveBeenCalledWith({
      BITFLOW_API_HOST: 'https://custom-api.com',
      KEEPER_API_HOST: 'https://custom-keeper.com',
      READONLY_CALL_API_HOST: 'https://custom-readonly.com',
      BITFLOW_PROVIDER_ADDRESS: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    });
  });
});
