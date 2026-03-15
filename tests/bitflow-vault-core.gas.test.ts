import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Gas Consumption and Limit Tests", () => {
  describe("function execution within gas limits", () => {
    it("deposit completes within gas limits", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Simple deposit should complete successfully (no gas issues)
      const { result, events } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);
      expect(result).toBeOk(Cl.bool(true));
      // Should have at least 1 STX transfer event
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("withdraw completes within gas limits", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);
      const { result, events } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(500)], wallet);
      expect(result).toBeOk(Cl.bool(true));
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("borrow completes within gas limits", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      const { result, events } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeOk(Cl.bool(true));
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("repay completes within gas limits", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);
      simnet.mineEmptyBlocks(100);

      const { result, events } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeOk(expect.any(Object));
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it("liquidate completes within gas limits", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const { result, events } = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      expect(result).toBeOk(expect.any(Object));
      // Liquidation involves multiple STX transfers
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("read-only function efficiency", () => {
    it("get-user-deposit executes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet);

      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(result).toBeUint(5000);
    });

    it("get-protocol-stats executes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], wallet);
      expect(result).toBeTuple({
        "total-deposits": expect.any(Object),
        "total-repaid": expect.any(Object),
        "total-liquidations": expect.any(Object),
        "total-outstanding-borrows": expect.any(Object),
      });
    });

    it("get-protocol-metrics executes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-protocol-metrics", [], wallet);
      expect(result).toBeTuple({
        "total-deposits": expect.any(Object),
        "total-withdrawals": expect.any(Object),
        "total-borrows": expect.any(Object),
        "total-repayments": expect.any(Object),
        "total-liquidations": expect.any(Object),
      });
    });

    it("get-volume-metrics executes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-volume-metrics", [], wallet);
      expect(result).toBeTuple({
        "deposit-volume": expect.any(Object),
        "borrow-volume": expect.any(Object),
        "repay-volume": expect.any(Object),
        "liquidation-volume": expect.any(Object),
      });
    });

    it("calculate-health-factor executes efficiently with active loan", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);

      const { result } = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(100)], wallet);
      expect(result).toBeSome(Cl.uint(150));
    });

    it("get-user-position-summary executes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);

      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-user-position-summary", [Cl.principal(wallet), Cl.uint(100)], wallet);
      expect(result).toBeTuple({
        "deposit-amount": Cl.uint(3000),
        "has-loan": Cl.bool(true),
        "loan-amount": Cl.uint(2000),
        "loan-interest-rate": Cl.uint(500),
        "loan-term-end": expect.any(Object),
        "health-factor": expect.any(Object),
        "is-liquidatable": Cl.bool(false),
        "max-borrow-available": expect.any(Object),
        "collateral-usage-percent": expect.any(Object),
      });
    });
  });

  describe("repeated operations gas efficiency", () => {
    it("10 sequential deposits complete efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      for (let i = 0; i < 10; i++) {
        const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(100)], wallet);
        expect(result).toBeOk(Cl.bool(true));
      }

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(1000);
    });

    it("borrow-repay cycle completes efficiently", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);

      for (let i = 0; i < 3; i++) {
        const borrow = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);
        expect(borrow.result).toBeOk(Cl.bool(true));

        const repay = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
        expect(repay.result).toBeOk(expect.any(Object));
      }
    });
  });
});
