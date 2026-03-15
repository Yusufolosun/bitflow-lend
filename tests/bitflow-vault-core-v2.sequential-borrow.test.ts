import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 sequential borrow attempts by same user", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  const setup = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
  };

  it("rejects second borrow while first loan is active", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(500000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(103));
  });

  it("allows borrow after repay-borrow cycle", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());

    // First loan
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    simnet.callPublicFn(CONTRACT, "repay", [], wallet1());

    // Refresh price
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());

    // Second loan should succeed
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(2000000), Cl.uint(800), Cl.uint(60)],
      wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
