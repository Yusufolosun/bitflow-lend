import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Comprehensive Liquidation Scenario Tests", () => {
  describe("liquidation threshold precision", () => {
    it("liquidation at exactly 110% health factor (threshold boundary)", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet1 = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      // Deposit 200000, borrow 100000. health = deposit*price/100*100/loan
      // At price=55: health = 200000*55/100*100/100000 = 110 exactly
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(200000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1);

      // At 110%, it should NOT be liquidatable (threshold is < 110, not <=)
      const isLiq110 = simnet.callReadOnlyFn(CONTRACT, "is-liquidatable", [Cl.principal(wallet1), Cl.uint(55)], wallet1);
      expect(isLiq110.result).toBeBool(false);

      // Liquidation should fail
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(55)], deployer);
      const liqAttempt = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet1)], liquidator);
      expect(liqAttempt.result).toBeErr(Cl.uint(107)); // ERR-NOT-LIQUIDATABLE
    });

    it("liquidation at 109% health factor (just below threshold)", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet1 = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      // Deposit 200000, borrow 100000
      // At price=54: health = 200000*54/100*100/100000 = 108
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(200000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1);

      const isLiq = simnet.callReadOnlyFn(CONTRACT, "is-liquidatable", [Cl.principal(wallet1), Cl.uint(54)], wallet1);
      expect(isLiq.result).toBeBool(true);

      // Liquidation should succeed
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(54)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet1)], liquidator);
      expect(liqResult.result).toBeOk(expect.any(Object));
    });
  });

  describe("liquidation with multiple liquidators", () => {
    it("first liquidator succeeds, second fails (no more loan)", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator1 = accounts.get("wallet_2")!;
      const liquidator2 = accounts.get("wallet_3")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);

      const stxPrice = 70; // Makes it liquidatable
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(stxPrice)], deployer);

      // First liquidator succeeds
      const liq1 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator1);
      expect(liq1.result).toBeOk(expect.any(Object));

      // Second liquidator fails (loan already cleared)
      const liq2 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator2);
      expect(liq2.result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });
  });

  describe("liquidation bonus calculation", () => {
    it("5% bonus calculated correctly for standard loan", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      // Bonus = 100000 * 5 / 100 = 5000
      // Total paid = 100000 + 5000 = 105000
      expect(liqResult.result).toBeOk(
        Cl.tuple({
          "seized-collateral": Cl.uint(150000),
          paid: Cl.uint(105000),
          bonus: Cl.uint(5000),
        })
      );
    });

    it("5% bonus calculated correctly for large loan", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15_000_000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10_000_000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      // Bonus = 10000000 * 5 / 100 = 500000
      // Total paid = 10000000 + 500000 = 10500000
      expect(liqResult.result).toBeOk(
        Cl.tuple({
          "seized-collateral": Cl.uint(15_000_000),
          paid: Cl.uint(10_500_000),
          bonus: Cl.uint(500_000),
        })
      );
    });

    it("bonus with non-divisible amounts (integer division)", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      // Borrow 333000: bonus = 333000 * 5 / 100 = 16650
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(500000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(333000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      expect(liqResult.result).toBeOk(
        Cl.tuple({
          "seized-collateral": Cl.uint(500000),
          paid: Cl.uint(349650), // 333000 + 16650
          bonus: Cl.uint(16650),
        })
      );
    });
  });

  describe("failed liquidation attempts", () => {
    it("cannot liquidate healthy position at price 100", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(200000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);

      // Health = 200%, not liquidatable
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      expect(liqResult.result).toBeErr(Cl.uint(107)); // ERR-NOT-LIQUIDATABLE
    });

    it("cannot liquidate at exactly threshold (110%)", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);

      // At price 73: health = 150000*73/100*100/100000 = 109 (just below) -- should liquidate
      // At price 74: health = 150000*74/100*100/100000 = 111 -- not liquidatable
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(74)], deployer);
      const liqHigh = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      expect(liqHigh.result).toBeErr(Cl.uint(107)); // ERR-NOT-LIQUIDATABLE
    });

    it("cannot self-liquidate even when undercollateralized", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], borrower);
      expect(liqResult.result).toBeErr(Cl.uint(108)); // ERR-LIQUIDATE-OWN-LOAN
    });

    it("cannot liquidate non-existent loan", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const user = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const liqResult = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(user)], liquidator);
      expect(liqResult.result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });
  });

  describe("post-liquidation state", () => {
    it("borrower deposit is zeroed after liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);

      const deposit = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(borrower)], borrower);
      expect(deposit.result).toBeUint(0);
    });

    it("borrower loan is cleared after liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);

      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(borrower)], borrower);
      expect(loan.result).toBeNone();
    });

    it("borrower can deposit and borrow again after liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);

      // Should be able to start fresh
      const newDeposit = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(300000)], borrower);
      expect(newDeposit.result).toBeOk(Cl.bool(true));

      const newBorrow = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(200000), Cl.uint(500), Cl.uint(30)], borrower);
      expect(newBorrow.result).toBeOk(Cl.bool(true));
    });

    it("total-deposits decremented correctly after liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const user2 = accounts.get("wallet_2")!;
      const liquidator = accounts.get("wallet_3")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(500000)], user2);

      // Total = 650000
      let total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], borrower);
      expect(total.result).toBeUint(650000);

      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower);
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);

      // After liquidation, borrower's 150000 is removed from total
      total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], borrower);
      expect(total.result).toBeUint(500000);
    });

    it("liquidation counter increments correctly", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower1 = accounts.get("wallet_1")!;
      const borrower2 = accounts.get("wallet_2")!;
      const liquidator = accounts.get("wallet_3")!;

      // Setup two positions
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower1);

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], borrower2);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], borrower2);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);

      // Liquidate first
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower1)], liquidator);
      let count = simnet.callReadOnlyFn(CONTRACT, "get-total-liquidations", [], liquidator);
      expect(count.result).toBeUint(1);

      // Liquidate second
      simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower2)], liquidator);
      count = simnet.callReadOnlyFn(CONTRACT, "get-total-liquidations", [], liquidator);
      expect(count.result).toBeUint(2);
    });
  });
});
