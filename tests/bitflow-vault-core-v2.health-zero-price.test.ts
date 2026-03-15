import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 health-factor zero-price handling", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("returns none when stx-price is zero", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(0)],
      deployer()
    );
    expect(result).toBeNone();
  });

  it("returns valid health factor with positive price", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(10000)],
      deployer()
    );
    const data = result as any;
    expect(data.value).toBeUint(100000);
  });
});
