import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry deviation and precision tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const reporter1 = () => getAccounts().get("wallet_1")!;
  const reporter2 = () => getAccounts().get("wallet_2")!;

  const initOracle = () =>
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  const addReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(addr)], deployer());
  const submitPrice = (price: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(price)], sender);
  const setMaxDeviation = (bps: number) =>
    simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(bps)], deployer());
  const adminSetPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "admin-set-price", [Cl.uint(price)], deployer());
  const getPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());
  const getAggregatedPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());
  const getStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-oracle-stats", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(reporter1());
    addReporter(reporter2());
  };

  // ── Deviation acceptance at boundary ────────────────────────────
  describe("deviation acceptance boundary", () => {
    it("accepts price exactly at max deviation", () => {
      setup();
      // Set baseline price
      adminSetPrice(1_000_000); // $1.00

      // Default max deviation = 2000 bps = 20%
      // 20% above $1.00 = $1.20 = 1_200_000
      const { result } = submitPrice(1_200_000, reporter1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects price just beyond max deviation with err u305", () => {
      setup();
      adminSetPrice(1_000_000);

      // 20% above = 1_200_000. Anything above should be rejected.
      // 1_200_001 is 20.0001% deviation
      const { result } = submitPrice(1_200_001, reporter1());
      expect(result).toBeErr(Cl.uint(305)); // ERR-DEVIATION-TOO-HIGH
    });

    it("accepts price at max deviation below", () => {
      setup();
      adminSetPrice(1_000_000);

      // 20% below $1.00 = $0.80 = 800_000
      const { result } = submitPrice(800_000, reporter1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects price beyond max deviation below with err u305", () => {
      setup();
      adminSetPrice(1_000_000);

      // 799_999 is just beyond 20% below
      const { result } = submitPrice(799_999, reporter1());
      expect(result).toBeErr(Cl.uint(305));
    });
  });

  // ── Custom deviation threshold ──────────────────────────────────
  describe("custom deviation threshold", () => {
    it("tighter deviation rejects larger moves", () => {
      setup();
      adminSetPrice(1_000_000);

      // Tighten to 5% (500 bps)
      setMaxDeviation(500);

      // 5% above = 1_050_000, should be accepted
      const { result: ok } = submitPrice(1_050_000, reporter1());
      expect(ok).toBeOk(Cl.bool(true));

      // Reset price for next test
      adminSetPrice(1_000_000);

      // 6% above = 1_060_000, should be rejected with err u305
      const { result: fail } = submitPrice(1_060_000, reporter2());
      expect(fail).toBeErr(Cl.uint(305));
    });

    it("widest deviation (5000 bps = 50%) allows large swings", () => {
      setup();
      adminSetPrice(1_000_000);
      setMaxDeviation(5000);

      // 50% above = 1_500_000
      const { result } = submitPrice(1_500_000, reporter1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── First submission without reference ──────────────────────────
  describe("first submission without aggregate", () => {
    it("first submission is accepted regardless of value", () => {
      setup();
      // No admin price set, aggregated = 0
      const { result } = submitPrice(999_999_999, reporter1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("sets aggregated price on first submission", () => {
      setup();
      submitPrice(2_500_000, reporter1());
      const { result } = getPrice();
      expect(result).toBeUint(2_500_000);
    });
  });

  // ── Rejection accounting ────────────────────────────────────────
  describe("rejection accounting", () => {
    it("does not increment rejection count because err rolls back state", () => {
      setup();
      adminSetPrice(1_000_000);

      // Force rejection
      submitPrice(2_000_000, reporter1());

      const { result } = getStats();
      expect(result).toHaveTupleProperty("total-rejections", Cl.uint(0));
    });

    it("does not increment submissions on rejection", () => {
      setup();
      adminSetPrice(1_000_000);

      const before = getStats();
      const subsBefore = (before.result as any).value?.["total-submissions"]?.value;

      submitPrice(2_000_000, reporter1()); // rejected

      const after = getStats();
      const subsAfter = (after.result as any).value?.["total-submissions"]?.value;

      expect(subsAfter).toBe(subsBefore);
    });
  });

  // ── Price freshness after submission ────────────────────────────
  describe("price freshness after submission", () => {
    it("price is fresh immediately after submission", () => {
      setup();
      submitPrice(1_500_000, reporter1());

      const { result } = getAggregatedPrice();
      expect(result).toHaveTupleProperty("is-fresh", Cl.bool(true));
    });

    it("price goes stale after max-price-age blocks", () => {
      setup();
      submitPrice(1_500_000, reporter1());

      // Default MAX-PRICE-AGE = 288 blocks
      simnet.mineEmptyBlocks(290);

      const { result } = getAggregatedPrice();
      expect(result).toHaveTupleProperty("is-fresh", Cl.bool(false));
    });
  });

  // ── Deviation validation bounds ─────────────────────────────────
  describe("deviation parameter validation", () => {
    it("rejects zero deviation", () => {
      setup();
      const { result } = setMaxDeviation(0);
      expect(result).toBeErr(Cl.uint(310)); // ERR-INVALID-PARAM
    });

    it("rejects deviation above 5000 bps", () => {
      setup();
      const { result } = setMaxDeviation(5001);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("accepts deviation at minimum (1 bps)", () => {
      setup();
      const { result } = setMaxDeviation(1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts deviation at maximum (5000 bps)", () => {
      setup();
      const { result } = setMaxDeviation(5000);
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
