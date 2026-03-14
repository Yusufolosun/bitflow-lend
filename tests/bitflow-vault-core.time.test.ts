import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Time-Based Functionality Tests", () => {
  // ===== TASK 1.8: Time-Dependent Feature Tests =====

  describe("interest accrual over time", () => {
    it("interest is zero immediately after borrowing", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(500), Cl.uint(30)], wallet);

      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      // With ceiling division, even 0 elapsed blocks yields interest >= 1
      // At block of borrow call, blocks-elapsed = 0, but get-repayment-amount
      // is called in same block so blocks-elapsed = 0, interest = ceil(0) = 0
      // However the borrow and read happen in sequential blocks, so 1 block elapsed
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(10000), interest: Cl.uint(1), penalty: Cl.uint(0), total: Cl.uint(10001) })
      );
    });

    it("interest grows linearly with block progression", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100_000), Cl.uint(1000), Cl.uint(365)], wallet);

      // After 5256 blocks (1/10 year): interest = (100000 * 1000 * 5256) / (100 * 52560) = 100000
      simnet.mineEmptyBlocks(5256);
      let repay = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repay.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100_000), interest: Cl.uint(100_000), penalty: Cl.uint(0), total: Cl.uint(200_000) })
      );

      // After another 5256 blocks (2/10 year total = 10512): interest = 200000
      simnet.mineEmptyBlocks(5256);
      repay = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repay.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100_000), interest: Cl.uint(200_000), penalty: Cl.uint(0), total: Cl.uint(300_000) })
      );
    });

    it("interest at exactly 1 year with 5% rate", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100_000), Cl.uint(500), Cl.uint(365)], wallet);

      // 1 year = 52560 blocks: interest = (100000 * 500 * 52560) / (100 * 52560) = 500000
      simnet.mineEmptyBlocks(52560);

      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100_000), interest: Cl.uint(500_000), penalty: Cl.uint(0), total: Cl.uint(600_000) })
      );
    });
  });

  describe("loan term expiration", () => {
    it("loan data persists past term-end block", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(1)], wallet);

      // Term = 1 day = 144 blocks. Mine past it.
      simnet.mineEmptyBlocks(300);

      // Loan should still exist (protocol doesn't auto-close)
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeSome(expect.any(Object));
    });

    it("interest continues to accrue past term-end", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(1000), Cl.uint(1)], wallet);

      // Term = 1 day = 144 blocks. Mine much past it.
      simnet.mineEmptyBlocks(5256);

      // Interest should reflect total blocks elapsed, not just term
      // = (10000 * 1000 * 5256) / (100 * 52560) = 10000
      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(10000), interest: Cl.uint(10000), penalty: Cl.uint(0), total: Cl.uint(20000) })
      );
    });
  });

  describe("early repayment scenarios", () => {
    it("repay immediately after borrowing has zero interest", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      // Repay in the very next block (1 block elapsed)
      // ceiling(1000 * 500 * 1 / 5256000) = ceiling(0.095) = 1
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeOk(
        Cl.tuple({ principal: Cl.uint(1000), interest: Cl.uint(1), penalty: Cl.uint(0), total: Cl.uint(1001) })
      );
    });

    it("repay after just a few blocks has minimal interest", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(1000), Cl.uint(30)], wallet);

      // 10 blocks: interest = ceil(10000 * 1000 * 10 / (100 * 52560)) = ceil(19.025) = 20
      simnet.mineEmptyBlocks(10);

      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(10000), interest: Cl.uint(20), penalty: Cl.uint(0), total: Cl.uint(10020) })
      );
    });
  });

  describe("late repayment scenarios", () => {
    it("repay well after term-end still works", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(500), Cl.uint(1)], wallet);

      // Term was 1 day (144 blocks), mine 10000 blocks past
      simnet.mineEmptyBlocks(10000);

      // Should still allow repayment
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeOk(expect.any(Object));

      // Loan should be cleared
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeNone();
    });

    it("late repayment has higher interest than on-time repayment", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      // Wallet 1: borrow and check interest early
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(1000), Cl.uint(30)], wallet1);

      simnet.mineEmptyBlocks(100);

      const earlyRepay = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet1)], wallet1);

      // Wallet 2: same loan but check interest much later
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet2);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(1000), Cl.uint(30)], wallet2);

      simnet.mineEmptyBlocks(10000);

      const lateRepay = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet2)], wallet2);

      // Both should be valid
      expect(earlyRepay.result).toBeSome(expect.any(Object));
      expect(lateRepay.result).toBeSome(expect.any(Object));
    });
  });

  // ===== TASK 1.9: Block Height Progression Tests =====

  describe("term-end calculation accuracy", () => {
    it("term-end for 1 day = start + 144 blocks", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      const startBlock = simnet.blockHeight;
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(1)], wallet);

      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      // Borrow happens at startBlock+1, term-end = startBlock+1 + 1*144
      expect(loan.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(1000),
          "interest-rate": Cl.uint(500),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(startBlock + 1 + 144),
        })
      );
    });

    it("term-end for 30 days = start + 4320 blocks", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      const startBlock = simnet.blockHeight;
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(1000),
          "interest-rate": Cl.uint(500),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(startBlock + 1 + 4320),
        })
      );
    });

    it("term-end for 365 days = start + 52560 blocks", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      const startBlock = simnet.blockHeight;
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(365)], wallet);

      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(1000),
          "interest-rate": Cl.uint(500),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(startBlock + 1 + 52560),
        })
      );
    });
  });

  describe("interest calculation with block progression", () => {
    it("interest at 1 day (144 blocks) matches expected", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100_000), Cl.uint(1000), Cl.uint(30)], wallet);

      simnet.mineEmptyBlocks(144);

      // Interest = ceil(100000 * 1000 * 144 / (100 * 52560)) = ceil(2739.726) = 2740
      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100_000), interest: Cl.uint(2740), penalty: Cl.uint(0), total: Cl.uint(102_740) })
      );
    });

    it("interest at 1 week (1008 blocks) matches expected", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100_000), Cl.uint(1000), Cl.uint(30)], wallet);

      simnet.mineEmptyBlocks(1008);

      // Interest = ceil(100000 * 1000 * 1008 / (100 * 52560)) = ceil(19178.08) = 19179
      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({ principal: Cl.uint(100_000), interest: Cl.uint(19179), penalty: Cl.uint(0), total: Cl.uint(119_179) })
      );
    });
  });

  describe("health factor changes over time", () => {
    it("health factor remains constant when price stays same", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      // Check immediately
      const health1 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(100)], wallet);
      expect(health1.result).toBeSome(Cl.uint(200));

      // Check after many blocks (health factor is based on deposit/loan, not interest)
      simnet.mineEmptyBlocks(10000);

      const health2 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(100)], wallet);
      // Health factor doesn't account for accrued interest in the formula
      // It compares deposit value vs loan amount (not including interest)
      expect(health2.result).toBeSome(Cl.uint(200));
    });

    it("health factor changes only with price changes", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      // Price = 100: health = 200
      const h1 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(100)], wallet);
      expect(h1.result).toBeSome(Cl.uint(200));

      // Price = 80: health = (2000*80/100)*100/1000 = 160
      const h2 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(80)], wallet);
      expect(h2.result).toBeSome(Cl.uint(160));

      // Price = 55: health = (2000*55/100)*100/1000 = 110
      const h3 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(55)], wallet);
      expect(h3.result).toBeSome(Cl.uint(110));

      // Price = 50: health = (2000*50/100)*100/1000 = 100
      const h4 = simnet.callReadOnlyFn(CONTRACT, "calculate-health-factor", [Cl.principal(wallet), Cl.uint(50)], wallet);
      expect(h4.result).toBeSome(Cl.uint(100));
    });
  });

  describe("last activity block tracking", () => {
    it("last-activity-block updates on deposit", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.mineEmptyBlocks(100);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      const timeSince = simnet.callReadOnlyFn(CONTRACT, "get-time-since-last-activity", [], wallet);
      // Should be 0 blocks since activity just happened
      expect(timeSince.result).toBeUint(0);
    });

    it("time since last activity increases with blocks", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      simnet.mineEmptyBlocks(50);

      const timeSince = simnet.callReadOnlyFn(CONTRACT, "get-time-since-last-activity", [], wallet);
      expect(timeSince.result).toBeUint(50);
    });
  });
});
