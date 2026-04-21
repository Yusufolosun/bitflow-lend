import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { BitflowSDK } from '@bitflowlabs/core-sdk';
import { useBitflowTokens } from '../useBitflowTokens';

const mockGetAvailableTokens = vi.hoisted(() => vi.fn());

vi.mock('@bitflowlabs/core-sdk', () => ({
  BitflowSDK: class {
    getAvailableTokens = mockGetAvailableTokens;
  },
}));

type AvailableToken = Awaited<ReturnType<BitflowSDK['getAvailableTokens']>>[number];

const createToken = (tokenId: string, name: string): AvailableToken => ({
  tokenId,
  name,
} as AvailableToken);

describe('useBitflowTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters STX-adjacent tokens and caps the list at five entries', async () => {
    mockGetAvailableTokens.mockResolvedValue([
      createToken('token-stx', 'STX'),
      createToken('token-usda', 'USDA'),
      createToken('token-wstx', 'wSTX'),
      createToken('token-stxbtc', 'STXBTC'),
      createToken('token-stxusd', 'STXUSD'),
      createToken('token-stxusd', 'STXUSD duplicate'),
      createToken('token-stxflow', 'STXFLOW'),
      createToken('token-btc', 'BTC'),
    ]);

    const { result } = renderHook(() => useBitflowTokens());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.tokens.map((token) => token.tokenId)).toEqual([
      'token-stx',
      'token-stxbtc',
      'token-stxflow',
      'token-stxusd',
      'token-usda',
    ]);
    expect(mockGetAvailableTokens).toHaveBeenCalledTimes(1);
  });

  it('surfaces a readable error when Bitflow token discovery fails', async () => {
    mockGetAvailableTokens.mockRejectedValue(new Error('Bitflow unavailable'));

    const { result } = renderHook(() => useBitflowTokens());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.tokens).toEqual([]);
    expect(result.current.error).toBe('Bitflow unavailable');
  });
});