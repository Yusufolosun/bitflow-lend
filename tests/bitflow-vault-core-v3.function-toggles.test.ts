import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const V2 = "bitflow-vault-core-v2";

describe("v2 per-function pause toggles", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("blocks deposits when deposits are disabled", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(V2, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(
      V2, "toggle-deposits-enabled", [Cl.bool(false)], deployer()
    );

    const { result } = simnet.callPublicFn(
      V2, "deposit", [Cl.uint(1000000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(112));
  });

  it("blocks borrows when borrows are disabled", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(V2, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(V2, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      V2, "toggle-borrows-enabled", [Cl.bool(false)], deployer()
    );

    const { result } = simnet.callPublicFn(
      V2, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(112));
  });

  it("blocks withdrawals when withdrawals are disabled", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(V2, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      V2, "toggle-withdrawals-enabled", [Cl.bool(false)], deployer()
    );

    const { result } = simnet.callPublicFn(
      V2, "withdraw", [Cl.uint(1000000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(112));
  });

  it("re-enables deposits after toggle", () => {
    simnet.callPublicFn(V2, "initialize", [], deployer());
    simnet.callPublicFn(
      V2, "toggle-deposits-enabled", [Cl.bool(false)], deployer()
    );
    simnet.callPublicFn(
      V2, "toggle-deposits-enabled", [Cl.bool(true)], deployer()
    );

    const { result } = simnet.callPublicFn(
      V2, "deposit", [Cl.uint(1000000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
