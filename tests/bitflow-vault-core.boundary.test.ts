import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Boundary Value Tests", () => {
  // ===== TASK 1.1: Minimum & Maximum Boundary Tests =====

  describe("deposit boundaries", () => {
    it("allows deposit of minimum amount (1 microSTX)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(1);
    });

    it("allows deposit of very large amount", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit 1 billion microSTX (1000 STX)
      const largeAmount = 1_000_000_000;
      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(largeAmount)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(balance.result).toBeUint(largeAmount);
    });
  });

  describe("borrow boundaries", () => {
    it("allows borrow at exact 150% collateral ratio", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit 150000, borrow exactly 100000 (150% ratio)
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
        wallet
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects borrow at 149% collateral ratio", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Deposit 149000, try to borrow 100000 (149% ratio)
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(149000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(105)); // ERR-INSUFFICIENT-COLLATERAL
    });

    it("allows borrow with minimum interest rate (50 BPS)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000000), Cl.uint(50), Cl.uint(30)],
        wallet
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows borrow with maximum interest rate (10000 BPS = 100%)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000000), Cl.uint(10000), Cl.uint(30)],
        wallet
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows borrow with minimum term (1 day)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000000), Cl.uint(500), Cl.uint(1)],
        wallet
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows borrow with maximum term (365 days)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000000), Cl.uint(500), Cl.uint(365)],
        wallet
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("repay immediately after borrow (same block, ceiling interest)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);

      // Repay in the next block (1 block elapsed)
      // ceiling(100000 * 500 * 1 / 5256000) = ceiling(9.51) = 10
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeOk(
        Cl.tuple({
          interest: Cl.uint(10),
          penalty: Cl.uint(0),
          principal: Cl.uint(100000),
          total: Cl.uint(100010),
        })
      );
    });
  });

  // ===== TASK 1.2: Zero Value Tests =====

  describe("zero value validation", () => {
    it("rejects deposit of 0 STX", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(0)], wallet);
      expect(result).toBeErr(Cl.uint(102)); // ERR-INVALID-AMOUNT
    });

    it("rejects withdraw when balance is zero", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // No deposit made — try to withdraw
      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(100)], wallet);
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });

    it("rejects borrow of 0 amount", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(0), Cl.uint(500), Cl.uint(30)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(102)); // ERR-INVALID-AMOUNT
    });
  });

  // ===== TASK 1.3: Maximum Value Tests =====

  describe("maximum value handling", () => {
    it("rejects interest rate above maximum (10001 BPS)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100000), Cl.uint(10001), Cl.uint(30)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(110)); // ERR-INVALID-INTEREST-RATE
    });

    it("rejects term above maximum (366 days)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100000), Cl.uint(500), Cl.uint(366)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(111)); // ERR-INVALID-TERM
    });

    it("rejects term of 0 days", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet);
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100000), Cl.uint(500), Cl.uint(0)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(111)); // ERR-INVALID-TERM
    });

    it("calculates interest correctly for maximum term at max rate", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150_000)], wallet);
      simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(100_000), Cl.uint(10000), Cl.uint(365)],
        wallet
      );

      // Mine 365 days worth of blocks
      simnet.mineEmptyBlocks(52560);

      const repayment = simnet.callReadOnlyFn(
        CONTRACT, "get-repayment-amount",
        [Cl.principal(wallet)],
        wallet
      );
      // Interest formula: (principal * rate * blocks) / (100 * 52560)
      // = (100000 * 10000 * 52560) / (100 * 52560)
      // = 100000 * 10000 / 100 = 10,000,000
      // rate=10000 means 10000% annual (the divisor is 100, not 10000)
      expect(repayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(100_000),
          interest: Cl.uint(10_000_000),
          penalty: Cl.uint(0),
          total: Cl.uint(10_100_000),
        })
      );
    });
  });
});
