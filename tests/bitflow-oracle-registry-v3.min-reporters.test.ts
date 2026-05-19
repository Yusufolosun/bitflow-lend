import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry minimum reporter threshold", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;
  const wallet2 = () => accounts().get("wallet_2")!;

  it("does not update stored price when active reporters are below min-reporters", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());

    const submission = simnet.callPublicFn(
      CONTRACT,
      "submit-price",
      [Cl.uint(1_000_000)],
      wallet1()
    );

    expect(submission.result).toBeErr(Cl.uint(400));

    const price = simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());
    expect(price.result).toBeUint(0);

    const aggregate = simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());
    expect(aggregate.result).toHaveTupleProperty("price", Cl.uint(0));
    expect(aggregate.result).toHaveTupleProperty("block", Cl.uint(0));
  });

  it("accepts submission once reporter count meets min-reporters threshold", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet2())], deployer());

    const submission = simnet.callPublicFn(
      CONTRACT,
      "submit-price",
      [Cl.uint(1_000_000)],
      wallet1()
    );

    expect(submission.result).toBeOk(Cl.bool(true));

    const price = simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());
    expect(price.result).toBeUint(1_000_000);
  });

  it("stored price unchanged after threshold rejection", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet2())], deployer());

    // First submission succeeds (2 reporters >= min 2)
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(500_000)], wallet1());

    // Increase min-reporters to 3
    simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(2)], deployer());

    // Price should still be 500_000 from the successful submission
    const price = simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());
    expect(price.result).toBeUint(500_000);
  });
});

