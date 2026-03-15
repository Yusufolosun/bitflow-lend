import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("staking earned underflow guard", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("returns only pending rewards when per-token equals paid checkpoint", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(0)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(100000000)], deployer());

    // Stake with zero reward rate — per-token stays at stored value
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], wallet1());

    // Mine blocks with zero reward rate
    simnet.mineEmptyBlocks(50);

    // Pending rewards should be 0 since rate is 0
    const result = simnet.callReadOnlyFn(
      CONTRACT,
      "get-pending-rewards",
      [Cl.principal(wallet1())],
      wallet1()
    );
    expect(result.result).toEqual(Cl.uint(0));
  });

  it("does not panic when staker has no prior checkpoint", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(1000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(100000000)], deployer());

    // Another user stakes first to accrue reward-per-token
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5000000)], deployer());
    simnet.mineEmptyBlocks(10);

    // wallet1 queries rewards without ever staking — paid defaults to 0
    const result = simnet.callReadOnlyFn(
      CONTRACT,
      "get-pending-rewards",
      [Cl.principal(wallet1())],
      wallet1()
    );
    // Should be 0 (balance is 0, so balance * delta / precision = 0)
    expect(result.result).toEqual(Cl.uint(0));
  });

  it("correctly accrues rewards after stake even with prior accumulation", () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(500000000)], deployer());

    // deployer stakes alone to build up reward-per-token
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(10000000)], deployer());
    simnet.mineEmptyBlocks(20);

    // wallet1 stakes after accumulation
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(10000000)], wallet1());
    simnet.mineEmptyBlocks(10);

    // wallet1 should have rewards only from the 10 blocks after staking
    const result = simnet.callReadOnlyFn(
      CONTRACT,
      "get-pending-rewards",
      [Cl.principal(wallet1())],
      wallet1()
    );
    // Should be > 0 (accrued over 10 blocks with their share)
    const value = (result.result as any).value;
    expect(Number(value)).toBeGreaterThan(0);
  });
});
