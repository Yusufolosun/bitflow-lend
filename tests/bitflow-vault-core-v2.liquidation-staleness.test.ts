import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const V2 = "bitflow-vault-core-v2";

describe("v2 liquidation with stale price", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;
  const wallet2 = () => accounts().get("wallet_2")!;

  it("rejects liquidation when price is stale", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(V2, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(V2, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      V2, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(1)],
      wallet1()
    );

    // Let price go stale and loan expire
    simnet.mineEmptyBlocks(200);

    const { result } = simnet.callPublicFn(
      V2, "liquidate", [Cl.principal(wallet1())], wallet2()
    );
    expect(result).toBeErr(Cl.uint(114)); // ERR-STALE-PRICE
  });

  it("allows liquidation with fresh price", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(V2, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(V2, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      V2, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(1)],
      wallet1()
    );

    // Let loan expire but refresh price
    simnet.mineEmptyBlocks(145);
    simnet.callPublicFn(V2, "set-stx-price", [Cl.uint(10000)], deployer());

    const { result } = simnet.callPublicFn(
      V2, "liquidate", [Cl.principal(wallet1())], wallet2()
    );
    expect(result).toBeOk(Cl.tuple({
      "seized-collateral": Cl.uint(10000000),
      "paid": Cl.uint(1050000),
      "bonus": Cl.uint(50000),
    }));
  });
});
