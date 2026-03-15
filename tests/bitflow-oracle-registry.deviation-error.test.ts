import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("oracle deviation rejection returns error", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("returns ERR-DEVIATION-TOO-HIGH when price exceeds deviation band", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());

    // Set initial price via admin
    simnet.callPublicFn(CONTRACT, "admin-set-price", [Cl.uint(1000000)], deployer());

    // Set tight deviation: 5% (500 bps)
    simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(500)], deployer());

    // Submit a price 30% higher — should be rejected with error
    const result = simnet.callPublicFn(
      CONTRACT,
      "submit-price",
      [Cl.uint(1300000)],
      wallet1()
    );
    expect(result.result).toEqual(Cl.error(Cl.uint(305)));
  });

  it("accepts price within deviation band", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());

    // Set initial price
    simnet.callPublicFn(CONTRACT, "admin-set-price", [Cl.uint(1000000)], deployer());

    // Set deviation: 20% (2000 bps)
    simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(2000)], deployer());

    // Submit a price 10% higher — should succeed
    const result = simnet.callPublicFn(
      CONTRACT,
      "submit-price",
      [Cl.uint(1100000)],
      wallet1()
    );
    expect(result.result).toEqual(Cl.ok(Cl.bool(true)));
  });

  it("rejects price below deviation band with error", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());

    simnet.callPublicFn(CONTRACT, "admin-set-price", [Cl.uint(1000000)], deployer());
    simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(500)], deployer());

    // Submit a price 30% lower — should return deviation error
    const result = simnet.callPublicFn(
      CONTRACT,
      "submit-price",
      [Cl.uint(700000)],
      wallet1()
    );
    expect(result.result).toEqual(Cl.error(Cl.uint(305)));
  });
});
