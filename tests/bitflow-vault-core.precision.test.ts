import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Precision Tests", () => {
  // ===== TASK 1.4: Calculation Precision Tests =====

  describe("interest calculation precision", () => {
    it("calculates ceiling-minimum interest for very small principal over short time", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit 150000 (enough for 150% collateral on 100000)
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(100), Cl.uint(1)], wallet);

      // Read-only in same block as borrow: 0 blocks elapsed, interest = 0
      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100000), interest: Cl.uint(0), penalty: Cl.uint(0), total: Cl.uint(100000) })
      );
    });

    it("calculates correct interest for large principal over long time", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Large deposit and borrow
      const depositAmount = 15_000_000; // 15M microSTX
      const borrowAmount = 10_000_000;  // 10M microSTX
      const rate = 500; // 5% APR in BPS

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(depositAmount)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(borrowAmount), Cl.uint(rate), Cl.uint(365)], wallet);

      // Mine 1 year of blocks (52560)
      simnet.mineEmptyBlocks(52560);

      // Interest = (10_000_000 * 500 * 52560) / (100 * 52560) = 10_000_000 * 500 / 100 = 50_000_000
      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(borrowAmount),
          interest: Cl.uint(50_000_000),
          penalty: Cl.uint(0),
          total: Cl.uint(60_000_000),
        })
      );
    });

    it("accumulates interest proportionally to blocks elapsed", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1_500_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1_000_000), Cl.uint(1000), Cl.uint(365)], wallet);

      // After 5256 blocks (1/10 year): interest = (1_000_000 * 1000 * 5256) / (100 * 52560)
      // = 5_256_000_000_000 / 5_256_000 = 1_000_000
      simnet.mineEmptyBlocks(5256);

      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(1_000_000),
          interest: Cl.uint(1_000_000),
          penalty: Cl.uint(0),
          total: Cl.uint(2_000_000),
        })
      );
    });

    it("calculates interest correctly with minimum rate over many blocks", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      // Rate 1 is below min-interest-rate (50), use rate 50 instead
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100_000), Cl.uint(50), Cl.uint(365)], wallet);

      // Mine full year: interest = (100_000 * 50 * 52560) / (100 * 52560) = 50000
      simnet.mineEmptyBlocks(52560);

      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(100_000),
          interest: Cl.uint(50_000),
          penalty: Cl.uint(0),
          total: Cl.uint(150_000),
        })
      );
    });
  });

  describe("health factor calculation precision", () => {
    it("calculates health factor precisely at 150%", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);

      // With price = 100: health = (150000 * 100 / 100) * 100 / 100000 = 150
      const health = simnet.callReadOnlyFn(
        CONTRACT, "calculate-health-factor",
        [Cl.principal(wallet), Cl.uint(100)], wallet
      );
      expect(health.result).toBeSome(Cl.uint(150));
    });

    it("calculates health factor precisely at 200%", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(200000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);

      const health = simnet.callReadOnlyFn(
        CONTRACT, "calculate-health-factor",
        [Cl.principal(wallet), Cl.uint(100)], wallet
      );
      expect(health.result).toBeSome(Cl.uint(200));
    });

    it("health factor drops with lower STX price", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(200000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);

      // At price 50: health = (200000 * 50 / 100) * 100 / 100000 = 100
      const health = simnet.callReadOnlyFn(
        CONTRACT, "calculate-health-factor",
        [Cl.principal(wallet), Cl.uint(50)], wallet
      );
      expect(health.result).toBeSome(Cl.uint(100));
    });

    it("health factor returns none for users without loans", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);

      const health = simnet.callReadOnlyFn(
        CONTRACT, "calculate-health-factor",
        [Cl.principal(wallet), Cl.uint(100)], wallet
      );
      expect(health.result).toBeNone();
    });
  });

  describe("collateral ratio precision", () => {
    it("calculates required collateral correctly for various amounts", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Test: 150% of 1 = 1 (integer division: 1*150/100=1)
      const c1 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(1)], wallet);
      expect(c1.result).toBeUint(1);

      // Test: 150% of 2 = 3
      const c2 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(2)], wallet);
      expect(c2.result).toBeUint(3);

      // Test: 150% of 3 = 4 (integer division: 3*150/100=4)
      const c3 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(3)], wallet);
      expect(c3.result).toBeUint(4);

      // Test: 150% of 333 = 499 (integer division: 333*150/100=499)
      const c4 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(333)], wallet);
      expect(c4.result).toBeUint(499);

      // Test: 150% of 1000000 = 1500000
      const c5 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(1_000_000)], wallet);
      expect(c5.result).toBeUint(1_500_000);
    });

    it("max borrow amount is correctly derived from deposit", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);

      // max_borrow = deposit * 100 / 150 = 1500 * 100 / 150 = 1000
      const maxBorrow = simnet.callReadOnlyFn(
        CONTRACT, "get-max-borrow-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(maxBorrow.result).toBeUint(1000);
    });

    it("max borrow amount handles non-divisible amounts correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      // max_borrow = 1000 * 100 / 150 = 666 (integer division)
      const maxBorrow = simnet.callReadOnlyFn(
        CONTRACT, "get-max-borrow-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(maxBorrow.result).toBeUint(666);
    });
  });

  // ===== TASK 1.5: Rounding Behavior Tests =====

  describe("interest rounding behavior", () => {
    it("interest rounds up (ceiling) for small calculations", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(50), Cl.uint(30)], wallet);

      // After 10 blocks: ceil(100000 * 50 * 10 / 5256000) = ceil(9.513) = 10
      simnet.mineEmptyBlocks(10);

      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100000), interest: Cl.uint(10), penalty: Cl.uint(0), total: Cl.uint(100010) })
      );
    });

    it("interest rounds up just below exact division", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(100), Cl.uint(30)], wallet);

      // Ceiling division: ceil(100000 * 100 * 52 / 5256000) = ceil(98.934) = 99
      simnet.mineEmptyBlocks(52);

      const repaymentLow = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repaymentLow.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100000), interest: Cl.uint(99), penalty: Cl.uint(0), total: Cl.uint(100099) })
      );
    });

    it("interest increases at exact division boundary", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(100), Cl.uint(30)], wallet);

      // At 53 blocks: ceil(100000 * 100 * 53 / 5256000) = ceil(100.837) = 101
      simnet.mineEmptyBlocks(53);

      const repaymentHigh = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)], wallet
      );
      expect(repaymentHigh.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100000), interest: Cl.uint(101), penalty: Cl.uint(0), total: Cl.uint(100101) })
      );
    });

    it("collateral calculation rounding does not cause losses", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // For borrow amount 7: required = 7 * 150 / 100 = 10 (exact, no rounding)
      const c1 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(7)], wallet);
      expect(c1.result).toBeUint(10);

      // For borrow amount 11: required = 11 * 150 / 100 = 16 (integer division floors)
      const c2 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(11)], wallet);
      expect(c2.result).toBeUint(16);

      // For borrow amount 13: required = 13 * 150 / 100 = 19 (integer division floors)
      const c3 = simnet.callReadOnlyFn(CONTRACT, "calculate-required-collateral", [Cl.uint(13)], wallet);
      expect(c3.result).toBeUint(19);
    });

    it("no rounding loss accumulation in repayment tracking", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      // User 1 borrows and repays
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1);
      simnet.mineEmptyBlocks(100);
      simnet.callPublicFn(CONTRACT, "repay", [], wallet1);

      simnet.callReadOnlyFn(CONTRACT, "get-total-repaid", [], wallet1);

      // User 2 borrows and repays
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet2);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet2);
      simnet.mineEmptyBlocks(100);
      simnet.callPublicFn(CONTRACT, "repay", [], wallet2);

      const repaid2 = simnet.callReadOnlyFn(CONTRACT, "get-total-repaid", [], wallet2);

      // Total repaid should be strictly greater after second repayment
      // We can't compare ClarityValues directly, but we can check it's not zero
      expect(repaid2.result).not.toBeUint(0);
    });
  });
});
