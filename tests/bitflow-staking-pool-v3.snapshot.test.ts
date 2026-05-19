import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool dashboard snapshot tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

  const initPool = () =>
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
  const setRate = (rate: number) =>
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(rate)], deployer());
  const fundRewards = (amount: number) =>
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(amount)], deployer());
  const stake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(amount)], sender);
  const getSnapshot = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-dashboard-snapshot", [], deployer());

  const setup = (rate = 1000) => {
    initPool();
    setRate(rate);
    fundRewards(100_000_000_000);
  };

  it("returns all expected fields on empty pool", () => {
    setup();
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("total-staked", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-stakers", Cl.uint(0));
    expect(result).toHaveTupleProperty("reward-rate", Cl.uint(1000));
    expect(result).toHaveTupleProperty("estimated-apy-bps", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-rewards-distributed", Cl.uint(0));
    expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
  });

  it("reflects stake in snapshot", () => {
    setup();
    stake(5_000_000, wallet1());
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("total-staked", Cl.uint(5_000_000));
    expect(result).toHaveTupleProperty("total-stakers", Cl.uint(1));
  });

  it("includes estimated APY when staked", () => {
    setup(1000);
    stake(1_000_000, wallet1());
    const { result } = getSnapshot();
    const apy = (result as any).value?.["estimated-apy-bps"]?.value;
    expect(Number(apy)).toBeGreaterThan(0);
  });

  it("includes protocol age", () => {
    setup();
    simnet.mineEmptyBlocks(10);
    const { result } = getSnapshot();
    const age = (result as any).value?.["protocol-age-blocks"]?.value;
    expect(Number(age)).toBeGreaterThanOrEqual(10);
  });

  it("includes volume metrics", () => {
    setup();
    stake(3_000_000, wallet1());
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("total-stake-volume", Cl.uint(3_000_000));
  });
});
