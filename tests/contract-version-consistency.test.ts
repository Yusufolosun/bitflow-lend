import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const V1 = "bitflow-vault-core";
const V2 = "bitflow-vault-core-v2";

describe("contract version consistency", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;

  it("v1 reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(V1, "get-contract-version", [], deployer());
    expect(result).toBeAscii("1.0.0");
  });

  it("v2 reports version 2.0.0", () => {
    const { result } = simnet.callReadOnlyFn(V2, "get-contract-version", [], deployer());
    expect(result).toBeAscii("2.0.0");
  });

  it("both versions share the same collateral ratio default", () => {
    const v1Params = simnet.callReadOnlyFn(V1, "get-protocol-parameters", [], deployer());
    const v2Params = simnet.callReadOnlyFn(V2, "get-protocol-parameters", [], deployer());

    const v1Ratio = (v1Params.result as any).value.value["min-collateral-ratio"];
    const v2Ratio = (v2Params.result as any).value.value["min-collateral-ratio"];

    expect(v1Ratio).toBeUint(150);
    expect(v2Ratio).toBeUint(150);
  });

  it("both versions share the same liquidation threshold default", () => {
    const v1Params = simnet.callReadOnlyFn(V1, "get-protocol-parameters", [], deployer());
    const v2Params = simnet.callReadOnlyFn(V2, "get-protocol-parameters", [], deployer());

    const v1Threshold = (v1Params.result as any).value.value["liquidation-threshold"];
    const v2Threshold = (v2Params.result as any).value.value["liquidation-threshold"];

    expect(v1Threshold).toBeUint(110);
    expect(v2Threshold).toBeUint(110);
  });

  it("oracle registry reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-oracle-registry", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("1.0.0");
  });

  it("staking pool reports version 1.0.0", () => {
    const { result } = simnet.callReadOnlyFn(
      "bitflow-staking-pool", "get-contract-version", [], deployer()
    );
    expect(result).toBeAscii("1.0.0");
  });
});
