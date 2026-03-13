/**
 * Test Setup for Vitest + React Testing Library
 * Configures jsdom environment, extends expect with jest-dom matchers,
 * and provides global mocks for Stacks Connect and browser APIs.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
// Stacks Connect mock
// ---------------------------------------------------------------------------

// Provide a default stub for @stacks/connect so tests that import components
// using showConnect / AppConfig / UserSession don't need to set up their own
// vi.mock() for every test file.  Individual tests can override via vi.mock()
// at the file level when they need custom behavior.
if (typeof vi !== 'undefined') {
  vi.mock('@stacks/connect', async () => {
    return {
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
    };
  });

  vi.mock('@stacks/network', async () => {
    return {
      StacksTestnet: class MockStacksTestnet {
        constructor() {}
      },
      StacksMainnet: class MockStacksMainnet {
        constructor() {}
      },
    };
  });
}

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
