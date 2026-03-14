import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 safe arithmetic tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const withdraw = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(amount)], sender);
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );
  const repay = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "repay", [], sender);

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Deposit does not underflow total on withdraw ────────────────
  describe("safe-sub on withdraw", () => {
    it("total-deposits remains accurate after full withdrawal", () => {
      setup();
      deposit(5_000_000, wallet1());
      withdraw(5_000_000, wallet1());

      const stats = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-stats", [], deployer()
      );
      expect(stats.result).toHaveTupleProperty("total-deposits", Cl.uint(0));
    });

    it("handles withdraw of exact deposit balance", () => {
      setup();
      deposit(3_000_000, wallet1());
      deposit(7_000_000, wallet2());
      withdraw(3_000_000, wallet1());

      const stats = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-stats", [], deployer()
      );
      expect(stats.result).toHaveTupleProperty("total-deposits", Cl.uint(7_000_000));
    });
  });

  // ── Repay correctly decrements outstanding borrows ──────────────
  describe("safe-sub on repay", () => {
    it("outstanding borrows reach zero after repayment", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());
      repay(wallet1());

      const stats = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-stats", [], deployer()
      );
      expect(stats.result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(0));
    });
  });

  // ── safe-add accumulation ───────────────────────────────────────
  describe("safe-add accumulation", () => {
    it("total-deposit-volume accumulates correctly", () => {
      setup();
      deposit(1_000_000, wallet1());
      deposit(2_000_000, wallet1());
      deposit(3_000_000, wallet2());

      const snap = simnet.callReadOnlyFn(
        CONTRACT, "get-dashboard-snapshot", [], deployer()
      );
      expect(snap.result).toHaveTupleProperty("deposit-volume", Cl.uint(6_000_000));
    });

    it("borrow-volume accumulates across users", () => {
      setup();
      deposit(10_000_000, wallet1());
      deposit(10_000_000, wallet2());

      borrow(2_000_000, 500, 30, wallet1());
      borrow(3_000_000, 500, 30, wallet2());

      const snap = simnet.callReadOnlyFn(
        CONTRACT, "get-dashboard-snapshot", [], deployer()
      );
      expect(snap.result).toHaveTupleProperty("borrow-volume", Cl.uint(5_000_000));
    });
  });

  // ── Interest calculation ceiling division ────────────────────────
  describe("interest ceiling division safety", () => {
    it("ceiling division produces non-zero result for minimal amounts", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(100_000, 50, 30, wallet1()); // minimum rate, small amount

      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount", [Cl.principal(wallet1())], deployer()
      );
      const interest = (repayment.result as any).value?.value?.interest?.value;
      expect(Number(interest)).toBeGreaterThanOrEqual(1);
    });
  });
});
