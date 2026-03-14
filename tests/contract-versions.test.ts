import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

describe("contract version verification", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;

  it("vault-core v1 reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-vault-core", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("1.0.0");
  });

  it("vault-core v2 reports version 2.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-vault-core-v2", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("2.0.0");
  });

  it("staking-pool reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-staking-pool", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("1.0.0");
  });

  it("oracle-registry reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-oracle-registry", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("1.0.0");
  });
});
