import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("v1 minimum borrow enforcement", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("rejects borrow below 0.1 STX minimum", () => {
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    // Borrow 99999 microSTX (below 100000 minimum)
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(99999), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(122)); // ERR-MIN-BORROW-AMOUNT
  });

  it("accepts borrow at exactly 0.1 STX minimum", () => {
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("still rejects zero borrow", () => {
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(0), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(102));
  });
});
