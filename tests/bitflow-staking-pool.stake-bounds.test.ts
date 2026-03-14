import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool stake boundary tests", () => {
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

  const setup = () => {
    initPool();
    setRate(1000);
    fundRewards(100_000_000_000);
  };

  // ── Zero-amount guard ───────────────────────────────────────────
  describe("zero-amount guard", () => {
    it("rejects zero stake", () => {
      setup();
      const { result } = stake(0, wallet1());
      expect(result).toBeErr(Cl.uint(201)); // ERR-ZERO-AMOUNT
    });
  });

  // ── Minimum stake amount ────────────────────────────────────────
  describe("minimum stake amount", () => {
    it("rejects below MIN-STAKE-AMOUNT (1 STX = 1_000_000 microSTX)", () => {
      setup();
      const { result } = stake(999_999, wallet1());
      expect(result).toBeErr(Cl.uint(206)); // ERR-INVALID-AMOUNT
    });

    it("accepts exactly MIN-STAKE-AMOUNT", () => {
      setup();
      const { result } = stake(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Maximum stake per user ──────────────────────────────────────
  describe("maximum stake per user", () => {
    it("rejects stake exceeding MAX-STAKE-PER-USER (5M STX)", () => {
      setup();
      const { result } = stake(5_000_000_000_001, wallet1());
      expect(result).toBeErr(Cl.uint(209)); // ERR-MAX-STAKE-EXCEEDED
    });

    it("accepts exactly MAX-STAKE-PER-USER", () => {
      setup();
      const { result } = stake(5_000_000_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects second stake that would exceed max", () => {
      setup();
      stake(4_999_999_000_000, wallet1());
      const { result } = stake(2_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(209));
    });
  });

  // ── Pause guard ─────────────────────────────────────────────────
  describe("pause guard", () => {
    it("rejects stake when pool is paused", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
      const { result } = stake(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(207)); // ERR-PROTOCOL-PAUSED
    });
  });

  // ── Initialization guard ────────────────────────────────────────
  describe("initialization guard", () => {
    it("rejects stake before pool initialization", () => {
      // Don't call initPool
      const { result } = stake(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(207)); // ERR-PROTOCOL-PAUSED (start block is 0)
    });
  });
});
