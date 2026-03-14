import type { Simnet } from "@stacks/clarinet-sdk";
import type { ClarityValue } from "@stacks/transactions";

declare global {
  const simnet: Simnet;
}

interface CustomMatchers<R = unknown> {
  toHaveTupleProperty(key: string, expected: ClarityValue): R;
}

declare module "vitest" {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

export {};
