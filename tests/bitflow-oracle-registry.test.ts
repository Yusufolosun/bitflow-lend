import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry", () => {
  // ── helpers ──────────────────────────────────────────────────────
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

  const getAggregatedPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());

  const getPrice = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price", [], deployer());

  const getPriceAge = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-price-age", [], deployer());

  const getReporterPrice = (reporter: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-price", [Cl.principal(reporter)], deployer());

  const isActiveReporter = (addr: string) =>
    simnet.callReadOnlyFn(CONTRACT, "is-active-reporter", [Cl.principal(addr)], deployer());

  const getReporterCount = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-count", [], deployer());

  const getOracleParams = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-oracle-params", [], deployer());

  const getOracleStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-oracle-stats", [], deployer());

  const getReporterSubmissions = (reporter: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-reporter-submissions", [Cl.principal(reporter)], deployer());

  const setMinReporters = (min: number) =>
    simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(min)], deployer());

  const setMaxDeviation = (bps: number) =>
    simnet.callPublicFn(CONTRACT, "set-max-deviation", [Cl.uint(bps)], deployer());

  const setMaxPriceAge = (age: number) =>
    simnet.callPublicFn(CONTRACT, "set-max-price-age", [Cl.uint(age)], deployer());

  // ── initialization ──────────────────────────────────────────────

  describe("initialization", () => {
    it("allows owner to initialize the oracle", () => {
      const { result } = initOracle();
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects double initialization", () => {
      initOracle();
      const { result } = initOracle();
      expect(result).toBeErr(Cl.uint(301));
    });

    it("rejects initialization from non-owner", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "initialize-oracle", [], wallet1());
      expect(result).toBeErr(Cl.uint(301));
    });
  });

  // ── reporter management ─────────────────────────────────────────

  describe("reporter management", () => {
    it("allows owner to add a reporter", () => {
      initOracle();
      const { result } = addReporter(wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("increments reporter count on add", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      const { result } = getReporterCount();
      expect(result).toBeUint(2);
    });

    it("marks added principal as active reporter", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = isActiveReporter(wallet1());
      expect(result).toBeBool(true);
    });

    it("rejects adding duplicate reporter", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = addReporter(wallet1());
      expect(result).toBeErr(Cl.uint(306));
    });

    it("rejects add-reporter from non-owner", () => {
      initOracle();
      const { result } = simnet.callPublicFn(
        CONTRACT, "add-reporter", [Cl.principal(wallet2())], wallet1()
      );
      expect(result).toBeErr(Cl.uint(301));
    });

    it("allows owner to remove a reporter", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      const { result } = removeReporter(wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("decrements reporter count on remove", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      removeReporter(wallet1());
      const { result } = getReporterCount();
      expect(result).toBeUint(1);
    });

    it("marks removed principal as inactive", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      removeReporter(wallet1());
      const { result } = isActiveReporter(wallet1());
      expect(result).toBeBool(false);
    });

    it("rejects removing non-existent reporter", () => {
      initOracle();
      const { result } = removeReporter(wallet1());
      expect(result).toBeErr(Cl.uint(307));
    });

    it("rejects remove if it would go below min-reporters", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = removeReporter(wallet1());
      expect(result).toBeErr(Cl.uint(308));
    });

    it("rejects remove-reporter from non-owner", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      const { result } = simnet.callPublicFn(
        CONTRACT, "remove-reporter", [Cl.principal(wallet1())], wallet2()
      );
      expect(result).toBeErr(Cl.uint(301));
    });
  });

  // ── price submission ────────────────────────────────────────────

  describe("price submission", () => {
    it("allows reporter to submit a price", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("updates aggregated price after submission", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      const { result } = getPrice();
      expect(result).toBeUint(50000000);
    });

    it("stores reporter-specific price", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      const { result } = getReporterPrice(wallet1());
      const data = result as any;
      expect(data.value.value.price).toBeUint(50000000);
    });

    it("increments reporter submission count", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      submitPrice(50000000, wallet1());
      const { result } = getReporterSubmissions(wallet1());
      expect(result).toBeUint(2);
    });

    it("rejects submission from non-reporter", () => {
      initOracle();
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeErr(Cl.uint(302));
    });

    it("rejects zero price", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = submitPrice(0, wallet1());
      expect(result).toBeErr(Cl.uint(303));
    });

    it("rejects price exceeding max sanity", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = submitPrice(1000000000001, wallet1());
      expect(result).toBeErr(Cl.uint(303));
    });

    it("rejects submission when oracle is paused", () => {
      initOracle();
      addReporter(wallet1());
      pauseOracle();
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeErr(Cl.uint(309));
    });

    it("accepts multiple reporters submitting prices", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      const r1 = submitPrice(50000000, wallet1());
      const r2 = submitPrice(50500000, wallet2());
      expect(r1.result).toBeOk(Cl.bool(true));
      expect(r2.result).toBeOk(Cl.bool(true));
    });
  });

  // ── deviation checks ────────────────────────────────────────────

  describe("deviation checks", () => {
    it("accepts price within deviation threshold", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      // 10% change is within 20% default threshold
      const { result } = submitPrice(55000000, wallet2());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects price exceeding deviation threshold", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      // 25% change exceeds 20% default threshold
      const { result } = submitPrice(62500001, wallet2());
      expect(result).toBeErr(Cl.uint(305));
    });

    it("accepts first price without deviation check", () => {
      initOracle();
      addReporter(wallet1());
      // No existing aggregate, so any valid price should be accepted
      const { result } = submitPrice(99999999, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects price deviating downward too far", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      // 25% drop exceeds 20% threshold
      const { result } = submitPrice(37499999, wallet2());
      expect(result).toBeErr(Cl.uint(305));
    });

    it("increments rejection count on deviation failure", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      submitPrice(80000000, wallet2()); // will be rejected
      const { result } = getOracleStats();
      const data = result as any;
      expect(data.value["total-rejections"]).toBeUint(1);
    });
  });

  // ── admin functions ─────────────────────────────────────────────

  describe("admin functions", () => {
    it("allows owner to set admin price override", () => {
      initOracle();
      const { result } = adminSetPrice(45000000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("admin price updates aggregated price", () => {
      initOracle();
      adminSetPrice(45000000);
      const { result } = getPrice();
      expect(result).toBeUint(45000000);
    });

    it("rejects admin price from non-owner", () => {
      initOracle();
      const { result } = simnet.callPublicFn(
        CONTRACT, "admin-set-price", [Cl.uint(45000000)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(301));
    });

    it("rejects zero admin price", () => {
      initOracle();
      const { result } = adminSetPrice(0);
      expect(result).toBeErr(Cl.uint(303));
    });

    it("rejects admin price exceeding max sanity", () => {
      initOracle();
      const { result } = adminSetPrice(1000000000001);
      expect(result).toBeErr(Cl.uint(303));
    });

    it("allows owner to pause oracle", () => {
      initOracle();
      const { result } = pauseOracle();
      expect(result).toBeOk(Cl.bool(true));
    });

    it("allows owner to unpause oracle", () => {
      initOracle();
      pauseOracle();
      const { result } = unpauseOracle();
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects pause from non-owner", () => {
      initOracle();
      const { result } = simnet.callPublicFn(CONTRACT, "pause-oracle", [], wallet1());
      expect(result).toBeErr(Cl.uint(301));
    });

    it("rejects unpause from non-owner", () => {
      initOracle();
      pauseOracle();
      const { result } = simnet.callPublicFn(CONTRACT, "unpause-oracle", [], wallet1());
      expect(result).toBeErr(Cl.uint(301));
    });

    it("allows owner to set min-reporters", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      addReporter(wallet3());
      const { result } = setMinReporters(3);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects min-reporters below 1", () => {
      initOracle();
      const { result } = setMinReporters(0);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects min-reporters above max", () => {
      initOracle();
      const { result } = setMinReporters(11);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("allows owner to set max-deviation", () => {
      initOracle();
      const { result } = setMaxDeviation(1000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects zero max-deviation", () => {
      initOracle();
      const { result } = setMaxDeviation(0);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects max-deviation above 50%", () => {
      initOracle();
      const { result } = setMaxDeviation(5001);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("allows owner to set max-price-age", () => {
      initOracle();
      const { result } = setMaxPriceAge(144);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects max-price-age below minimum", () => {
      initOracle();
      const { result } = setMaxPriceAge(71);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects max-price-age above maximum", () => {
      initOracle();
      const { result } = setMaxPriceAge(2017);
      expect(result).toBeErr(Cl.uint(310));
    });
  });

  // ── read-only queries ───────────────────────────────────────────

  describe("read-only queries", () => {
    it("returns contract version", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-contract-version", [], deployer()
      );
      expect(result).toBeAscii("1.0.0");
    });

    it("returns aggregated price with freshness", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      const { result } = getAggregatedPrice();
      const data = result as any;
      expect(data.value.price).toBeUint(50000000);
      expect(data.value["is-fresh"]).toBeBool(true);
    });

    it("returns zero price age when no price submitted", () => {
      initOracle();
      const { result } = getPriceAge();
      expect(result).toBeUint(0);
    });

    it("returns correct price age after blocks", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      simnet.mineEmptyBlocks(10);
      const { result } = getPriceAge();
      expect(result).toBeUint(10);
    });

    it("returns oracle params", () => {
      initOracle();
      const { result } = getOracleParams();
      expect(result).toBeTuple({
        "min-reporters-required": Cl.uint(1),
        "max-price-age": Cl.uint(288),
        "max-deviation-bps": Cl.uint(2000),
        "reporter-count": Cl.uint(0),
        "is-paused": Cl.bool(false),
      });
    });

    it("returns oracle stats with submission counts", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      submitPrice(50100000, wallet1());
      const { result } = getOracleStats();
      const data = result as any;
      expect(data.value["total-submissions"]).toBeUint(2);
      expect(data.value["total-rejections"]).toBeUint(0);
      expect(data.value["reporter-count"]).toBeUint(1);
    });

    it("returns zero for non-reporter submissions", () => {
      initOracle();
      const { result } = getReporterSubmissions(wallet3());
      expect(result).toBeUint(0);
    });

    it("returns none for non-reporter price", () => {
      initOracle();
      const { result } = getReporterPrice(wallet3());
      expect(result).toBeNone();
    });

    it("returns false for non-reporter active check", () => {
      initOracle();
      const { result } = isActiveReporter(wallet3());
      expect(result).toBeBool(false);
    });
  });

  // ── edge cases ──────────────────────────────────────────────────

  describe("edge cases", () => {
    it("reporter can update their own price", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      submitPrice(51000000, wallet1());
      const { result } = getReporterPrice(wallet1());
      const data = result as any;
      expect(data.value.value.price).toBeUint(51000000);
    });

    it("removed reporter cannot submit prices", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      removeReporter(wallet1());
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeErr(Cl.uint(302));
    });

    it("submissions resume after unpause", () => {
      initOracle();
      addReporter(wallet1());
      pauseOracle();
      unpauseOracle();
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("admin price bypasses deviation check", () => {
      initOracle();
      addReporter(wallet1());
      submitPrice(50000000, wallet1());
      // Admin can set price far from aggregate
      const { result } = adminSetPrice(100000000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("tightened deviation rejects previously valid price", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      // Tighten deviation to 5%
      setMaxDeviation(500);
      // 10% change now exceeds 5% threshold
      const { result } = submitPrice(55000001, wallet2());
      expect(result).toBeErr(Cl.uint(305));
    });

    it("widened deviation accepts previously invalid price", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      submitPrice(50000000, wallet1());
      // Widen deviation to 50%
      setMaxDeviation(5000);
      // 40% change now within 50% threshold
      const { result } = submitPrice(70000000, wallet2());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("re-added reporter can submit prices again", () => {
      initOracle();
      addReporter(wallet1());
      addReporter(wallet2());
      removeReporter(wallet1());
      addReporter(wallet1());
      const { result } = submitPrice(50000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("boundary: price at exact max sanity is rejected", () => {
      initOracle();
      addReporter(wallet1());
      // MAX-SANE-PRICE is u1000000000000, must be strictly less
      const { result } = submitPrice(1000000000000, wallet1());
      expect(result).toBeErr(Cl.uint(303));
    });

    it("boundary: price just under max sanity is accepted", () => {
      initOracle();
      addReporter(wallet1());
      const { result } = submitPrice(999999999999, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });
});
