import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry minimum reporter threshold", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

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
});
