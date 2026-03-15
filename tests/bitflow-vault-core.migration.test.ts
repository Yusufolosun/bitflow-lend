import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("bitflow-vault-core migration export tests", () => {
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
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );
  const exportUser = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "export-user-position", [Cl.principal(user)], deployer());
  const exportProtocol = () =>
    simnet.callReadOnlyFn(CONTRACT, "export-protocol-state", [], deployer());

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── User position export for depositor ──────────────────────────
  describe("depositor export", () => {
    it("exports deposit with no loan", () => {
      setup();
      deposit(5_000_000, wallet1());

      const { result } = exportUser(wallet1());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(5_000_000));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
    });

    it("exports zero deposit for non-user", () => {
      setup();
      const { result } = exportUser(wallet2());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(0));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
    });
  });

  // ── User position export for borrower ───────────────────────────
  describe("borrower export", () => {
    it("exports deposit and loan state together", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());

      const { result } = exportUser(wallet1());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(10_000_000));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(true));
    });

    it("includes loan amount in nested loan tuple", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());

      const { result } = exportUser(wallet1());
      const loan = (result as any).value?.loan;
      expect(loan).toHaveTupleProperty("amount", Cl.uint(2_000_000));
      expect(loan).toHaveTupleProperty("interest-rate", Cl.uint(500));
    });

    it("includes repayment breakdown", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());

      const { result } = exportUser(wallet1());
      // Repayment should be (some { principal, interest, penalty, total })
      const repayment = (result as any).value?.repayment;
      expect(repayment).not.toBeNull();
    });
  });

  // ── Protocol state export ───────────────────────────────────────
  describe("protocol state export", () => {
    it("exports total deposits", () => {
      setup();
      deposit(3_000_000, wallet1());
      deposit(7_000_000, wallet2());

      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("total-deposits", Cl.uint(10_000_000));
    });

    it("exports STX price", () => {
      setup();
      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("stx-price", Cl.uint(100));
    });

    it("exports paused state", () => {
      setup();
      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
    });

    it("includes exported-at-block", () => {
      setup();
      const { result } = exportProtocol();
      const block = (result as any).value?.["exported-at-block"]?.value;
      expect(Number(block)).toBeGreaterThan(0);
    });
  });

  // ── Consistency between export functions ────────────────────────
  describe("export consistency", () => {
    it("user deposits sum equals protocol total-deposits", () => {
      setup();
      deposit(3_000_000, wallet1());
      deposit(7_000_000, wallet2());

      const u1 = exportUser(wallet1());
      const u2 = exportUser(wallet2());
      const proto = exportProtocol();

      const d1 = Number((u1.result as any).value?.deposit?.value);
      const d2 = Number((u2.result as any).value?.deposit?.value);
      const total = Number((proto.result as any).value?.["total-deposits"]?.value);

      expect(d1 + d2).toBe(total);
    });
  });
});
