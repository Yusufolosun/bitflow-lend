import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("staking emergency-unstake reward forfeiture", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("forfeits accrued rewards on emergency unstake", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(1000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(100000000)], deployer());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());

    // Accrue rewards over 10 blocks
    simnet.mineEmptyBlocks(10);

    // Verify rewards accumulated
    const before = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards", [Cl.principal(wallet1())], wallet1()
    );
    const rewardsBefore = (before.result as any).value;
    expect(Number(rewardsBefore)).toBeGreaterThan(0);

    // Pause and emergency unstake
    simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
    const { result } = simnet.callPublicFn(CONTRACT, "emergency-unstake", [], wallet1());
    expect(result).toBeOk(Cl.uint(5000000));

    // Rewards should be zero after emergency unstake
    const after = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards", [Cl.principal(wallet1())], wallet1()
    );
    expect(after.result).toBeUint(0);
  });

  it("emergency unstake only works when paused", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());

    const { result } = simnet.callPublicFn(CONTRACT, "emergency-unstake", [], wallet1());
    expect(result).toBeErr(Cl.uint(207));
  });

  it("returns full staked balance on emergency unstake", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());

    simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
    const { result } = simnet.callPublicFn(CONTRACT, "emergency-unstake", [], wallet1());
    expect(result).toBeOk(Cl.uint(5000000));

    // Balance should be zero
    const balance = simnet.callReadOnlyFn(
      CONTRACT, "get-staker-balance", [Cl.principal(wallet1())], wallet1()
    );
    expect(balance.result).toBeUint(0);
  });
});
