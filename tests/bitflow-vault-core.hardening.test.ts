import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("bitflow-vault-core v1 hardening verification tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const withdraw = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(amount)], sender);

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Zero-amount withdraw guard ──────────────────────────────────
  describe("zero-amount withdraw guard", () => {
    it("rejects zero withdrawal", () => {
      setup();
      deposit(5_000_000, wallet1());
      const { result } = withdraw(0, wallet1());
      expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-AMOUNT
    });

    it("allows non-zero withdrawal", () => {
      setup();
      deposit(5_000_000, wallet1());
      const { result } = withdraw(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Zero-amount deposit guard ───────────────────────────────────
  describe("zero-amount deposit guard", () => {
    it("rejects zero deposit", () => {
      setup();
      const { result } = deposit(0, wallet1());
      expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-AMOUNT
    });
  });

  // ── Per-user deposit cap ────────────────────────────────────────
  describe("per-user deposit cap", () => {
    it("rejects deposit that would exceed 10M STX cap", () => {
      setup();
      // Deposit just under the cap first
      deposit(9_999_999_000_000, wallet1());
      // This should push over the 10T microSTX cap
      const { result } = deposit(2_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(101)); // ERR-INVALID-AMOUNT
    });

    it("accepts deposit at exactly the cap", () => {
      setup();
      // 10M STX = 10_000_000_000_000 microSTX
      const { result } = deposit(10_000_000_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Withdraw more than available ────────────────────────────────
  describe("withdraw more than available", () => {
    it("rejects withdrawal exceeding balance", () => {
      setup();
      deposit(5_000_000, wallet1());
      const { result } = withdraw(6_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(102)); // ERR-INSUFFICIENT-BALANCE
    });
  });

  // ── Withdraw with locked collateral ─────────────────────────────
  describe("withdraw with locked collateral", () => {
    it("rejects withdrawal that would dip into locked collateral", () => {
      setup();
      deposit(10_000_000, wallet1());
      // Borrow against collateral
      simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(5_000_000), Cl.uint(500), Cl.uint(30)],
        wallet1()
      );
      // Required collateral = 5M * 150% = 7.5M
      // Available = 10M - 7.5M = 2.5M
      // Try to withdraw 3M (more than available)
      const { result } = withdraw(3_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(102));
    });

    it("allows withdrawal within available balance", () => {
      setup();
      deposit(10_000_000, wallet1());
      simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(5_000_000), Cl.uint(500), Cl.uint(30)],
        wallet1()
      );
      // Available = 10M - 7.5M = 2.5M
      const { result } = withdraw(2_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Pause guards on deposit/withdraw ────────────────────────────
  describe("pause guards", () => {
    it("rejects deposit when paused", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "pause", [], deployer());
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(108)); // ERR-PROTOCOL-PAUSED
    });

    it("rejects withdrawal when paused", () => {
      setup();
      deposit(5_000_000, wallet1());
      simnet.callPublicFn(CONTRACT, "pause", [], deployer());
      const { result } = withdraw(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(108));
    });
  });
});
