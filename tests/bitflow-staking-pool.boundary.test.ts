import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool boundary tests", () => {
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
  const requestUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "request-unstake", [], sender);
  const unstake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "unstake", [Cl.uint(amount)], sender);
  const claimRewards = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "claim-rewards", [], sender);
  const emergencyUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "emergency-unstake", [], sender);
  const pause = () =>
    simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
  const unpause = () =>
    simnet.callPublicFn(CONTRACT, "unpause-pool", [], deployer());

  const setup = (rate = 1000) => {
    initPool();
    setRate(rate);
    fundRewards(100_000_000_000);
  };

  // ── Staking before initialization ───────────────────────────────
  describe("pre-initialization guards", () => {
    it("rejects stake before pool is initialized", () => {
      const { result } = stake(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(207)); // ERR-PROTOCOL-PAUSED
    });
  });

  // ── Minimum & maximum stake bounds ──────────────────────────────
  describe("stake amount boundaries", () => {
    it("rejects zero amount", () => {
      setup();
      const { result } = stake(0, wallet1());
      expect(result).toBeErr(Cl.uint(208)); // ERR-ZERO-AMOUNT
    });

    it("rejects below minimum stake (1 STX = 1_000_000)", () => {
      setup();
      const { result } = stake(999_999, wallet1());
      expect(result).toBeErr(Cl.uint(202)); // ERR-INVALID-AMOUNT
    });

    it("accepts exactly minimum stake", () => {
      setup();
      const { result } = stake(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects stake that exceeds per-user maximum", () => {
      setup();
      // MAX-STAKE-PER-USER is u5000000000000 (5M STX)
      const { result } = stake(5_000_000_000_001, wallet1());
      expect(result).toBeErr(Cl.uint(209)); // ERR-MAX-STAKE-EXCEEDED
    });
  });

  // ── Unstake boundaries ──────────────────────────────────────────
  describe("unstake boundaries", () => {
    it("rejects unstake of zero amount", () => {
      setup();
      stake(10_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(150);
      const { result } = unstake(0, wallet1());
      expect(result).toBeErr(Cl.uint(208)); // ERR-ZERO-AMOUNT
    });

    it("rejects unstake exceeding balance", () => {
      setup();
      stake(10_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(150);
      const { result } = unstake(10_000_001, wallet1());
      expect(result).toBeErr(Cl.uint(201)); // ERR-INSUFFICIENT-BALANCE
    });

    it("rejects unstake without requesting first", () => {
      setup();
      stake(10_000_000, wallet1());
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(204)); // ERR-COOLDOWN-ACTIVE
    });

    it("rejects unstake before cooldown expires", () => {
      setup();
      stake(10_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(140); // 144 needed
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(204)); // ERR-COOLDOWN-ACTIVE
    });

    it("accepts unstake exactly at cooldown expiry", () => {
      setup();
      stake(10_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145); // >= 144
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Claim rewards boundaries ────────────────────────────────────
  describe("claim rewards boundaries", () => {
    it("rejects claim when no rewards pending", () => {
      setup(0); // reward rate = 0
      stake(10_000_000, wallet1());
      const { result } = claimRewards(wallet1());
      expect(result).toBeErr(Cl.uint(205)); // ERR-NO-REWARDS
    });

    it("rejects claim from non-staker", () => {
      setup();
      const { result } = claimRewards(wallet2());
      expect(result).toBeErr(Cl.uint(205)); // ERR-NO-REWARDS
    });
  });

  // ── Admin parameter boundaries ──────────────────────────────────
  describe("admin parameter boundaries", () => {
    it("rejects reward rate above 100 STX/block", () => {
      setup();
      const { result } = setRate(100_000_001);
      expect(result).toBeErr(Cl.uint(210)); // ERR-INVALID-PARAM
    });

    it("accepts reward rate at upper bound", () => {
      setup();
      const { result } = setRate(100_000_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects fund-rewards with zero amount", () => {
      setup();
      const { result } = fundRewards(0);
      expect(result).toBeErr(Cl.uint(208)); // ERR-ZERO-AMOUNT
    });

    it("rejects non-owner setting reward rate", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-reward-rate", [Cl.uint(100)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(206)); // ERR-OWNER-ONLY
    });

    it("rejects double initialization", () => {
      setup();
      const { result } = initPool();
      expect(result).toBeErr(Cl.uint(206)); // ERR-OWNER-ONLY (already initialized)
    });
  });

  // ── Emergency unstake ───────────────────────────────────────────
  describe("emergency unstake", () => {
    it("rejects emergency unstake when pool is not paused", () => {
      setup();
      stake(10_000_000, wallet1());
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeErr(Cl.uint(207)); // ERR-PROTOCOL-PAUSED
    });

    it("allows emergency unstake when pool is paused", () => {
      setup();
      stake(10_000_000, wallet1());
      pause();
      const { result } = emergencyUnstake(wallet1());
      expect(result).toBeOk(Cl.uint(10_000_000));
    });

    it("rejects emergency unstake with no stake", () => {
      setup();
      pause();
      const { result } = emergencyUnstake(wallet2());
      expect(result).toBeErr(Cl.uint(203)); // ERR-NO-STAKE
    });

    it("clears staker state after emergency unstake", () => {
      setup();
      stake(10_000_000, wallet1());
      pause();
      emergencyUnstake(wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-staker-balance",
        [Cl.principal(wallet1())], wallet1()
      );
      expect(result).toBeUint(0);
    });
  });

  // ── Pause/unpause guards ────────────────────────────────────────
  describe("pause guards", () => {
    it("rejects staking when paused", () => {
      setup();
      pause();
      const { result } = stake(10_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(207));
    });

    it("allows staking after unpause", () => {
      setup();
      pause();
      unpause();
      const { result } = stake(10_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Multi-user staking share ────────────────────────────────────
  describe("multi-user pool share", () => {
    it("calculates correct share for equal stakers", () => {
      setup();
      stake(10_000_000, wallet1());
      stake(10_000_000, wallet2());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-staker-share",
        [Cl.principal(wallet1())], wallet1()
      );
      expect(result).toBeUint(5000); // 50% in bps
    });

    it("reflects share change after partial unstake", () => {
      setup();
      stake(30_000_000, wallet1());
      stake(10_000_000, wallet2());

      // wallet1 has 75%, wallet2 has 25%
      const { result: share1 } = simnet.callReadOnlyFn(
        CONTRACT, "get-staker-share",
        [Cl.principal(wallet1())], wallet1()
      );
      expect(share1).toBeUint(7500);

      const { result: share2 } = simnet.callReadOnlyFn(
        CONTRACT, "get-staker-share",
        [Cl.principal(wallet2())], wallet2()
      );
      expect(share2).toBeUint(2500);
    });
  });

  // ── Read-only: estimated APY ────────────────────────────────────
  describe("get-estimated-apy-bps", () => {
    it("returns 0 when no stake in pool", () => {
      setup(1000);
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-estimated-apy-bps", [], deployer()
      );
      expect(result).toBeUint(0);
    });

    it("returns positive APY when stake and rate are set", () => {
      setup(1000);
      stake(10_000_000, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-estimated-apy-bps", [], deployer()
      );
      // rate=1000 * 52560 * 10000 / 10_000_000 = 52560000
      expect(result).toBeUint(52560000);
    });
  });
});
