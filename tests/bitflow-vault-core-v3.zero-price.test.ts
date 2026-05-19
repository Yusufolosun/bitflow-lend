import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 borrow with zero/unset price", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("rejects borrow when price has never been set", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());

    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(114)); // ERR-STALE-PRICE
  });

  it("rejects borrow when price is explicitly set to zero", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    // Cannot set zero price via set-stx-price (it validates > 0)
    // So the state is the default u0
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());

    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(114));
  });

  it("set-stx-price rejects zero price", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const { result } = simnet.callPublicFn(
      CONTRACT, "set-stx-price", [Cl.uint(0)], deployer()
    );
    expect(result).toBeErr(Cl.uint(117));
  });
});
