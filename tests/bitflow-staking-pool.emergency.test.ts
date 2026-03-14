import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool emergency unstake tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;

  const initPool = () =>
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
  const setRate = (rate: number) =>
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(rate)], deployer());
  const fundRewards = (amount: number) =>
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(amount)], deployer());
  const stake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(amount)], sender);
  const pausePool = () =>
    simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
  const unpausePool = () =>
    simnet.callPublicFn(CONTRACT, "unpause-pool", [], deployer());
  const emergencyUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "emergency-unstake", [], sender);
  const getBalance = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-balance", [Cl.principal(user)], deployer());
  const getPoolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-pool-stats", [], deployer());

  const setup = () => {
    initPool();
    setRate(1000);
    fundRewards(100_000_000_000);
  };

  // ── Emergency unstake only when paused ──────────────────────────
  describe("pause requirement", () => {
    it("rejects emergency unstake when pool is active", () => {
      setup();
      stake(5_000_000, wallet1());
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeErr(Cl.uint(207)); // ERR-PROTOCOL-PAUSED
    });

    it("allows emergency unstake when pool is paused", () => {
      setup();
      stake(5_000_000, wallet1());
      pausePool();
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeOk(Cl.uint(5_000_000));
    });
  });

  // ── No stake guard ──────────────────────────────────────────────
  describe("no stake guard", () => {
    it("rejects emergency unstake with zero balance", () => {
      setup();
      pausePool();
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeErr(Cl.uint(203)); // ERR-NO-STAKE
    });
  });

  // ── Bypasses cooldown ───────────────────────────────────────────
  describe("cooldown bypass", () => {
    it("allows immediate withdrawal without cooldown", () => {
      setup();
      stake(5_000_000, wallet1());
      // No request-unstake or cooldown wait needed
      pausePool();
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeOk(Cl.uint(5_000_000));
    });
  });

  // ── State cleanup ───────────────────────────────────────────────
  describe("state cleanup after emergency unstake", () => {
    it("zeroes staker balance", () => {
      setup();
      stake(5_000_000, wallet1());
      pausePool();
      emergencyUnstake(wallet1());

      const { result } = getBalance(wallet1());
      expect(result).toBeUint(0);
    });

    it("decrements total stakers", () => {
      setup();
      stake(5_000_000, wallet1());
      stake(3_000_000, wallet2());
      pausePool();
      emergencyUnstake(wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(1));
    });

    it("updates total staked", () => {
      setup();
      stake(5_000_000, wallet1());
      stake(3_000_000, wallet2());
      pausePool();
      emergencyUnstake(wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-staked", Cl.uint(3_000_000));
    });

    it("updates unstake volume", () => {
      setup();
      stake(5_000_000, wallet1());
      pausePool();
      emergencyUnstake(wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-unstake-volume", Cl.uint(5_000_000));
    });
  });

  // ── Re-stake after emergency ────────────────────────────────────
  describe("recovery after emergency", () => {
    it("user can re-stake once pool is unpaused", () => {
      setup();
      stake(5_000_000, wallet1());
      pausePool();
      emergencyUnstake(wallet1());
      unpausePool();

      const { result } = stake(2_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
