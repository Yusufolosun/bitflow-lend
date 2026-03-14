import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 liquidation security tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const borrower = () => getAccounts().get("wallet_1")!;
  const liquidator = () => getAccounts().get("wallet_2")!;
  const bystander = () => getAccounts().get("wallet_3")!;

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
  const liquidate = (target: string, sender: string) =>
    simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(target)], sender);
  const getUserDeposit = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(user)], deployer());
  const getUserLoan = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(user)], deployer());
  const getProtocolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], deployer());

  const setupBorrower = (depositAmt = 10_000_000, borrowAmt = 5_000_000) => {
    init();
    setPrice(100); // 1 STX = 1 USD (scaled)
    deposit(depositAmt, borrower());
    borrow(borrowAmt, 500, 30, borrower());
  };

  // ── Self-liquidation prevention ──────────────────────────────────
  describe("self-liquidation prevention", () => {
    it("prevents borrower from liquidating themselves", () => {
      setupBorrower();
      // Even if price drops
      setPrice(30);
      const { result } = liquidate(borrower(), borrower());
      expect(result).toBeErr(Cl.uint(108));
    });
  });

  // ── Healthy position protection ──────────────────────────────────
  describe("healthy position protection", () => {
    it("rejects liquidation of healthy position", () => {
      setupBorrower();
      // Price is still 100, position is healthy
      const { result } = liquidate(borrower(), liquidator());
      expect(result).toBeErr(Cl.uint(107)); // ERR-NOT-LIQUIDATABLE
    });
  });

  // ── Price-based liquidation ──────────────────────────────────────
  describe("price-based liquidation", () => {
    it("allows liquidation when price drops below threshold", () => {
      setupBorrower();
      // Drop price to make position undercollateralized
      // 10M deposit, 5M borrow. Health = (10M * price/100 * 100) / 5M
      // At price=50: Health = (10M * 50/100 * 100) / 5M = 100% < 110%
      setPrice(50);
      const { result } = liquidate(borrower(), liquidator());
      expect(result).toBeOk(Cl.tuple({
        "seized-collateral": Cl.uint(10_000_000),
        "paid": Cl.uint(5_250_000), // 5M + 5% bonus
        "bonus": Cl.uint(250_000),
      }));
    });
  });

  // ── Liquidation clears borrower state ────────────────────────────
  describe("liquidation clears borrower state", () => {
    it("zeroes borrower deposit after liquidation", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      const { result } = getUserDeposit(borrower());
      expect(result).toBeUint(0);
    });

    it("deletes borrower loan after liquidation", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      const { result } = getUserLoan(borrower());
      expect(result).toBeNone();
    });
  });

  // ── Double liquidation prevention ────────────────────────────────
  describe("double liquidation prevention", () => {
    it("rejects second liquidation of same borrower", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      const { result } = liquidate(borrower(), bystander());
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });
  });

  // ── Liquidation metrics ──────────────────────────────────────────
  describe("liquidation metrics", () => {
    it("increments total liquidations counter", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      const stats = getProtocolStats();
      expect(stats.result).toHaveTupleProperty("total-liquidations", Cl.uint(1));
    });

    it("decrements outstanding borrows", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      const stats = getProtocolStats();
      expect(stats.result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(0));
    });
  });

  // ── Stale price guard ────────────────────────────────────────────
  describe("stale price guard on liquidation", () => {
    it("rejects liquidation with stale price", () => {
      setupBorrower();
      // Mine blocks to make price stale (MAX-PRICE-AGE = 1008)
      simnet.mineEmptyBlocks(1010);
      const { result } = liquidate(borrower(), liquidator());
      expect(result).toBeErr(Cl.uint(114)); // ERR-STALE-PRICE
    });
  });

  // ── Non-existent borrower ────────────────────────────────────────
  describe("non-existent borrower", () => {
    it("rejects liquidation of user with no loan", () => {
      init();
      setPrice(100);
      const { result } = liquidate(bystander(), liquidator());
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });
  });

  // ── Liquidation toggle guard ─────────────────────────────────────
  describe("liquidation toggle guard", () => {
    it("rejects liquidation when liquidations are disabled", () => {
      setupBorrower();
      setPrice(50);
      simnet.callPublicFn(CONTRACT, "toggle-liquidations-enabled", [Cl.bool(false)], deployer());
      const { result } = liquidate(borrower(), liquidator());
      expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
    });
  });

  // ── Borrower can re-deposit after liquidation ────────────────────
  describe("borrower recovery", () => {
    it("borrower can deposit again after being liquidated", () => {
      setupBorrower();
      setPrice(50);
      liquidate(borrower(), liquidator());

      // Borrower deposits fresh funds
      const { result } = deposit(2_000_000, borrower());
      expect(result).toBeOk(Cl.bool(true));

      const dep = getUserDeposit(borrower());
      expect(dep.result).toBeUint(2_000_000);
    });
  });
});
