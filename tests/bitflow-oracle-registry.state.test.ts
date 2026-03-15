import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry state tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

  const initOracle = () =>
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  const addReporter = (reporter: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(reporter)], deployer());
  const removeReporter = (reporter: string) =>
    simnet.callPublicFn(CONTRACT, "remove-reporter", [Cl.principal(reporter)], deployer());
  const submitPrice = (price: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(price)], sender);
  const adminSetPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "admin-set-price", [Cl.uint(price)], deployer());
  const pauseOracle = () =>
    simnet.callPublicFn(CONTRACT, "pause-oracle", [], deployer());
  const unpauseOracle = () =>
    simnet.callPublicFn(CONTRACT, "unpause-oracle", [], deployer());

  const getPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());
  const getAggregatedPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());
  const getOracleStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-oracle-stats", [], deployer());
  const getOracleParams = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-oracle-params", [], deployer());
  const getReporterCount = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-count", [], deployer());
  const getReporterPrice = (reporter: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-price", [Cl.principal(reporter)], deployer());
  const isActiveReporter = (addr: string) =>
    simnet.callReadOnlyFn(CONTRACT, "is-active-reporter", [Cl.principal(addr)], deployer());
  const getReporterSubs = (reporter: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-submissions", [Cl.principal(reporter)], deployer());
  const getIsPriceFresh = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-is-price-fresh", [], deployer());
  const getPriceAge = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price-age", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(wallet1());
  };

  // ── Reporter management state ────────────────────────────────────
  describe("reporter management state", () => {
    it("tracks reporter count after adding", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());

      const { result } = getReporterCount();
      expect(result).toBeUint(2);
    });

    it("decrements reporter count after removing", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(1)], deployer());
      removeReporter(wallet2());

      const { result } = getReporterCount();
      expect(result).toBeUint(1);
    });

    it("marks reporter as active when added", () => {
      initOracle();
      addReporter(wallet1());

      const { result } = isActiveReporter(wallet1());
      expect(result).toBeBool(true);
    });

    it("marks reporter as inactive when removed", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(1)], deployer());
      removeReporter(wallet1());

      const { result } = isActiveReporter(wallet1());
      expect(result).toBeBool(false);
    });

    it("non-reporter shows as inactive", () => {
      initOracle();
      const { result } = isActiveReporter(wallet3());
      expect(result).toBeBool(false);
    });
  });

  // ── Price submission tracking ────────────────────────────────────
  describe("price submission tracking", () => {
    it("increments total submissions on valid submit", () => {
      setup();
      submitPrice(1_500_000, wallet1());
      submitPrice(1_510_000, wallet1());

      const stats = getOracleStats();
      expect(stats.result).toHaveTupleProperty("total-submissions", Cl.uint(2));
    });

    it("does not increment total rejections on deviation reject (err rolls back state)", () => {
      setup();
      adminSetPrice(1_000_000);
      // Submit price with > 20% deviation — returns err u305, state rolled back
      submitPrice(1_500_000, wallet1());

      const stats = getOracleStats();
      expect(stats.result).toHaveTupleProperty("total-rejections", Cl.uint(0));
    });

    it("tracks per-reporter submission count", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      submitPrice(1_010_000, wallet1());
      submitPrice(1_020_000, wallet1());

      const { result } = getReporterSubs(wallet1());
      expect(result).toBeUint(3);
    });

    it("stores individual reporter price and block", () => {
      setup();
      submitPrice(1_500_000, wallet1());

      const { result } = getReporterPrice(wallet1());
      expect(result).not.toBeNone();
    });

    it("clears reporter price when reporter is removed", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(1_000_000, wallet1());
      simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(1)], deployer());
      removeReporter(wallet1());

      const { result } = getReporterPrice(wallet1());
      expect(result).toBeNone();
    });
  });

  // ── Aggregated price state ───────────────────────────────────────
  describe("aggregated price state", () => {
    it("updates aggregated price on valid submission", () => {
      setup();
      submitPrice(2_000_000, wallet1());

      const { result } = getPrice();
      expect(result).toBeUint(2_000_000);
    });

    it("latest submission becomes aggregated price", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      submitPrice(1_100_000, wallet1());

      const { result } = getPrice();
      expect(result).toBeUint(1_100_000);
    });

    it("admin override updates aggregated price", () => {
      initOracle();
      adminSetPrice(3_000_000);

      const { result } = getPrice();
      expect(result).toBeUint(3_000_000);
    });

    it("returns zero before any submissions", () => {
      initOracle();
      const { result } = getPrice();
      expect(result).toBeUint(0);
    });
  });

  // ── Price freshness tracking ─────────────────────────────────────
  describe("price freshness tracking", () => {
    it("price is fresh immediately after submission", () => {
      setup();
      submitPrice(1_000_000, wallet1());

      const { result } = getIsPriceFresh();
      expect(result).toBeBool(true);
    });

    it("price age is 0 before any submission", () => {
      initOracle();
      const { result } = getPriceAge();
      expect(result).toBeUint(0);
    });

    it("price becomes stale after max-price-age blocks", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      simnet.mineEmptyBlocks(289); // MAX-PRICE-AGE = 288

      const { result } = getIsPriceFresh();
      expect(result).toBeBool(false);
    });

    it("admin override refreshes staleness", () => {
      initOracle();
      adminSetPrice(1_000_000);
      simnet.mineEmptyBlocks(100);
      adminSetPrice(1_100_000);

      const { result } = getIsPriceFresh();
      expect(result).toBeBool(true);
    });
  });

  // ── Oracle params ────────────────────────────────────────────────
  describe("oracle params", () => {
    it("returns default params after initialization", () => {
      initOracle();

      const { result } = getOracleParams();
      expect(result).toHaveTupleProperty("min-reporters-required", Cl.uint(1));
      expect(result).toHaveTupleProperty("max-price-age", Cl.uint(288));
      expect(result).toHaveTupleProperty("max-deviation-bps", Cl.uint(2000));
      expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
    });

    it("reflects updated min-reporters", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(2)], deployer());

      const { result } = getOracleParams();
      expect(result).toHaveTupleProperty("min-reporters-required", Cl.uint(2));
    });

    it("reflects updated max-deviation", () => {
      initOracle();
      simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(1000)], deployer());

      const { result } = getOracleParams();
      expect(result).toHaveTupleProperty("max-deviation-bps", Cl.uint(1000));
    });

    it("reflects paused state", () => {
      initOracle();
      pauseOracle();

      const { result } = getOracleParams();
      expect(result).toHaveTupleProperty("is-paused", Cl.bool(true));
    });

    it("reflects unpaused state", () => {
      initOracle();
      pauseOracle();
      unpauseOracle();

      const { result } = getOracleParams();
      expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
    });
  });

  // ── Multi-reporter state ─────────────────────────────────────────
  describe("multi-reporter state", () => {
    it("both reporters can submit prices", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());

      const r1 = submitPrice(1_000_000, wallet1());
      const r2 = submitPrice(1_050_000, wallet2());

      expect(r1.result).toBeOk(Cl.bool(true));
      expect(r2.result).toBeOk(Cl.bool(true));
    });

    it("each reporter has independent submission count", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());

      submitPrice(1_000_000, wallet1());
      submitPrice(1_000_000, wallet1());
      submitPrice(1_050_000, wallet2());

      const subs1 = getReporterSubs(wallet1());
      const subs2 = getReporterSubs(wallet2());
      expect(subs1.result).toBeUint(2);
      expect(subs2.result).toBeUint(1);
    });

    it("reports aggregated stats across all reporters", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());

      submitPrice(1_000_000, wallet1());
      submitPrice(1_050_000, wallet2());

      const stats = getOracleStats();
      expect(stats.result).toHaveTupleProperty("total-submissions", Cl.uint(2));
      expect(stats.result).toHaveTupleProperty("reporter-count", Cl.uint(2));
    });
  });

  // ── Oracle stats aggregation ─────────────────────────────────────
  describe("oracle stats aggregation", () => {
    it("returns comprehensive stats", () => {
      setup();
      submitPrice(1_000_000, wallet1());

      const { result } = getOracleStats();
      expect(result).toHaveTupleProperty("aggregated-price", Cl.uint(1_000_000));
      expect(result).toHaveTupleProperty("total-submissions", Cl.uint(1));
      expect(result).toHaveTupleProperty("total-rejections", Cl.uint(0));
      expect(result).toHaveTupleProperty("reporter-count", Cl.uint(1));
      expect(result).toHaveTupleProperty("is-fresh", Cl.bool(true));
    });
  });
});
