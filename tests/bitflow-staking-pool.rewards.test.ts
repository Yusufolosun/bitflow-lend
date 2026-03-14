import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool reward edge cases", () => {
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
  const claimRewards = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "claim-rewards", [], sender);
  const getPendingRewards = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-pending-rewards", [Cl.principal(user)], deployer());
  const getPoolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-pool-stats", [], deployer());

  const setup = (rate = 1000) => {
    initPool();
    setRate(rate);
    fundRewards(100_000_000_000);
  };

  // ── Zero rewards when no blocks have passed ─────────────────────
  describe("zero rewards at stake time", () => {
    it("pending rewards are zero immediately after staking", () => {
      setup();
      stake(1_000_000, wallet1());
      const { result } = getPendingRewards(wallet1());
      expect(result).toBeUint(0);
    });
  });

  // ── Reward accrual proportionality ──────────────────────────────
  describe("reward accrual proportionality", () => {
    it("larger staker earns more rewards in same period", () => {
      setup();
      stake(3_000_000, wallet1()); // 3x
      stake(1_000_000, wallet2()); // 1x
      simnet.mineEmptyBlocks(100);

      const r1 = getPendingRewards(wallet1());
      const r2 = getPendingRewards(wallet2());

      // wallet1 should earn ~3x wallet2
      const v1 = Number((r1.result as any).value);
      const v2 = Number((r2.result as any).value);
      expect(v1).toBeGreaterThan(v2);
      // Allow for rounding: ratio should be ~3.0
      if (v2 > 0) {
        const ratio = v1 / v2;
        expect(ratio).toBeGreaterThanOrEqual(2.9);
        expect(ratio).toBeLessThanOrEqual(3.1);
      }
    });
  });

  // ── Rewards stop accruing when rate is zero ─────────────────────
  describe("zero reward rate", () => {
    it("no rewards accrue after rate set to zero", () => {
      setup();
      stake(1_000_000, wallet1());
      simnet.mineEmptyBlocks(50);

      // Capture rewards accumulated so far
      const before = getPendingRewards(wallet1());
      const beforeVal = Number((before.result as any).value);

      // Set rate to zero
      setRate(0);
      simnet.mineEmptyBlocks(50);

      const after = getPendingRewards(wallet1());
      const afterVal = Number((after.result as any).value);

      // Should be the same (no additional rewards accrued)
      expect(afterVal).toBe(beforeVal);
    });
  });

  // ── Claim resets pending to zero ────────────────────────────────
  describe("claim resets pending", () => {
    it("pending rewards are zero after claim", () => {
      setup();
      stake(1_000_000, wallet1());
      simnet.mineEmptyBlocks(100);

      // Should have rewards
      const before = getPendingRewards(wallet1());
      expect(Number((before.result as any).value)).toBeGreaterThan(0);

      // Claim
      claimRewards(wallet1());

      // Pending should be zero (or near-zero due to block used by claim)
      const after = getPendingRewards(wallet1());
      const afterVal = Number((after.result as any).value);
      // Allow 1 block of accrual from the claim transaction itself
      expect(afterVal).toBeLessThanOrEqual(1000);
    });
  });

  // ── Claim with no rewards fails ─────────────────────────────────
  describe("claim with no rewards", () => {
    it("fails when no rewards have accrued", () => {
      setup(0); // zero rate
      stake(1_000_000, wallet1());
      const { result } = claimRewards(wallet1());
      expect(result).toBeErr(Cl.uint(205)); // ERR-NO-REWARDS
    });
  });

  // ── Multiple claims accumulate in total distributed ─────────────
  describe("total rewards distributed metric", () => {
    it("accumulates across multiple claims", () => {
      setup();
      stake(1_000_000, wallet1());
      simnet.mineEmptyBlocks(50);
      claimRewards(wallet1());

      simnet.mineEmptyBlocks(50);
      claimRewards(wallet1());

      const stats = getPoolStats();
      const distributed = (stats.result as any).data?.["total-rewards-distributed"]?.value;
      expect(Number(distributed)).toBeGreaterThan(0);
    });
  });

  // ── Reward checkpoint on rate change ────────────────────────────
  describe("rate change checkpointing", () => {
    it("preserves earned rewards when rate changes", () => {
      setup(1000);
      stake(1_000_000, wallet1());
      simnet.mineEmptyBlocks(50);

      // Capture current pending
      const before = getPendingRewards(wallet1());
      const beforeVal = Number((before.result as any).value);
      expect(beforeVal).toBeGreaterThan(0);

      // Change rate — should checkpoint rewards
      setRate(2000);

      // Rewards should still be >= what they were before
      const after = getPendingRewards(wallet1());
      const afterVal = Number((after.result as any).value);
      expect(afterVal).toBeGreaterThanOrEqual(beforeVal);
    });
  });

  // ── Funding does not affect reward rate ─────────────────────────
  describe("funding independence", () => {
    it("funding pool does not change reward rate", () => {
      setup(500);
      const rateBefore = simnet.callReadOnlyFn(
        CONTRACT, "get-reward-rate", [], deployer()
      );
      fundRewards(50_000_000);
      const rateAfter = simnet.callReadOnlyFn(
        CONTRACT, "get-reward-rate", [], deployer()
      );
      expect(rateAfter.result).toBeUint(500);
      expect(rateBefore.result).toBeUint(500);
    });
  });
});
