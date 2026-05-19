import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v3";

/**
 * Tests that liquidation eligibility and seized amounts are calculated
 * on total outstanding debt (principal + accrued interest + penalty),
 * not principal alone.
 */
describe("bitflow-vault-core-v3 liquidation debt basis", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const borrower = () => simnet.getAccounts().get("wallet_1")!;
  const liquidator = () => simnet.getAccounts().get("wallet_2")!;

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
  const getHealthFactor = (user: string, price: number) =>
    simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(user), Cl.uint(price)],
      deployer()
    );
  const isLiquidatable = (user: string, price: number) =>
    simnet.callReadOnlyFn(
      CONTRACT, "is-liquidatable",
      [Cl.principal(user), Cl.uint(price)],
      deployer()
    );

  // ── Principal-only at 110% should not be liquidatable ─────────────
  describe("principal-only health check boundary", () => {
    it("position at ~110% health based on principal alone is not liquidatable when interest is negligible", () => {
      init();
      setPrice(100);

      // Deposit 15M, borrow 10M => collateral ratio = 150% on principal (succeeds)
      deposit(15_000_000, borrower());
      borrow(10_000_000, 500, 30, borrower());

      // At price 74, health = 15M * 74 / 10M = 111 (just above 110 threshold)
      setPrice(74);

      // Immediately check — health should be around 111 (above threshold)
      const health = getHealthFactor(borrower(), 74);
      const hf = Number((health.result as any).value?.value);
      expect(hf).toBeGreaterThanOrEqual(110);

      // Should NOT be liquidatable at this instant
      const liq = isLiquidatable(borrower(), 74);
      expect(liq.result).toBeBool(false);
    });
  });

  // ── Accrued interest pushing below liquidation threshold ──────────
  describe("accrued interest triggers liquidation", () => {
    it("position becomes liquidatable as interest accrues over time", () => {
      init();
      setPrice(100);

      deposit(15_000_000, borrower());
      borrow(10_000_000, 500, 30, borrower());

      // Mine enough blocks so interest accrues and pushes health below 110%
      simnet.mineEmptyBlocks(10000);

      // Refresh price to keep it valid (set to 74)
      setPrice(74);

      const health = getHealthFactor(borrower(), 74);
      const hf = Number((health.result as any).value?.value);
      expect(hf).toBeLessThan(110);

      const liq = isLiquidatable(borrower(), 74);
      expect(liq.result).toBeBool(true);
    });

    it("liquidation succeeds on interest-driven undercollateralization", () => {
      init();
      setPrice(100);

      deposit(15_000_000, borrower());
      borrow(10_000_000, 500, 30, borrower());
      simnet.mineEmptyBlocks(10000);
      setPrice(74);

      const { result } = liquidate(borrower(), liquidator());
      // Should succeed — position is undercollateralized due to interest
      expect(result).toBeOk(
        expect.objectContaining({})
      );
    });
  });

  // ── Seized collateral covers full debt including penalty ──────────
  describe("seized collateral covers full debt", () => {
    it("liquidator payment includes accrued interest and penalty", () => {
      init();
      setPrice(100);

      deposit(15_000_000, borrower());
      borrow(10_000_000, 500, 30, borrower());
      simnet.mineEmptyBlocks(10000);
      setPrice(74);

      const { result } = liquidate(borrower(), liquidator());
      const data = (result as any).value?.value;

      const paid = Number(data.paid.value);
      const principal = Number(data.principal.value);
      const interest = Number(data.interest.value);
      const penalty = Number(data.penalty.value);

      // Interest must be > 0 after 10000 blocks
      expect(interest).toBeGreaterThan(0);

      // Penalty must be > 0 (5% of outstanding debt)
      expect(penalty).toBeGreaterThan(0);

      // paid = outstanding_debt + penalty = (principal + interest) + penalty
      expect(paid).toBe(principal + interest + penalty);

      // Penalty should be ~5% of outstanding debt
      const outstandingDebt = principal + interest;
      const expectedPenalty = Math.floor((outstandingDebt * 500) / 10000);
      expect(penalty).toBe(expectedPenalty);
    });

    it("seized collateral equals borrower full deposit", () => {
      init();
      setPrice(100);

      deposit(15_000_000, borrower());
      borrow(10_000_000, 500, 30, borrower());
      simnet.mineEmptyBlocks(10000);
      setPrice(74);

      const { result } = liquidate(borrower(), liquidator());
      const data = (result as any).value?.value;

      expect(Number(data["seized-collateral"].value)).toBe(15_000_000);
    });
  });

  // ── Liquidation penalty configuration ─────────────────────────────
  describe("liquidation penalty admin configuration", () => {
    it("allows admin to set liquidation penalty bps", () => {
      init();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-penalty-bps", [Cl.uint(1000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects liquidation penalty below 10 bps", () => {
      init();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-penalty-bps", [Cl.uint(9)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects liquidation penalty above 2000 bps", () => {
      init();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-penalty-bps", [Cl.uint(2001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects non-owner setting liquidation penalty", () => {
      init();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-penalty-bps", [Cl.uint(500)], borrower()
      );
      expect(result).toBeErr(Cl.uint(109));
    });

    it("includes liquidation-penalty-bps in protocol parameters", () => {
      init();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-parameters", [], deployer()
      );
      expect(result).toHaveTupleProperty("liquidation-penalty-bps", Cl.uint(500));
    });
  });
});

