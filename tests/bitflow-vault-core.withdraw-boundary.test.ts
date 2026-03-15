import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const V1 = "bitflow-vault-core";

describe("v1 withdraw boundary", () => {
  const accounts = () => simnet.getAccounts();
  const wallet1 = () => accounts().get("wallet_1")!;

  it("rejects withdrawal exceeding deposited balance", () => {
    simnet.callPublicFn(V1, "deposit", [Cl.uint(1000000)], wallet1());
    const { result } = simnet.callPublicFn(
      V1, "withdraw", [Cl.uint(1000001)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("allows full withdrawal of deposited balance", () => {
    simnet.callPublicFn(V1, "deposit", [Cl.uint(1000000)], wallet1());
    const { result } = simnet.callPublicFn(
      V1, "withdraw", [Cl.uint(1000000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("returns zero balance after full withdrawal", () => {
    simnet.callPublicFn(V1, "deposit", [Cl.uint(1000000)], wallet1());
    simnet.callPublicFn(V1, "withdraw", [Cl.uint(1000000)], wallet1());
    const { result } = simnet.callReadOnlyFn(
      V1, "get-user-deposit",
      [Cl.principal(wallet1())],
      wallet1()
    );
    expect(result).toBeUint(0);
  });
});
