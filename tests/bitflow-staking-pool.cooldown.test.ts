import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool cooldown lifecycle tests", () => {
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
  const requestUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "request-unstake", [], sender);
  const unstake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "unstake", [Cl.uint(amount)], sender);
  const getStakerInfo = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-info", [Cl.principal(user)], deployer());

  const setup = () => {
    initPool();
    setRate(1000);
    fundRewards(100_000_000_000);
  };

  // ── Request unstake sets cooldown ───────────────────────────────
  describe("request-unstake", () => {
    it("sets cooldown-end on staker info", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());

      const { result } = getStakerInfo(wallet1());
      const cooldownEnd = (result as any).data?.["cooldown-end"]?.value;
      expect(Number(cooldownEnd)).toBeGreaterThan(0);
    });

    it("fails if staker has no balance", () => {
      setup();
      const { result } = requestUnstake(wallet1());
      expect(result).toBeErr(Cl.uint(203)); // ERR-NO-STAKE
    });
  });

  // ── Unstake before cooldown expires ─────────────────────────────
  describe("unstake before cooldown", () => {
    it("rejects unstake before cooldown expires", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      // Don't mine enough blocks (cooldown is 144 blocks)
      simnet.mineEmptyBlocks(100);
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(204)); // ERR-COOLDOWN-ACTIVE
    });
  });

  // ── Unstake without requesting cooldown ─────────────────────────
  describe("unstake without request", () => {
    it("rejects unstake if cooldown was never requested", () => {
      setup();
      stake(5_000_000, wallet1());
      simnet.mineEmptyBlocks(200);
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(204)); // ERR-COOLDOWN-ACTIVE (cooldown-end == 0)
    });
  });

  // ── Successful unstake after cooldown ───────────────────────────
  describe("successful unstake after cooldown", () => {
    it("allows full unstake after cooldown period", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145); // past COOLDOWN-PERIOD of 144
      const { result } = unstake(5_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows partial unstake after cooldown", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(2_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("resets cooldown after unstake", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2_000_000, wallet1());

      const { result } = getStakerInfo(wallet1());
      const cooldownEnd = (result as any).data?.["cooldown-end"]?.value;
      expect(Number(cooldownEnd)).toBe(0);
    });
  });

  // ── Unstake more than balance ───────────────────────────────────
  describe("unstake more than balance", () => {
    it("rejects unstake exceeding balance", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(6_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(202)); // ERR-INSUFFICIENT-BALANCE
    });
  });

  // ── Re-request cooldown ─────────────────────────────────────────
  describe("re-request cooldown", () => {
    it("can request unstake again after partial unstake", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2_000_000, wallet1());

      // Request again for remaining 3M
      const { result } = requestUnstake(wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Zero-amount unstake ─────────────────────────────────────────
  describe("zero-amount unstake", () => {
    it("rejects zero unstake", () => {
      setup();
      stake(5_000_000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(0, wallet1());
      expect(result).toBeErr(Cl.uint(201)); // ERR-ZERO-AMOUNT
    });
  });
});
