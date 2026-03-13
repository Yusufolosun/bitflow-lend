import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 boundary tests", () => {
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
  const liquidate = (borrower: string, sender: string) =>
    simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(borrower)], sender);
  const pause = () =>
    simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
  const unpause = () =>
    simnet.callPublicFn(CONTRACT, "unpause-protocol", [], deployer());

  const setup = (price = 100) => {
    init();
    setPrice(price);
  };

  // ── Zero-amount guards ───────────────────────────────────────────
  describe("zero-amount guards", () => {
    it("rejects deposit of 0", () => {
      setup();
      const { result } = deposit(0, wallet1());
      expect(result).toBeErr(Cl.uint(119)); // ERR-ZERO-AMOUNT
    });

    it("rejects withdraw of 0", () => {
      setup();
      deposit(1_000_000, wallet1());
      const { result } = withdraw(0, wallet1());
      expect(result).toBeErr(Cl.uint(119));
    });

    it("rejects borrow of 0", () => {
      setup();
      deposit(1_000_000, wallet1());
      const { result } = borrow(0, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(119));
    });
  });

  // ── Deposit boundary ─────────────────────────────────────────────
  describe("deposit boundary", () => {
    it("accepts minimum deposit of 1 microSTX", () => {
      setup();
      const { result } = deposit(1, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects deposit exceeding per-user limit", () => {
      setup();
      // DEPOSIT-LIMIT is 10M STX = 10_000_000_000_000 microSTX
      const { result } = deposit(10_000_000_000_001, wallet1());
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });
  });

  // ── Borrow boundaries ────────────────────────────────────────────
  describe("borrow boundaries", () => {
    it("rejects borrow below minimum (100_000 microSTX)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(99_999, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(115)); // ERR-MIN-BORROW-AMOUNT
    });

    it("accepts borrow at exact minimum", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(100_000, 500, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects borrow above maximum", () => {
      setup();
      // MAX-BORROW-AMOUNT is 500K STX = 500_000_000_000 microSTX
      // Need enough collateral first
      deposit(1_000_000_000_000, wallet1());
      const { result } = borrow(500_000_000_001, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(116)); // ERR-MAX-BORROW-EXCEEDED
    });
  });

  // ── Interest rate boundaries ─────────────────────────────────────
  describe("interest rate boundaries", () => {
    it("rejects rate below minimum (50 bps)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 49, 30, wallet1());
      expect(result).toBeErr(Cl.uint(110)); // ERR-INVALID-INTEREST-RATE
    });

    it("accepts rate at minimum boundary (50 bps)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 50, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects rate above maximum (10000 bps)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 10001, 30, wallet1());
      expect(result).toBeErr(Cl.uint(110));
    });

    it("accepts rate at maximum boundary (10000 bps)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 10000, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Term boundaries ──────────────────────────────────────────────
  describe("term boundaries", () => {
    it("rejects term below minimum (0 days)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 500, 0, wallet1());
      expect(result).toBeErr(Cl.uint(111)); // ERR-INVALID-TERM
    });

    it("accepts term at minimum (1 day)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 500, 1, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects term above maximum (366 days)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 500, 366, wallet1());
      expect(result).toBeErr(Cl.uint(111));
    });

    it("accepts term at maximum (365 days)", () => {
      setup();
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 500, 365, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Stale price guard ────────────────────────────────────────────
  describe("stale price guard", () => {
    it("rejects borrow when price not set", () => {
      init(); // no setPrice
      deposit(10_000_000, wallet1());
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(114)); // ERR-STALE-PRICE
    });

    it("rejects liquidation when price not set", () => {
      init();
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(114)); // ERR-STALE-PRICE
    });
  });

  // ── Pause guards ─────────────────────────────────────────────────
  describe("pause guards", () => {
    it("rejects deposit when paused", () => {
      setup();
      pause();
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
    });

    it("rejects withdraw when paused", () => {
      setup();
      deposit(1_000_000, wallet1());
      pause();
      const { result } = withdraw(500_000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects borrow when paused", () => {
      setup();
      deposit(10_000_000, wallet1());
      pause();
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects repay when paused", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      pause();
      const { result } = repay(wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("resumes after unpause", () => {
      setup();
      pause();
      unpause();
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Per-function toggle guards ───────────────────────────────────
  describe("per-function toggle guards", () => {
    it("rejects deposit when deposits disabled", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], deployer());
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects borrow when borrows disabled", () => {
      setup();
      deposit(10_000_000, wallet1());
      simnet.callPublicFn(CONTRACT, "toggle-borrows-enabled", [Cl.bool(false)], deployer());
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects withdraw when withdrawals disabled", () => {
      setup();
      deposit(1_000_000, wallet1());
      simnet.callPublicFn(CONTRACT, "toggle-withdrawals-enabled", [Cl.bool(false)], deployer());
      const { result } = withdraw(500_000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });
  });

  // ── Self-liquidation guard ───────────────────────────────────────
  describe("self-liquidation guard", () => {
    it("prevents liquidating own loan", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      const { result } = liquidate(wallet1(), wallet1());
      expect(result).toBeErr(Cl.uint(108)); // ERR-LIQUIDATE-OWN-LOAN
    });
  });

  // ── One-loan-per-user guard ──────────────────────────────────────
  describe("one-loan-per-user guard", () => {
    it("rejects second borrow from same user", () => {
      setup();
      deposit(50_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-HAS-LOAN
    });
  });

  // ── Admin parameter bounds ───────────────────────────────────────
  describe("admin parameter bounds", () => {
    it("rejects collateral ratio below 100%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(99)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120)); // ERR-INVALID-PARAM
    });

    it("rejects collateral ratio above 500%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(501)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects late penalty above 20%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate", [Cl.uint(2001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects non-owner admin calls", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(100)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109)); // ERR-OWNER-ONLY
    });

    it("rejects zero price", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(0)], deployer()
      );
      expect(result).toBeErr(Cl.uint(117)); // ERR-INVALID-PRICE
    });

    it("rejects price above sanity cap", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(100_000_000)], deployer()
      );
      expect(result).toBeErr(Cl.uint(117));
    });
  });

  // ── Double initialization guard ──────────────────────────────────
  describe("double initialization guard", () => {
    it("rejects second initialization", () => {
      init();
      const { result } = init();
      expect(result).toBeErr(Cl.uint(109)); // ERR-OWNER-ONLY (reused for init guard)
    });
  });

  // ── Outstanding borrows tracking ─────────────────────────────────
  describe("outstanding borrows tracking", () => {
    it("increments on borrow and decrements on repay", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());

      let stats = simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], deployer());
      expect(stats.result).toHaveTupleProperty(
        "total-outstanding-borrows",
        Cl.uint(1_000_000)
      );

      repay(wallet1());
      stats = simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], deployer());
      expect(stats.result).toHaveTupleProperty(
        "total-outstanding-borrows",
        Cl.uint(0)
      );
    });
  });

  // ── Utilization ratio ────────────────────────────────────────────
  describe("utilization ratio", () => {
    it("returns 0 with no deposits", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-utilization-ratio", [], deployer());
      expect(result).toBeUint(0);
    });

    it("calculates ratio correctly", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-utilization-ratio", [], deployer());
      // 1M / 10M * 10000 = 1000 bps
      expect(result).toBeUint(1000);
    });
  });

  // ── Withdraw locked collateral guard ─────────────────────────────
  describe("withdraw locked collateral guard", () => {
    it("prevents withdrawing collateral locked by active loan", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      // 1M borrow at 150% = 1.5M locked, from 10M deposit => 8.5M available
      // Trying to withdraw 9M should fail
      const { result } = withdraw(9_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });

    it("allows withdrawing excess above required collateral", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      // Available = 10M - 1.5M = 8.5M, withdraw 8M should succeed
      const { result } = withdraw(8_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
