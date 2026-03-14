import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 repay lifecycle tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );
  const repay = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "repay", [], sender);
  const getRepayment = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(user)], deployer());
  const getUserLoan = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(user)], deployer());
  const getProtocolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], deployer());

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Repay return structure ──────────────────────────────────────
  describe("repay return structure", () => {
    it("returns principal, interest, penalty, and total fields", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());

      const { result } = repay(wallet1());
      expect(result).toHaveTupleProperty("principal", Cl.uint(1_000_000));
      // Interest should be >= 1 (ceiling division)
      const interest = (result as any).value?.interest?.value;
      expect(Number(interest)).toBeGreaterThanOrEqual(1);
      expect(result).toHaveTupleProperty("penalty", Cl.uint(0));
    });

    it("total equals principal + interest + penalty", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      simnet.mineEmptyBlocks(100);

      const { result } = repay(wallet1());
      const principal = Number((result as any).value?.principal?.value);
      const interest = Number((result as any).value?.interest?.value);
      const penalty = Number((result as any).value?.penalty?.value);
      const total = Number((result as any).value?.total?.value);

      expect(total).toBe(principal + interest + penalty);
    });
  });

  // ── Repay clears loan ───────────────────────────────────────────
  describe("repay clears loan", () => {
    it("loan is none after repayment", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      repay(wallet1());

      const { result } = getUserLoan(wallet1());
      expect(result).toBeNone();
    });

    it("repayment amount is none after repayment", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      repay(wallet1());

      const { result } = getRepayment(wallet1());
      expect(result).toBeNone();
    });
  });

  // ── Repay without loan fails ────────────────────────────────────
  describe("repay without loan", () => {
    it("rejects repay when no loan exists", () => {
      setup();
      deposit(10_000_000, wallet1());

      const { result } = repay(wallet1());
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });
  });

  // ── Repay when paused ───────────────────────────────────────────
  describe("repay when paused", () => {
    it("rejects repay when protocol is paused", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());

      const { result } = repay(wallet1());
      expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
    });
  });

  // ── Repay updates metrics ───────────────────────────────────────
  describe("repay updates metrics", () => {
    it("decrements outstanding borrows", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());
      repay(wallet1());

      const stats = getProtocolStats();
      expect(stats.result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(0));
    });

    it("increments total repaid", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      repay(wallet1());

      const stats = getProtocolStats();
      const repaid = (stats.result as any).value?.["total-repaid"]?.value;
      expect(Number(repaid)).toBeGreaterThanOrEqual(1_000_001);
    });
  });

  // ── Borrow after repay ──────────────────────────────────────────
  describe("borrow after repay", () => {
    it("allows new borrow after repayment", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      repay(wallet1());

      const { result } = borrow(2_000_000, 500, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Late repayment ──────────────────────────────────────────────
  describe("late repayment with penalty", () => {
    it("includes 5% penalty when overdue", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());
      // Mine past 30-day term (30 * 144 = 4320 blocks)
      simnet.mineEmptyBlocks(5000);

      const { result } = repay(wallet1());
      const penalty = Number((result as any).value?.penalty?.value);
      // 5% of 2M = 100_000
      expect(penalty).toBe(100_000);
    });
  });
});
