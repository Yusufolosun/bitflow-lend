import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 migration export tests", () => {
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

  // ── User position export ────────────────────────────────────────
  describe("user position export", () => {
    it("exports deposit-only user", () => {
      setup();
      deposit(8_000_000, wallet1());

      const { result } = exportUser(wallet1());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(8_000_000));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
    });

    it("exports borrower with loan details", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());

      const { result } = exportUser(wallet1());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(10_000_000));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(true));

      const loan = (result as any).data?.loan;
      expect(loan).toHaveTupleProperty("amount", Cl.uint(2_000_000));
      expect(loan).toHaveTupleProperty("interest-rate", Cl.uint(500));
    });

    it("includes created-at-price in v2 loan export", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());

      const { result } = exportUser(wallet1());
      const loan = (result as any).data?.loan;
      expect(loan).toHaveTupleProperty("created-at-price", Cl.uint(100));
    });

    it("exports zero state for unknown user", () => {
      setup();
      const { result } = exportUser(wallet2());
      expect(result).toHaveTupleProperty("deposit", Cl.uint(0));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
    });

    it("includes exported-at-block timestamp", () => {
      setup();
      const { result } = exportUser(wallet1());
      const block = (result as any).data?.["exported-at-block"]?.value;
      expect(Number(block)).toBeGreaterThan(0);
    });
  });

  // ── Protocol state export ───────────────────────────────────────
  describe("protocol state export", () => {
    it("exports total deposits across users", () => {
      setup();
      deposit(3_000_000, wallet1());
      deposit(7_000_000, wallet2());

      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("total-deposits", Cl.uint(10_000_000));
    });

    it("exports outstanding borrows", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(3_000_000));
    });

    it("exports price and pause state", () => {
      setup();
      const { result } = exportProtocol();
      expect(result).toHaveTupleProperty("stx-price", Cl.uint(100));
      expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
    });

    it("includes protocol-start-block", () => {
      setup();
      const { result } = exportProtocol();
      const block = (result as any).data?.["protocol-start-block"]?.value;
      expect(Number(block)).toBeGreaterThan(0);
    });
  });

  // ── Cross-export consistency ────────────────────────────────────
  describe("cross-export consistency", () => {
    it("user deposits sum matches protocol total", () => {
      setup();
      deposit(4_000_000, wallet1());
      deposit(6_000_000, wallet2());

      const u1 = exportUser(wallet1());
      const u2 = exportUser(wallet2());
      const proto = exportProtocol();

      const d1 = Number((u1.result as any).data?.deposit?.value);
      const d2 = Number((u2.result as any).data?.deposit?.value);
      const total = Number((proto.result as any).data?.["total-deposits"]?.value);

      expect(d1 + d2).toBe(total);
    });

    it("user loan sum matches protocol outstanding borrows", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const u1 = exportUser(wallet1());
      const proto = exportProtocol();

      const loanAmt = Number((u1.result as any).data?.loan?.data?.amount?.value);
      const outstanding = Number((proto.result as any).data?.["total-outstanding-borrows"]?.value);

      expect(loanAmt).toBe(outstanding);
    });
  });
});
