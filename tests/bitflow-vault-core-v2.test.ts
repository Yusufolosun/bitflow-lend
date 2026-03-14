import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2", () => {
  // ── helpers ──────────────────────────────────────────────────────
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

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

  const getUserDeposit = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(user)], deployer());

  const getUserLoan = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(user)], deployer());

  const getProtocolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-protocol-stats", [], deployer());

  const getMaxBorrow = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-max-borrow-amount", [Cl.principal(user)], deployer());

  const getHealthFactor = (user: string, price: number) =>
    simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(user), Cl.uint(price)],
      deployer()
    );

  const getRepaymentAmount = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-repayment-amount", [Cl.principal(user)], deployer());

  const getUtilizationRatio = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-utilization-ratio", [], deployer());

  /** Initialize protocol and set a fresh price in one go */
  const setup = (price = 10000) => {
    init();
    setPrice(price);
  };

  // ── initialization ──────────────────────────────────────────────

  describe("initialization", () => {
    it("allows owner to initialize", () => {
      const { result } = init();
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects double initialization", () => {
      init();
      const { result } = init();
      expect(result).toBeErr(Cl.uint(109));
    });

    it("rejects initialization from non-owner", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "initialize", [], wallet1());
      expect(result).toBeErr(Cl.uint(109));
    });

    it("returns contract version 2.0.0", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-contract-version", [], deployer());
      expect(result).toBeAscii("2.0.0");
    });
  });

  // ── price oracle ────────────────────────────────────────────────

  describe("price oracle", () => {
    it("allows owner to set price", () => {
      setup();
      const { result } = setPrice(50000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects zero price", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(0)], deployer()
      );
      expect(result).toBeErr(Cl.uint(117));
    });

    it("rejects price from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(10000)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109));
    });

    it("rejects excessively high price", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(100000000)], deployer()
      );
      expect(result).toBeErr(Cl.uint(117));
    });

    it("returns staleness as blocks since update", () => {
      setup();
      simnet.mineEmptyBlocks(5);
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-price-staleness-blocks", [], deployer()
      );
      expect(result).toBeUint(5);
    });
  });

  // ── deposits ────────────────────────────────────────────────────

  describe("deposits", () => {
    it("allows user to deposit STX", () => {
      setup();
      const { result } = deposit(10000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("updates user deposit balance", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = getUserDeposit(wallet1());
      expect(result).toBeUint(10000000);
    });

    it("allows additional deposits", () => {
      setup();
      deposit(10000000, wallet1());
      deposit(5000000, wallet1());
      const { result } = getUserDeposit(wallet1());
      expect(result).toBeUint(15000000);
    });

    it("tracks total deposits", () => {
      setup();
      deposit(10000000, wallet1());
      deposit(5000000, wallet2());
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], deployer());
      expect(result).toBeUint(15000000);
    });

    it("rejects zero deposit", () => {
      setup();
      const { result } = deposit(0, wallet1());
      expect(result).toBeErr(Cl.uint(119));
    });

    it("rejects deposit when paused", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = deposit(10000000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects deposit when deposits disabled", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], deployer());
      const { result } = deposit(10000000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });
  });

  // ── withdrawals ─────────────────────────────────────────────────

  describe("withdrawals", () => {
    it("allows user to withdraw deposited STX", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = withdraw(5000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("updates balance after withdrawal", () => {
      setup();
      deposit(10000000, wallet1());
      withdraw(3000000, wallet1());
      const { result } = getUserDeposit(wallet1());
      expect(result).toBeUint(7000000);
    });

    it("allows full withdrawal with no loan", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = withdraw(10000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects withdrawal exceeding balance", () => {
      setup();
      deposit(5000000, wallet1());
      const { result } = withdraw(6000000, wallet1());
      expect(result).toBeErr(Cl.uint(101));
    });

    it("rejects zero withdrawal", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = withdraw(0, wallet1());
      expect(result).toBeErr(Cl.uint(119));
    });

    it("rejects withdrawal when paused", () => {
      setup();
      deposit(10000000, wallet1());
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = withdraw(5000000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("blocks withdrawal of locked collateral", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      // Required collateral = 1000000 * 150 / 100 = 1500000
      // Available = 10000000 - 1500000 = 8500000
      const { result } = withdraw(9000000, wallet1());
      expect(result).toBeErr(Cl.uint(101));
    });

    it("allows withdrawal of unlocked collateral with active loan", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      // Can withdraw up to 8500000
      const { result } = withdraw(8000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── borrowing ───────────────────────────────────────────────────

  describe("borrowing", () => {
    it("allows user to borrow against collateral", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(1000000, 500, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("stores loan record", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = getUserLoan(wallet1());
      const data = result as any;
      expect(data.data.amount).toBeUint(1000000);
      expect(data.data["interest-rate"]).toBeUint(500);
    });

    it("tracks outstanding borrows", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = getProtocolStats();
      const data = result as any;
      expect(data.data["total-outstanding-borrows"]).toBeUint(1000000);
    });

    it("rejects second loan for same user", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = borrow(500000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(103));
    });

    it("rejects borrow with insufficient collateral", () => {
      setup(10000);
      deposit(1000000, wallet1());
      // Needs 150% collateral: borrowing 1000000 requires 1500000 deposit
      const { result } = borrow(1000000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(105));
    });

    it("rejects borrow below minimum", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(99999, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(115));
    });

    it("rejects zero borrow", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(0, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(119));
    });

    it("rejects interest rate below minimum", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(1000000, 49, 30, wallet1());
      expect(result).toBeErr(Cl.uint(110));
    });

    it("rejects interest rate above maximum", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(1000000, 10001, 30, wallet1());
      expect(result).toBeErr(Cl.uint(110));
    });

    it("rejects term below minimum", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(1000000, 500, 0, wallet1());
      expect(result).toBeErr(Cl.uint(111));
    });

    it("rejects term above maximum", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = borrow(1000000, 500, 366, wallet1());
      expect(result).toBeErr(Cl.uint(111));
    });

    it("rejects borrow with stale price", () => {
      setup(10000);
      deposit(10000000, wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = borrow(1000000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(114));
    });

    it("rejects borrow when paused", () => {
      setup(10000);
      deposit(10000000, wallet1());
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = borrow(1000000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects borrow when borrows disabled", () => {
      setup(10000);
      deposit(10000000, wallet1());
      simnet.callPublicFn(CONTRACT, "toggle-borrows-enabled", [Cl.bool(false)], deployer());
      const { result } = borrow(1000000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });
  });

  // ── repayment ───────────────────────────────────────────────────

  describe("repayment", () => {
    it("allows borrower to repay loan", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = repay(wallet1());
      expect(result).toBeOk(Cl.some(Cl.tuple({
        principal: Cl.uint(1000000),
      })));
    });

    it("removes loan record after repayment", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      repay(wallet1());
      const { result } = getUserLoan(wallet1());
      expect(result).toBeNone();
    });

    it("reduces outstanding borrows after repay", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      repay(wallet1());
      const { result } = getProtocolStats();
      const data = result as any;
      expect(data.data["total-outstanding-borrows"]).toBeUint(0);
    });

    it("rejects repay with no active loan", () => {
      setup();
      const { result } = repay(wallet1());
      expect(result).toBeErr(Cl.uint(106));
    });

    it("rejects repay when paused", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = repay(wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });
  });

  // ── liquidation ─────────────────────────────────────────────────

  describe("liquidation", () => {
    it("allows liquidation of expired loan", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      // Mine past term end (1 day = 144 blocks)
      simnet.mineEmptyBlocks(145);
      // Keep price fresh
      setPrice(10000);
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeOk(Cl.some(Cl.tuple({
        "seized-collateral": Cl.uint(10000000),
      })));
    });

    it("clears borrower loan and deposit after liquidation", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      simnet.mineEmptyBlocks(145);
      setPrice(10000);
      liquidate(wallet1(), wallet2());

      const loan = getUserLoan(wallet1());
      expect(loan.result).toBeNone();

      const dep = getUserDeposit(wallet1());
      expect(dep.result).toBeUint(0);
    });

    it("reduces outstanding borrows after liquidation", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      simnet.mineEmptyBlocks(145);
      setPrice(10000);
      liquidate(wallet1(), wallet2());
      const { result } = getProtocolStats();
      const data = result as any;
      expect(data.data["total-outstanding-borrows"]).toBeUint(0);
    });

    it("rejects self-liquidation", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      simnet.mineEmptyBlocks(145);
      setPrice(10000);
      const { result } = liquidate(wallet1(), wallet1());
      expect(result).toBeErr(Cl.uint(108));
    });

    it("rejects liquidation of healthy loan", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 365, wallet1());
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(107));
    });

    it("rejects liquidation with stale price", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      simnet.mineEmptyBlocks(200);
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(114));
    });

    it("rejects liquidation when paused", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 1, wallet1());
      simnet.mineEmptyBlocks(145);
      setPrice(10000);
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("rejects liquidation of non-borrower", () => {
      setup(10000);
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(106));
    });
  });

  // ── admin controls ──────────────────────────────────────────────

  describe("admin controls", () => {
    it("allows owner to pause and unpause", () => {
      setup();
      let { result } = simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      expect(result).toBeOk(Cl.bool(true));
      ({ result } = simnet.callPublicFn(CONTRACT, "unpause-protocol", [], deployer()));
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects pause from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(CONTRACT, "pause-protocol", [], wallet1());
      expect(result).toBeErr(Cl.uint(109));
    });

    it("allows owner to toggle per-function controls", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows owner to set collateral ratio", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(200)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects collateral ratio below 100", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(99)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects collateral ratio above 500", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(501)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("allows owner to set liquidation threshold", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-threshold", [Cl.uint(120)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects liquidation threshold >= collateral ratio", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-threshold", [Cl.uint(150)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("allows owner to set interest rate bounds", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds", [Cl.uint(100), Cl.uint(5000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects interest bounds with min >= max", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds", [Cl.uint(5000), Cl.uint(5000)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("allows owner to set term limits", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits", [Cl.uint(7), Cl.uint(180)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects term limits above 730 days", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits", [Cl.uint(1), Cl.uint(731)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("allows owner to set late penalty rate", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate", [Cl.uint(1000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects late penalty rate above 20%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate", [Cl.uint(2001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });
  });

  // ── read-only queries ───────────────────────────────────────────

  describe("read-only queries", () => {
    it("returns required collateral for borrow amount", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "calculate-required-collateral", [Cl.uint(1000000)], deployer()
      );
      // 1000000 * 150 / 100 = 1500000
      expect(result).toBeUint(1500000);
    });

    it("returns max borrow for user deposit", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = getMaxBorrow(wallet1());
      // 10000000 * 100 / 150 = 6666666
      expect(result).toBeUint(6666666);
    });

    it("returns zero max borrow with no deposit", () => {
      setup();
      const { result } = getMaxBorrow(wallet3());
      expect(result).toBeUint(0);
    });

    it("returns health factor for borrower", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = getHealthFactor(wallet1(), 10000);
      // collateral_value = 10000000 * 10000 / 100 = 1000000000
      // health_factor = 1000000000 * 100 / 1000000 = 100000
      const data = result as any;
      expect(data.value).toBeUint(100000);
    });

    it("returns repayment breakdown", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = getRepaymentAmount(wallet1());
      const data = result as any;
      expect(data.value.data.principal).toBeUint(1000000);
    });

    it("returns none repayment for non-borrower", () => {
      setup();
      const { result } = getRepaymentAmount(wallet3());
      expect(result).toBeNone();
    });

    it("returns utilization ratio", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = getUtilizationRatio();
      // 1000000 * 10000 / 10000000 = 1000 bps = 10%
      expect(result).toBeUint(1000);
    });

    it("returns zero utilization with no deposits", () => {
      setup();
      const { result } = getUtilizationRatio();
      expect(result).toBeUint(0);
    });

    it("returns protocol metrics", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-protocol-metrics", [], deployer());
      const data = result as any;
      expect(data.data["total-deposits"]).toBeUint(1);
    });

    it("returns volume metrics", () => {
      setup(10000);
      deposit(10000000, wallet1());
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-volume-metrics", [], deployer());
      const data = result as any;
      expect(data.data["deposit-volume"]).toBeUint(10000000);
    });

    it("returns protocol parameters", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-protocol-parameters", [], deployer());
      expect(result).toBeOk(Cl.tuple({
        "min-collateral-ratio": Cl.uint(150),
        "liquidation-threshold": Cl.uint(110),
        "min-interest-rate": Cl.uint(50),
        "max-interest-rate": Cl.uint(10000),
        "min-term-days": Cl.uint(1),
        "max-term-days": Cl.uint(365),
        "late-penalty-rate": Cl.uint(500),
      }));
    });
  });

  // ── migration support ───────────────────────────────────────────

  describe("migration support", () => {
    it("exports user position with deposit only", () => {
      setup();
      deposit(10000000, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "export-user-position", [Cl.principal(wallet1())], deployer()
      );
      const data = result as any;
      expect(data.data.deposit).toBeUint(10000000);
      expect(data.data["has-loan"]).toBeBool(false);
    });

    it("exports user position with active loan", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "export-user-position", [Cl.principal(wallet1())], deployer()
      );
      const data = result as any;
      expect(data.data.deposit).toBeUint(10000000);
      expect(data.data["has-loan"]).toBeBool(true);
      expect(data.data.loan.data.amount).toBeUint(1000000);
    });

    it("exports protocol state", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "export-protocol-state", [], deployer()
      );
      const data = result as any;
      expect(data.data["total-deposits"]).toBeUint(10000000);
      expect(data.data["total-outstanding-borrows"]).toBeUint(1000000);
      expect(data.data["stx-price"]).toBeUint(10000);
    });

    it("returns protocol age in blocks", () => {
      init();
      simnet.mineEmptyBlocks(10);
      const { result } = simnet.callReadOnlyFn(CONTRACT, "get-protocol-age", [], deployer());
      expect(result).toBeUint(10);
    });
  });

  // ── edge cases ──────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles deposit-borrow-repay-withdraw cycle", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      repay(wallet1());
      withdraw(10000000, wallet1());
      const dep = getUserDeposit(wallet1());
      expect(dep.result).toBeUint(0);
    });

    it("multiple users can borrow independently", () => {
      setup(10000);
      deposit(10000000, wallet1());
      deposit(10000000, wallet2());
      borrow(1000000, 500, 30, wallet1());
      borrow(2000000, 800, 60, wallet2());

      const loan1 = getUserLoan(wallet1());
      const loan2 = getUserLoan(wallet2());
      expect((loan1.result as any).data.amount).toBeUint(1000000);
      expect((loan2.result as any).data.amount).toBeUint(2000000);
    });

    it("repaying frees collateral for withdrawal", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(5000000, 500, 30, wallet1());
      // Can't withdraw all while loan active
      const before = withdraw(10000000, wallet1());
      expect(before.result).toBeErr(Cl.uint(101));
      // Repay releases collateral
      repay(wallet1());
      const after = withdraw(10000000, wallet1());
      expect(after.result).toBeOk(Cl.bool(true));
    });

    it("user position summary covers all fields", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(1000000, 500, 30, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-user-position-summary",
        [Cl.principal(wallet1()), Cl.uint(10000)],
        deployer()
      );
      const data = result as any;
      expect(data.data["deposit-amount"]).toBeUint(10000000);
      expect(data.data["has-loan"]).toBeBool(true);
      expect(data.data["loan-amount"]).toBeUint(1000000);
      expect(data.data["is-liquidatable"]).toBeBool(false);
    });

    it("is-liquidatable detects undercollateralized position", () => {
      setup(10000);
      deposit(10000000, wallet1());
      borrow(5000000, 500, 30, wallet1());
      // Check with a very low price making position undercollateralized
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "is-liquidatable",
        [Cl.principal(wallet1()), Cl.uint(1)],
        deployer()
      );
      expect(result).toBeBool(true);
    });
  });
});
