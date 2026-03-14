import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("bitflow-vault-core read-only metrics tests", () => {
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

  // ── get-protocol-parameters ─────────────────────────────────────
  describe("get-protocol-parameters", () => {
    it("returns all configurable parameters", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-parameters", [], deployer()
      );
      // Returns (ok { ... }) tuple
      const data = (result as any).value;
      expect(data).toHaveTupleProperty("min-collateral-ratio", Cl.uint(150));
      expect(data).toHaveTupleProperty("min-interest-rate", Cl.uint(50));
      expect(data).toHaveTupleProperty("min-term-days", Cl.uint(1));
      expect(data).toHaveTupleProperty("late-penalty-rate", Cl.uint(500));
    });

    it("reflects changes after admin updates", () => {
      setup();
      simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(200)], deployer()
      );
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-parameters", [], deployer()
      );
      const data = (result as any).value;
      expect(data).toHaveTupleProperty("min-collateral-ratio", Cl.uint(200));
    });
  });

  // ── get-protocol-metrics ────────────────────────────────────────
  describe("get-protocol-metrics", () => {
    it("returns zero counts initially", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("total-deposits", Cl.uint(0));
      expect(result).toHaveTupleProperty("total-withdrawals", Cl.uint(0));
      expect(result).toHaveTupleProperty("total-borrows", Cl.uint(0));
      expect(result).toHaveTupleProperty("total-repayments", Cl.uint(0));
      expect(result).toHaveTupleProperty("total-liquidations", Cl.uint(0));
    });

    it("increments deposit count", () => {
      setup();
      deposit(1_000_000, wallet1());
      deposit(2_000_000, wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("total-deposits", Cl.uint(2));
    });

    it("increments borrow and repayment counts", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      repay(wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("total-borrows", Cl.uint(1));
      expect(result).toHaveTupleProperty("total-repayments", Cl.uint(1));
    });
  });

  // ── get-volume-metrics ──────────────────────────────────────────
  describe("get-volume-metrics", () => {
    it("returns zero volumes initially", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-volume-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("deposit-volume", Cl.uint(0));
      expect(result).toHaveTupleProperty("borrow-volume", Cl.uint(0));
      expect(result).toHaveTupleProperty("repay-volume", Cl.uint(0));
      expect(result).toHaveTupleProperty("liquidation-volume", Cl.uint(0));
    });

    it("accumulates deposit volume across transactions", () => {
      setup();
      deposit(3_000_000, wallet1());
      deposit(5_000_000, wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-volume-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("deposit-volume", Cl.uint(8_000_000));
    });

    it("tracks borrow and repay volume", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(2_000_000, 500, 30, wallet1());
      repay(wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-volume-metrics", [], deployer()
      );
      expect(result).toHaveTupleProperty("borrow-volume", Cl.uint(2_000_000));
      const repayVol = (result as any).value?.["repay-volume"]?.value;
      // Repay volume = principal + interest + penalty
      expect(Number(repayVol)).toBeGreaterThanOrEqual(2_000_001);
    });
  });

  // ── get-utilization-ratio ───────────────────────────────────────
  describe("get-utilization-ratio", () => {
    it("returns 0 when no deposits", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-utilization-ratio", [], deployer()
      );
      expect(result).toBeUint(0);
    });

    it("calculates correct utilization", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(4_000_000, 500, 30, wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-utilization-ratio", [], deployer()
      );
      // 4M / 10M * 10000 = 4000 bps
      expect(result).toBeUint(4000);
    });
  });
});
