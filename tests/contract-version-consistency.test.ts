import { describe, expect, it } from "vitest";

const V2 = "bitflow-vault-core-v2";

describe("contract version consistency", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;

  it("v2 reports version 2.0.0", () => {
    const { result } = simnet.callReadOnlyFn(V2, "get-contract-version", [], deployer());
    expect(result).toBeAscii("2.0.0");
  });

  it("v2 default collateral ratio and liquidation threshold are sane", () => {
    const v2Params = simnet.callReadOnlyFn(V2, "get-protocol-parameters", [], deployer());
    const params = (v2Params.result as any).value.value;

    expect(params["min-collateral-ratio"]).toBeUint(150);
    expect(params["liquidation-threshold"]).toBeUint(110);
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
