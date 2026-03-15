import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 repay exact loan boundary", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  const setup = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
  };

  it("repay clears loan and returns correct breakdown", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet1());
    const data = result as any;
    expect(data.value.value.principal).toBeUint(1000000);
  });

  it("loan is deleted after repay", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    simnet.callPublicFn(CONTRACT, "repay", [], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-user-loan", [Cl.principal(wallet1())], deployer()
    );
    expect(result).toBeNone();
  });

  it("user can borrow again after repay", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    simnet.callPublicFn(CONTRACT, "repay", [], wallet1());

    // Need fresh price since blocks advanced
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());

    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(500000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
