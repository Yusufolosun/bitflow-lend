import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 interest precision tests", () => {
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

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Ceiling division guarantees non-zero interest ───────────────
  describe("ceiling division", () => {
    it("minimum borrow for 1 block accrues at least 1 microSTX interest", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(100_000, 50, 30, wallet1()); // min rate, small amount

      // Repay immediately (1 block elapsed from borrow)
      const { result } = repay(wallet1());
      // Interest should be > 0 thanks to ceiling division
      const interest = (result as any).data?.interest?.value;
      expect(Number(interest)).toBeGreaterThanOrEqual(1);
    });

    it("large borrow accrues proportionally more interest", () => {
      setup();
      deposit(500_000_000_000, wallet1());
      borrow(100_000_000_000, 500, 30, wallet1()); // 100K STX at 5%

      simnet.mineEmptyBlocks(52560); // ~1 year

      const repayment = getRepayment(wallet1());
      const interest = (repayment.result as any).data?.interest?.value;
      const principal = (repayment.result as any).data?.principal?.value;

      // ~5% of 100K STX = ~5K STX = 5_000_000_000 microSTX
      // Allow reasonable range due to block rounding
      const interestVal = Number(interest);
      const principalVal = Number(principal);
      const interestPct = (interestVal / principalVal) * 100;
      expect(interestPct).toBeGreaterThan(4);
      expect(interestPct).toBeLessThan(6);
    });
  });

  // ── Interest grows with time ────────────────────────────────────
  describe("interest increases with blocks elapsed", () => {
    it("more blocks produce more interest", () => {
      setup();

      // First borrower repays after 10 blocks
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      simnet.mineEmptyBlocks(10);
      const r1 = getRepayment(wallet1());
      const i1 = Number((r1.result as any).data?.interest?.value);

      // Repay to reset
      repay(wallet1());

      // Second borrow, repay after 1000 blocks
      borrow(1_000_000, 500, 30, wallet1());
      simnet.mineEmptyBlocks(1000);
      const r2 = getRepayment(wallet1());
      const i2 = Number((r2.result as any).data?.interest?.value);

      expect(i2).toBeGreaterThan(i1);
    });
  });

  // ── Zero interest on zero blocks ────────────────────────────────
  describe("interest at borrow block", () => {
    it("repayment at same block has ceiling-minimum interest", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      // Repay in the next block (1 block elapsed)
      const { result } = repay(wallet1());
      const total = Number((result as any).data?.total?.value);
      // Total = principal + interest (>=1) + penalty (0)
      expect(total).toBeGreaterThanOrEqual(1_000_001);
    });
  });

  // ── Late penalty only applies after term ────────────────────────
  describe("late penalty boundary", () => {
    it("no penalty before term end", () => {
      setup();
      deposit(10_000_000, wallet1());
      // 30 day term = 30 * 144 = 4320 blocks
      borrow(1_000_000, 500, 30, wallet1());
      simnet.mineEmptyBlocks(4000); // before term end

      const { result } = repay(wallet1());
      const penalty = Number((result as any).data?.penalty?.value);
      expect(penalty).toBe(0);
    });

    it("penalty applies after term end", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      simnet.mineEmptyBlocks(4500); // past 30-day term

      const { result } = repay(wallet1());
      const penalty = Number((result as any).data?.penalty?.value);
      // Late penalty = loan_amount * 500 / 10000 = 5% of 1M = 50000
      expect(penalty).toBe(50_000);
    });
  });

  // ── Interest rate precision at boundaries ───────────────────────
  describe("interest rate boundary precision", () => {
    it("minimum rate (50 bps = 0.5%) produces non-zero interest over year", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 50, 365, wallet1());
      simnet.mineEmptyBlocks(52560); // ~1 year

      const repayment = getRepayment(wallet1());
      const interest = Number((repayment.result as any).data?.interest?.value);
      // 0.5% of 1M = 5000
      expect(interest).toBeGreaterThan(4000);
      expect(interest).toBeLessThan(6000);
    });

    it("maximum rate (10000 bps = 100%) produces ~principal in interest over year", () => {
      setup();
      deposit(100_000_000, wallet1());
      borrow(1_000_000, 10000, 365, wallet1());
      simnet.mineEmptyBlocks(52560);

      const repayment = getRepayment(wallet1());
      const interest = Number((repayment.result as any).data?.interest?.value);
      // 100% of 1M should be ~1M
      expect(interest).toBeGreaterThan(900_000);
      expect(interest).toBeLessThan(1_100_000);
    });
  });
});
