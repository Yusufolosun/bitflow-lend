import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry price freshness lifecycle", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const reporter1 = () => getAccounts().get("wallet_1")!;

  const initOracle = () =>
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  const addReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(addr)], deployer());
  const submitPrice = (price: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(price)], sender);
  const setMaxPriceAge = (age: number) =>
    simnet.callPublicFn(CONTRACT, "set-max-price-age", [Cl.uint(age)], deployer());
  const getIsFresh = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-is-price-fresh", [], deployer());
  const getPriceAge = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price-age", [], deployer());
  const getAggregated = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(reporter1());
  };

  // ── No price is stale ───────────────────────────────────────────
  describe("no price submitted", () => {
    it("is-fresh is false when no price has been set", () => {
      setup();
      const { result } = getIsFresh();
      expect(result).toBeBool(false);
    });

    it("price-age is 0 when no price has been set", () => {
      setup();
      const { result } = getPriceAge();
      expect(result).toBeUint(0);
    });
  });

  // ── Fresh after submission ──────────────────────────────────────
  describe("fresh after submission", () => {
    it("becomes fresh immediately after submission", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      const { result } = getIsFresh();
      expect(result).toBeBool(true);
    });

    it("aggregated price shows fresh flag", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      const { result } = getAggregated();
      expect(result).toHaveTupleProperty("is-fresh", Cl.bool(true));
    });
  });

  // ── Staleness after max-price-age ───────────────────────────────
  describe("staleness lifecycle", () => {
    it("remains fresh before max-price-age", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      // Default MAX-PRICE-AGE = 288 blocks
      simnet.mineEmptyBlocks(280);
      const { result } = getIsFresh();
      expect(result).toBeBool(true);
    });

    it("goes stale after max-price-age blocks", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(290);
      const { result } = getIsFresh();
      expect(result).toBeBool(false);
    });

    it("price-age reflects blocks since submission", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(100);
      const { result } = getPriceAge();
      expect(Number((result as any).value)).toBeGreaterThanOrEqual(100);
    });
  });

  // ── Refreshed by new submission ─────────────────────────────────
  describe("refresh by new submission", () => {
    it("becomes fresh again after new submission", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(300); // stale
      expect(getIsFresh().result).toBeBool(false);

      submitPrice(1_050_000, reporter1());
      expect(getIsFresh().result).toBeBool(true);
    });

    it("price-age resets after new submission", () => {
      setup();
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(200);
      submitPrice(1_050_000, reporter1());

      const { result } = getPriceAge();
      // Should be very small (0-1 blocks since just submitted)
      expect(Number((result as any).value)).toBeLessThanOrEqual(1);
    });
  });

  // ── Custom max-price-age ────────────────────────────────────────
  describe("custom max-price-age", () => {
    it("tighter window causes earlier staleness", () => {
      setup();
      setMaxPriceAge(72); // ~12 hours
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(75);
      const { result } = getIsFresh();
      expect(result).toBeBool(false);
    });

    it("wider window extends freshness", () => {
      setup();
      setMaxPriceAge(2016); // ~14 days
      submitPrice(1_000_000, reporter1());
      simnet.mineEmptyBlocks(500);
      const { result } = getIsFresh();
      expect(result).toBeBool(true);
    });
  });
});
