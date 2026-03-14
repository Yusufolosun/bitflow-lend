import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("bitflow-vault-core user-position-summary tests", () => {
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
  const getPositionSummary = (user: string, price: number) =>
    simnet.callReadOnlyFn(
      CONTRACT, "get-user-position-summary",
      [Cl.principal(user), Cl.uint(price)], deployer()
    );

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Deposit-only user ───────────────────────────────────────────
  describe("deposit-only user", () => {
    it("shows deposit amount and no loan", () => {
      setup();
      deposit(5_000_000, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      expect(result).toHaveTupleProperty("deposit-amount", Cl.uint(5_000_000));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
      expect(result).toHaveTupleProperty("loan-amount", Cl.uint(0));
    });

    it("reports not liquidatable without loan", () => {
      setup();
      deposit(5_000_000, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      expect(result).toHaveTupleProperty("is-liquidatable", Cl.bool(false));
    });

    it("reports max borrow available based on collateral", () => {
      setup();
      deposit(10_000_000, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      // max borrow = deposit * 100 / 150 = 6,666,666
      const maxBorrow = (result as any).data?.["max-borrow-available"]?.value;
      expect(Number(maxBorrow)).toBe(6666666);
    });
  });

  // ── Borrower ────────────────────────────────────────────────────
  describe("active borrower", () => {
    it("shows loan details", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(true));
      expect(result).toHaveTupleProperty("loan-amount", Cl.uint(3_000_000));
      expect(result).toHaveTupleProperty("loan-interest-rate", Cl.uint(500));
    });

    it("includes health factor", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      // health = (deposit * price / 100) * 100 / loan
      // = (10M * 100 / 100) * 100 / 3M = 10M * 100 / 3M = 333
      const healthFactor = (result as any).data?.["health-factor"]?.value;
      expect(Number(healthFactor)).toBe(333);
    });

    it("reports collateral usage percent", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      // usage = loan * 100 / deposit = 3M * 100 / 10M = 30
      expect(result).toHaveTupleProperty("collateral-usage-percent", Cl.uint(30));
    });
  });

  // ── Non-user (no deposit) ───────────────────────────────────────
  describe("non-user", () => {
    it("returns zero state", () => {
      setup();

      const { result } = getPositionSummary(wallet2(), 100);
      expect(result).toHaveTupleProperty("deposit-amount", Cl.uint(0));
      expect(result).toHaveTupleProperty("has-loan", Cl.bool(false));
      expect(result).toHaveTupleProperty("max-borrow-available", Cl.uint(0));
      expect(result).toHaveTupleProperty("collateral-usage-percent", Cl.uint(0));
    });
  });

  // ── Liquidatable position ───────────────────────────────────────
  describe("liquidatable position", () => {
    it("detects undercollateralized position", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(5_000_000, 500, 30, wallet1());

      // Drop price to make undercollateralized
      const { result } = getPositionSummary(wallet1(), 50);
      expect(result).toHaveTupleProperty("is-liquidatable", Cl.bool(true));
    });

    it("healthy position is not liquidatable", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(3_000_000, 500, 30, wallet1());

      const { result } = getPositionSummary(wallet1(), 100);
      expect(result).toHaveTupleProperty("is-liquidatable", Cl.bool(false));
    });
  });
});
