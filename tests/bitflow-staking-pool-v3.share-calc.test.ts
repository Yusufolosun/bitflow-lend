import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("staking pool share calculation", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;
  const wallet2 = () => accounts().get("wallet_2")!;

  it("returns 10000 bps (100%) for sole staker", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-staker-share", [Cl.principal(wallet1())], wallet1()
    );
    expect(result).toBeUint(10000);
  });

  it("splits 50/50 between equal stakers", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet2());

    const r1 = simnet.callReadOnlyFn(
      CONTRACT, "get-staker-share", [Cl.principal(wallet1())], wallet1()
    );
    const r2 = simnet.callReadOnlyFn(
      CONTRACT, "get-staker-share", [Cl.principal(wallet2())], wallet2()
    );
    expect(r1.result).toBeUint(5000);
    expect(r2.result).toBeUint(5000);
  });

  it("returns zero share for non-staker", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-staker-share", [Cl.principal(wallet2())], wallet2()
    );
    expect(result).toBeUint(0);
  });
});
