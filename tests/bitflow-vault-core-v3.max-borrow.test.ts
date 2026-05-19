import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 get-max-borrow-amount with active loan", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  const setup = (price = 10000) => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  };

  it("returns zero when user already has a loan", () => {
    setup(10000);
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-max-borrow-amount",
      [Cl.principal(wallet1())],
      deployer()
    );
    expect(result).toBeUint(0);
  });

  it("returns non-zero for user with deposit but no loan", () => {
    setup(10000);
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-max-borrow-amount",
      [Cl.principal(wallet1())],
      deployer()
    );
    expect(result).toBeUint(6666666);
  });

  it("returns non-zero after loan is repaid", () => {
    setup(10000);
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    simnet.callPublicFn(CONTRACT, "repay", [], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-max-borrow-amount",
      [Cl.principal(wallet1())],
      deployer()
    );
    // After repay user's deposit stays at 10M, max-borrow = 10M * 100 / 150
    expect(result).toBeUint(6666666);
  });
});
