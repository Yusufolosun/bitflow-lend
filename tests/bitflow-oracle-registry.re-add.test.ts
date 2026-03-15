import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("oracle re-add removed reporter", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;
  const wallet2 = () => accounts().get("wallet_2")!;

  it("allows re-adding a previously removed reporter", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet2())], deployer());

    // Remove wallet1
    simnet.callPublicFn(CONTRACT, "remove-reporter", [Cl.principal(wallet1())], deployer());

    // Verify wallet1 is inactive
    const inactive = simnet.callReadOnlyFn(
      CONTRACT, "is-active-reporter", [Cl.principal(wallet1())], deployer()
    );
    expect(inactive.result).toBeBool(false);

    // Re-add wallet1
    const { result } = simnet.callPublicFn(
      CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer()
    );
    expect(result).toBeOk(Cl.bool(true));

    // Verify wallet1 is active again
    const active = simnet.callReadOnlyFn(
      CONTRACT, "is-active-reporter", [Cl.principal(wallet1())], deployer()
    );
    expect(active.result).toBeBool(true);
  });

  it("re-added reporter can submit prices", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet2())], deployer());
    simnet.callPublicFn(CONTRACT, "remove-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());

    const { result } = simnet.callPublicFn(
      CONTRACT, "submit-price", [Cl.uint(50000000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
