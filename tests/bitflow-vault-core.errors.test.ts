import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Comprehensive Error Code Coverage", () => {
  describe("ERR-INSUFFICIENT-BALANCE (u101)", () => {
    it("triggers on withdraw exceeding balance", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(100)], wallet);
      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(200)], wallet);
      expect(result).toBeErr(Cl.uint(101));
    });

    it("triggers on withdraw with no deposits", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(1)], wallet);
      expect(result).toBeErr(Cl.uint(101));
    });
  });

  describe("ERR-INVALID-AMOUNT (u102)", () => {
    it("triggers on zero deposit", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(0)], wallet);
      expect(result).toBeErr(Cl.uint(102));
    });
  });

  describe("ERR-ALREADY-HAS-LOAN (u103)", () => {
    it("triggers on second borrow attempt", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(6000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(500), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(103));
    });
  });

  describe("ERR-INSUFFICIENT-COLLATERAL (u105)", () => {
    it("triggers when deposit < required collateral", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      // Need 1500 collateral for 1000 borrow, only have 1000
      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(105));
    });

    it("triggers with no deposit at all", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(105));
    });
  });

  describe("ERR-NO-ACTIVE-LOAN (u106)", () => {
    it("triggers on repay with no loan", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeErr(Cl.uint(106));
    });

    it("triggers on liquidate with no loan", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const { result } = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet1)], wallet2);
      expect(result).toBeErr(Cl.uint(106));
    });
  });

  describe("ERR-NOT-LIQUIDATABLE (u107)", () => {
    it("triggers when position is healthy", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const borrower = accounts.get("wallet_1")!;
      const liquidator = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], borrower);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], borrower);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer);
      const { result } = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], liquidator);
      expect(result).toBeErr(Cl.uint(107));
    });
  });

  describe("ERR-LIQUIDATE-OWN-LOAN (u108)", () => {
    it("triggers on self-liquidation attempt", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const { result } = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet)], wallet);
      expect(result).toBeErr(Cl.uint(108));
    });
  });

  describe("err-owner-only (u109)", () => {
    it("triggers when non-owner calls initialize", () => {
      const accounts = simnet.getAccounts();
      const nonOwner = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "initialize", [], nonOwner);
      expect(result).toBeErr(Cl.uint(109));
    });
  });

  describe("ERR-INVALID-INTEREST-RATE (u110)", () => {
    it("triggers when interest rate exceeds maximum", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(10001), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(110));
    });
  });

  describe("ERR-INVALID-TERM (u111)", () => {
    it("triggers when term is 0 days", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(500), Cl.uint(0)], wallet);
      expect(result).toBeErr(Cl.uint(111));
    });

    it("triggers when term exceeds 365 days", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(15000)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(10000), Cl.uint(500), Cl.uint(366)], wallet);
      expect(result).toBeErr(Cl.uint(111));
    });
  });

  describe("error handling paths", () => {
    it("multiple error conditions: checks order of validation", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // No deposit, invalid rate, invalid term - which error triggers first?
      // Contract checks: interest-rate first, then term, then existing loan, then collateral
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000), Cl.uint(10001), Cl.uint(0)],
        wallet
      );
      // Interest rate checked first
      expect(result).toBeErr(Cl.uint(110));
    });

    it("term validation comes before collateral check", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Valid rate but invalid term + no collateral
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(1000), Cl.uint(500), Cl.uint(0)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(111));
    });

    it("existing loan check comes before collateral check", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet);

      // Valid params but already has loan
      const { result } = simnet.callPublicFn(
        CONTRACT, "borrow",
        [Cl.uint(500), Cl.uint(500), Cl.uint(30)],
        wallet
      );
      expect(result).toBeErr(Cl.uint(103));
    });
  });
});
