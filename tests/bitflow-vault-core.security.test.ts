import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Security Tests", () => {
  // ===== TASK 2.1: Reentrancy Protection Tests =====

  describe("reentrancy protection", () => {
    it("Clarity prevents reentrancy by design (no external calls during mutations)", () => {
      // Clarity is a non-Turing-complete language that doesn't support
      // callbacks or delegate calls. Functions execute atomically.
      // This test verifies that operations complete without reentrancy.
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit and immediately withdraw - atomic operations
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet);
      const withdraw = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(5000)], wallet);
      expect(withdraw.result).toBeOk(Cl.bool(true));

      // Balance should be exactly 0 - no re-entrancy could double-spend
      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(0);
    });

    it("deposit state is fully committed before next operation", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Rapid sequence of operations
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], wallet);

      // State should reflect both atomically
      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(5000);
    });

    it("borrow operation is atomic - loan and transfer happen together", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);

      // Loan should exist with correct amount
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeSome(expect.any(Object));
    });

    it("failed operations do not partially modify state", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      // This should fail - insufficient collateral
      const borrowResult = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(borrowResult.result).toBeErr(Cl.uint(105));

      // Deposit should still be intact
      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(1000);

      // No loan should exist
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeNone();
    });
  });

  // ===== TASK 2.2: Integer Overflow Protection Tests =====

  describe("integer overflow protection", () => {
    it("handles large deposit amounts without overflow", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit a very large amount (within STX balance limits)
      const largeAmount = 100_000_000_000; // 100B microSTX = 100K STX
      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(largeAmount)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(largeAmount);
    });

    it("handles large interest calculation without overflow", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Large principal, max rate
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15_000_000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10_000_000), Cl.uint(10000), Cl.uint(365)], wallet);

      simnet.mineEmptyBlocks(52560);

      // Interest = (10_000_000 * 10000 * 52560) / (100 * 52560) = 1_000_000_000
      const repayment = simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(wallet)], wallet);
      expect(repayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(10_000_000),
          interest: Cl.uint(1_000_000_000),
          penalty: Cl.uint(0),
          total: Cl.uint(1_010_000_000),
        })
      );
    });

    it("multiple deposits accumulate correctly without overflow", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const amount = 10_000_000;
      for (let i = 0; i < 5; i++) {
        simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], wallet);
      }

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(50_000_000);
    });
  });

  // ===== TASK 2.3: Access Control Tests =====

  describe("access control", () => {
    it("only contract owner can initialize", () => {
      const accounts = simnet.getAccounts();
      const nonOwner = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "initialize", [], nonOwner);
      expect(result).toBeErr(Cl.uint(109)); // err-owner-only
    });

    it("users cannot access other users' funds via withdraw", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      // Wallet 1 deposits
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1);

      // Wallet 2 tries to withdraw (has no deposit)
      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(5000)], wallet2);
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE

      // Wallet 1's balance unchanged
      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet1)], wallet1);
      expect(balance.result).toBeUint(5000);
    });

    it("user can only repay their own loan", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet1);

      // Wallet 2 tries to repay (has no loan)
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet2);
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN

      // Wallet 1's loan still exists
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet1)], wallet1);
      expect(loan.result).toBeSome(expect.any(Object));
    });

    it("principal verification: each user has separate state", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet1);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], wallet2);

      const b1 = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet1)], wallet1);
      const b2 = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet2)], wallet2);

      expect(b1.result).toBeUint(1000);
      expect(b2.result).toBeUint(2000);
    });
  });

  // ===== TASK 2.4: Double-Spend Prevention Tests =====

  describe("double-spend prevention", () => {
    it("cannot withdraw same funds twice", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      // First withdraw succeeds
      const w1 = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(1000)], wallet);
      expect(w1.result).toBeOk(Cl.bool(true));

      // Second withdraw fails (balance is now 0)
      const w2 = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(1000)], wallet);
      expect(w2.result).toBeErr(Cl.uint(101));
    });

    it("cannot borrow beyond collateral limit", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);

      // Borrow exactly at limit
      const b1 = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(b1.result).toBeOk(Cl.bool(true));

      // Cannot borrow again (already has loan)
      const b2 = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1), Cl.uint(500), Cl.uint(30)], wallet);
      expect(b2.result).toBeErr(Cl.uint(103));
    });

    it("repayment amount cannot be manipulated", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(500), Cl.uint(30)], wallet);

      simnet.mineEmptyBlocks(100);

      // Repay is automatic - user cannot specify custom amount
      // The contract calculates exact repayment
      const repay = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(repay.result).toBeOk(expect.any(Object));

      // Loan should be fully cleared
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeNone();
    });
  });

  // ===== TASK 2.5: Griefing Attack Prevention Tests =====

  describe("griefing attack prevention", () => {
    it("tiny deposits (1 microSTX) do not break protocol", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Make many tiny deposits
      for (let i = 0; i < 10; i++) {
        const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1)], wallet);
        expect(result).toBeOk(Cl.bool(true));
      }

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(10);
    });

    it("dust deposit doesn't cause division by zero", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit 1 microSTX
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1)], wallet);

      // Max borrow should be 0 (1 * 100 / 150 = 0)
      const maxBorrow = simnet.callReadOnlyFn(CONTRACT, "get-max-borrow-amount", [Cl.principal(wallet)], wallet);
      expect(maxBorrow.result).toBeUint(0);
    });

    it("small borrow does not create stuck state", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      // Small borrow with minimum valid rate (50 bps)
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100), Cl.uint(50), Cl.uint(1)], wallet);

      // Should still be able to repay — ceiling division ensures interest >= 1
      const repay = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(repay.result).toBeOk(
        Cl.tuple({ principal: Cl.uint(100), interest: Cl.uint(1), penalty: Cl.uint(0), total: Cl.uint(101) })
      );
    });

    it("zero-value deposit is rejected", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(0)], wallet);
      expect(result).toBeErr(Cl.uint(102)); // ERR-INVALID-AMOUNT
    });
  });

  // ===== TASK 2.6: Front-Running Protection Tests =====

  describe("front-running protection", () => {
    it("liquidation requires actual unhealthy position - cannot fabricate price", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const attacker = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], borrower);

      // Even with manipulated price, the contract's health check is strict
      // At price 100: healthy (200%)
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer);
      const liq1 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], attacker);
      expect(liq1.result).toBeErr(Cl.uint(107));

      // At price 56: health = 112% - still safe
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(56)], deployer);
      const liq2 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], attacker);
      expect(liq2.result).toBeErr(Cl.uint(107));
    });

    it("borrower's collateral is protected from unauthorized liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const attacker = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], borrower);

      // Try to liquidate at various prices - all should fail (300% collateralized)
      for (const price of [100, 90, 80, 70, 60]) {
        // health = 3000*price/100*100/1000 = 3000*price/1000 = 3*price
        // At price 60: health = 180, still above 110
        simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer);
        const liqAttempt = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], attacker);
        if (price > 36) { // health > 110 when price > 36.67
          expect(liqAttempt.result).toBeErr(Cl.uint(107));
        }
      }

      // Borrower collateral untouched
      const deposit = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(borrower)], borrower);
      expect(deposit.result).toBeUint(3000);
    });

    it("loan terms fixed at borrow time, cannot be changed after", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      const startBlock = simnet.blockHeight;
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet);

      simnet.mineEmptyBlocks(100);

      // Loan terms are immutable - verify they haven't changed
      const loan = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loan.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(2000),
          "interest-rate": Cl.uint(500),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(startBlock + 1 + 30 * 144),
        })
      );
    });
  });
});
