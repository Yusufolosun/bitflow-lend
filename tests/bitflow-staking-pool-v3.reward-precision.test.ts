import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("staking reward precision with large pools", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;
  const wallet2 = () => accounts().get("wallet_2")!;

  it("distributes rewards proportionally between unequal stakers", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(1000000000)], deployer());

    // wallet1 stakes 9M, wallet2 stakes 1M (90/10 split)
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(9000000)], wallet1());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1000000)], wallet2());

    simnet.mineEmptyBlocks(100);

    const r1 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards", [Cl.principal(wallet1())], wallet1()
    );
    const r2 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards", [Cl.principal(wallet2())], wallet2()
    );

    const reward1 = Number((r1.result as any).value);
    const reward2 = Number((r2.result as any).value);

    // wallet1 should get roughly 9x wallet2's rewards
    expect(reward1).toBeGreaterThan(reward2 * 8);
    expect(reward1).toBeLessThan(reward2 * 10);
  });

  it("single staker receives all rewards", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(1000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(100000000)], deployer());

    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());
    simnet.mineEmptyBlocks(10);

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards", [Cl.principal(wallet1())], wallet1()
    );

    // 10 blocks * 1000 rate = 10000
    const reward = Number((result as any).value);
    expect(reward).toBe(10000);
  });
});
