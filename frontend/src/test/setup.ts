/**
 * Test Setup for Vitest + React Testing Library
 * Configures jsdom environment, extends expect with jest-dom matchers,
 * and provides global mocks for Stacks Connect and browser APIs.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks - must be hoisted to top level
// ---------------------------------------------------------------------------

vi.mock('@stacks/connect', () => ({
  showConnect: vi.fn(),
  AppConfig: class MockAppConfig {
    constructor() {}
  },
  UserSession: class MockUserSession {
    constructor() {}
    isUserSignedIn = () => false;
    isSignInPending = () => false;
    loadUserData = () => ({
      profile: {
        stxAddress: {
          testnet: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          mainnet: 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRT4DT5E',
        },
      },
    });
    signUserOut = vi.fn();
    handlePendingSignIn = vi.fn();
  },
  openContractCall: vi.fn(),
}));

vi.mock('@stacks/network', () => ({
  STACKS_TESTNET: {},
  STACKS_MAINNET: {},
}));

// Ensure DOM cleanup after each test
afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Browser API mocks
// ---------------------------------------------------------------------------

// Mock window.matchMedia for components that use media queries
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = () => {};
  unobserve = () => {};
  disconnect = () => {};
}
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// Mock crypto.getRandomValues for @stacks libraries
Object.defineProperty(globalThis, 'crypto', {
  value: {
    getRandomValues: (arr: Uint8Array) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
    subtle: {},
  },
});

// ---------------------------------------------------------------------------
// localStorage mock (jsdom provides one, but guarantee a clean slate)
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });
