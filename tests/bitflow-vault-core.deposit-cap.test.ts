import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const V1 = "bitflow-vault-core";

describe("v1 deposit-cap boundary", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("rejects deposit that would exceed per-user cap", () => {
    // Cap is 10M STX = u10000000000000
    const { result } = simnet.callPublicFn(
      V1, "deposit", [Cl.uint(10000000000001)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(102));
  });

  it("accepts deposit at exactly the cap", () => {
    const { result } = simnet.callPublicFn(
      V1, "deposit", [Cl.uint(10000000000000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects second deposit that pushes total above cap", () => {
    simnet.callPublicFn(V1, "deposit", [Cl.uint(9999999999999)], wallet1());
    const { result } = simnet.callPublicFn(
      V1, "deposit", [Cl.uint(2)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(102));
  });
});
