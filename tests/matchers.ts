import { expect } from "vitest";
import { ClarityType, ClarityValue, TupleCV } from "@stacks/transactions";

/**
 * Custom matcher: toHaveTupleProperty
 *
 * Asserts that a Clarity value is a tuple (or ok/some wrapping a tuple)
 * and contains the specified key with the expected value.
 *
 * Usage:
 *   expect(result).toHaveTupleProperty("total-deposits", Cl.uint(0))
 */
expect.extend({
  toHaveTupleProperty(
    received: ClarityValue,
    key: string,
    expected: ClarityValue
  ) {
    // Unwrap (ok ...) or (some ...) wrappers to reach the inner tuple
    let inner = received;
    if (
      inner.type === ClarityType.ResponseOk ||
      inner.type === ClarityType.OptionalSome
    ) {
      inner = (inner as any).value;
    }

    if (inner.type !== ClarityType.Tuple) {
      return {
        pass: false,
        message: () =>
          `expected a Clarity tuple but received type ${inner.type}`,
      };
    }

    const tuple = inner as TupleCV;
    const actualValue = tuple.data[key];

    if (actualValue === undefined) {
      return {
        pass: false,
        message: () =>
          `expected tuple to have key "${key}" but it only has keys: ${Object.keys(
            tuple.data
          ).join(", ")}`,
      };
    }

    // Deep-compare the serialized forms for reliable equality
    const actualStr = JSON.stringify(actualValue);
    const expectedStr = JSON.stringify(expected);
    const pass = actualStr === expectedStr;

    return {
      pass,
      message: () =>
        pass
          ? `expected tuple key "${key}" not to equal ${expectedStr}`
          : `expected tuple["${key}"] to be ${expectedStr} but got ${actualStr}`,
    };
  },
});
