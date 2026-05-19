import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool state tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

  const initPool = () =>
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
  const setRate = (rate: number) =>
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(rate)], deployer());
  const fundRewards = (amount: number) =>
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(amount)], deployer());
  const stake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(amount)], sender);
  const requestUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "request-unstake", [], sender);
  const unstake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "unstake", [Cl.uint(amount)], sender);
  const claimRewards = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "claim-rewards", [], sender);

  const getBalance = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-balance", [Cl.principal(user)], deployer());
  const getPoolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-pool-stats", [], deployer());
  const getStakerInfo = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-info", [Cl.principal(user)], deployer());
  const getShare = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-share", [Cl.principal(user)], deployer());
  const getTotalStaked = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-total-staked", [], deployer());

  const setup = (rate = 1000) => {
    initPool();
    setRate(rate);
    fundRewards(100_000_000_000);
  };

  // ── Pool stats tracking ──────────────────────────────────────────
  describe("pool stats tracking", () => {
    it("increments staker count on first stake", () => {
      setup();
      stake(1_000_000, wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(1));
    });

    it("does not double-count when same user stakes again", () => {
      setup();
      stake(1_000_000, wallet1());
      stake(1_000_000, wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(1));
    });

    it("counts multiple unique stakers", () => {
      setup();
      stake(1_000_000, wallet1());
      stake(1_000_000, wallet2());
      stake(1_000_000, wallet3());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(3));
    });

    it("decrements staker count on full unstake", () => {
      setup();
      stake(1_000_000, wallet1());
      stake(1_000_000, wallet2());

      // Fully unstake wallet1
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(1_000_000, wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(1));
    });

    it("tracks total stake volume across stakes", () => {
      setup();
      stake(1_000_000, wallet1());
      stake(2_000_000, wallet2());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stake-volume", Cl.uint(3_000_000));
    });

    it("tracks total unstake volume", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(3_000_000, wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-unstake-volume", Cl.uint(3_000_000));
    });
  });

  // ── Staker balance tracking ──────────────────────────────────────
  describe("staker balance tracking", () => {
    it("accumulates balance on repeated stakes", () => {
      setup();
      stake(1_000_000, wallet1());
      stake(2_000_000, wallet1());

      const { result } = getBalance(wallet1());
      expect(result).toBeUint(3_000_000);
    });

    it("reduces balance on partial unstake", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2_000_000, wallet1());

      const { result } = getBalance(wallet1());
      expect(result).toBeUint(3_000_000);
    });

    it("zeroes balance on full unstake", () => {
      setup();
      stake(3_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(3_000_000, wallet1());

      const { result } = getBalance(wallet1());
      expect(result).toBeUint(0);
    });
  });

  // ── Pool share calculation ───────────────────────────────────────
  describe("pool share calculation", () => {
    it("returns 10000 bps (100%) for sole staker", () => {
      setup();
      stake(5_000_000, wallet1());

      const { result } = getShare(wallet1());
      expect(result).toBeUint(10000);
    });

    it("splits equally for equal stakers", () => {
      setup();
      stake(5_000_000, wallet1());
      stake(5_000_000, wallet2());

      const share1 = getShare(wallet1());
      const share2 = getShare(wallet2());
      expect(share1.result).toBeUint(5000);
      expect(share2.result).toBeUint(5000);
    });

    it("proportional shares for unequal stakes", () => {
      setup();
      stake(3_000_000, wallet1()); // 3M
      stake(1_000_000, wallet2()); // 1M — total 4M

      const share1 = getShare(wallet1());
      const share2 = getShare(wallet2());
      // wallet1: 3/4 = 7500 bps, wallet2: 1/4 = 2500 bps
      expect(share1.result).toBeUint(7500);
      expect(share2.result).toBeUint(2500);
    });

    it("returns 0 for non-staker", () => {
      setup();
      stake(5_000_000, wallet1());

      const { result } = getShare(wallet2());
      expect(result).toBeUint(0);
    });
  });

  // ── Staker info aggregation ──────────────────────────────────────
  describe("staker info aggregation", () => {
    it("returns complete staker info", () => {
      setup();
      stake(5_000_000, wallet1());

      const { result } = getStakerInfo(wallet1());
      expect(result).toHaveTupleProperty("balance", Cl.uint(5_000_000));
      expect(result).toHaveTupleProperty("pool-share-bps", Cl.uint(10000));
    });

    it("shows zero cooldown-end when no unstake requested", () => {
      setup();
      stake(5_000_000, wallet1());

      const { result } = getStakerInfo(wallet1());
      expect(result).toHaveTupleProperty("cooldown-end", Cl.uint(0));
    });
  });

  // ── Total staked consistency ─────────────────────────────────────
  describe("total staked consistency", () => {
    it("total equals sum of individual stakes", () => {
      setup();
      stake(3_000_000, wallet1());
      stake(7_000_000, wallet2());

      const { result } = getTotalStaked();
      expect(result).toBeUint(10_000_000);
    });

    it("total adjusts after partial unstake", () => {
      setup();
      stake(5_000_000, wallet1());
      stake(5_000_000, wallet2());

      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(3_000_000, wallet1());

      const { result } = getTotalStaked();
      expect(result).toBeUint(7_000_000); // 2M + 5M
    });
  });

  // ── Re-staking after full unstake ────────────────────────────────
  describe("re-staking after full unstake", () => {
    it("allows re-staking after fully unstaking", () => {
      setup();
      stake(2_000_000, wallet1());

      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2_000_000, wallet1());

      const { result } = stake(3_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));

      const bal = getBalance(wallet1());
      expect(bal.result).toBeUint(3_000_000);
    });

    it("re-increments staker count after re-stake", () => {
      setup();
      stake(2_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2_000_000, wallet1());

      stake(1_000_000, wallet1());

      const stats = getPoolStats();
      expect(stats.result).toHaveTupleProperty("total-stakers", Cl.uint(1));
    });
  });

  // ── Cooldown lifecycle ───────────────────────────────────────────
  describe("cooldown lifecycle", () => {
    it("sets cooldown end on request-unstake", () => {
      setup();
      stake(1_000_000, wallet1());
      requestUnstake(wallet1());

      const info = getStakerInfo(wallet1());
      // cooldown-end should be > 0
      // We can't predict exact block but it should be non-zero
      const cooldownEnd = (info.result as any).value?.["cooldown-end"]?.value ?? 0;
      expect(Number(cooldownEnd)).toBeGreaterThan(0);
    });

    it("resets cooldown after successful unstake", () => {
      setup();
      stake(1_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(1_000_000, wallet1());

      const info = getStakerInfo(wallet1());
      expect(info.result).toHaveTupleProperty("cooldown-end", Cl.uint(0));
    });
  });
});
