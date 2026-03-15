import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("oracle price-age reporting", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("returns zero age before any price submission", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-price-age", [], deployer()
    );
    expect(result).toBeUint(0);
  });

  it("returns correct age after blocks elapse", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(50000000)], wallet1());
    simnet.mineEmptyBlocks(10);

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-price-age", [], deployer()
    );
    expect(result).toBeUint(10);
  });

  it("resets age on new submission", () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(50000000)], wallet1());
    simnet.mineEmptyBlocks(10);
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(50000000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-price-age", [], deployer()
    );
    expect(result).toBeUint(0);
  });
});
