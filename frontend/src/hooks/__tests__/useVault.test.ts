import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { UserSession } from '@stacks/connect';

vi.mock('@stacks/connect', () => ({
  openContractCall: vi.fn(),
  UserSession: class MockUserSession {},
}));

vi.mock('@stacks/transactions', () => ({
  fetchCallReadOnlyFunction: vi.fn(),
  uintCV: vi.fn(),
  principalCV: vi.fn(),
  ClarityType: {
    UInt: 'uint',
    OptionalSome: 'optional-some',
  },
  cvToValue: vi.fn(),
  PostConditionMode: {
    Deny: 'deny',
    Allow: 'allow',
  },
  Pc: {
    principal: () => ({
      willSendEq: () => ({ ustx: () => ({}) }),
      willSendLte: () => ({ ustx: () => ({}) }),
    }),
  },
}));

vi.mock('../../config/contracts', () => ({
  getNetwork: () => 'testnet',
  getContractAddress: () => 'ST1TESTADDRESS',
  getActiveContractVersion: () => ({ contractName: 'bitflow-vault-core-v2' }),
  PROTOCOL_CONSTANTS: { MIN_COLLATERAL_RATIO: 150 },
  getApiEndpoint: () => 'https://api.testnet.hiro.so',
}));

vi.mock('../../utils/formatters', () => ({
  microStxToStx: vi.fn(() => 0),
  stxToMicroStx: (amount: number) => BigInt(Math.round(amount * 1_000_000)),
}));

import { openContractCall } from '@stacks/connect';
import { useVault } from '../useVault';

const mockOpenContractCall = openContractCall as ReturnType<typeof vi.fn>;

const makeHook = (address: string | null = 'ST1VALIDUSER') => {
  const session = {} as UserSession;
  return renderHook(() => useVault(session, address));
};

describe('useVault input validation guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-positive deposit amounts before opening a contract call', async () => {
    const { result } = makeHook();

    let response;
    await act(async () => {
      response = await result.current.deposit(0);
    });

    expect(response).toEqual({ success: false, error: 'Deposit amount must be greater than 0' });
    expect(result.current.error).toBe('Deposit amount must be greater than 0');
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });

  it('rejects non-positive withdrawal amounts before opening a contract call', async () => {
    const { result } = makeHook();

    let response;
    await act(async () => {
      response = await result.current.withdraw(-1);
    });

    expect(response).toEqual({ success: false, error: 'Withdrawal amount must be greater than 0' });
    expect(result.current.error).toBe('Withdrawal amount must be greater than 0');
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });

  it('rejects borrow requests with an out-of-range interest rate', async () => {
    const { result } = makeHook();

    let response;
    await act(async () => {
      response = await result.current.borrow(5, 150, 30);
    });

    expect(response).toEqual({ success: false, error: 'Interest rate must be greater than 0 and at most 100%' });
    expect(result.current.error).toBe('Interest rate must be greater than 0 and at most 100%');
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });

  it('rejects borrow requests with a non-integer term', async () => {
    const { result } = makeHook();

    let response;
    await act(async () => {
      response = await result.current.borrow(5, 5, 30.5);
    });

    expect(response).toEqual({ success: false, error: 'Loan term must be a positive integer in days' });
    expect(result.current.error).toBe('Loan term must be a positive integer in days');
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });

  it('rejects liquidation calls with an empty borrower address', async () => {
    const { result } = makeHook();

    let response;
    await act(async () => {
      response = await result.current.liquidate('');
    });

    expect(response).toEqual({ success: false, error: 'Borrower address is required' });
    expect(result.current.error).toBe('Borrower address is required');
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });

  it('rejects all write calls when wallet is disconnected', async () => {
    const { result } = makeHook(null);

    let depositResponse;
    await act(async () => {
      depositResponse = await result.current.deposit(1);
    });

    expect(depositResponse).toEqual({ success: false, error: 'Wallet not connected' });
    expect(mockOpenContractCall).not.toHaveBeenCalled();
  });
});
