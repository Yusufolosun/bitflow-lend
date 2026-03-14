import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry boundary tests", () => {
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
  const pause = () =>
    simnet.callPublicFn(CONTRACT, "pause-oracle", [], deployer());
  const unpause = () =>
    simnet.callPublicFn(CONTRACT, "unpause-oracle", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(wallet1());
  };

  // ── Price validation ────────────────────────────────────────────
  describe("price boundaries", () => {
    it("rejects zero price", () => {
      setup();
      const { result } = submitPrice(0, wallet1());
      expect(result).toBeErr(Cl.uint(303)); // ERR-INVALID-PRICE
    });

    it("rejects price at sanity limit", () => {
      setup();
      // MAX-SANE-PRICE is u1000000000000
      const { result } = submitPrice(1_000_000_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(303)); // ERR-INVALID-PRICE
    });

    it("accepts price just under sanity limit", () => {
      setup();
      const { result } = submitPrice(999_999_999_999, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts minimum valid price (1)", () => {
      setup();
      const { result } = submitPrice(1, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Reporter authorization ──────────────────────────────────────
  describe("reporter authorization", () => {
    it("rejects submission from non-reporter", () => {
      setup();
      const { result } = submitPrice(100_000_000, wallet2());
      expect(result).toBeErr(Cl.uint(302)); // ERR-NOT-REPORTER
    });

    it("rejects adding duplicate reporter", () => {
      setup();
      const { result } = addReporter(wallet1());
      expect(result).toBeErr(Cl.uint(306)); // ERR-ALREADY-REPORTER
    });

    it("rejects removing non-existent reporter", () => {
      setup();
      const { result } = removeReporter(wallet2());
      expect(result).toBeErr(Cl.uint(307)); // ERR-REPORTER-NOT-FOUND
    });

    it("rejects removing below minimum reporters", () => {
      setup();
      // Only 1 reporter, min-reporters-required defaults to 1
      const { result } = removeReporter(wallet1());
      expect(result).toBeErr(Cl.uint(308)); // ERR-MIN-REPORTERS
    });

    it("allows removal when above minimum count", () => {
      setup();
      addReporter(wallet2());
      // Now 2 reporters, min is 1, can remove one
      const { result } = removeReporter(wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Deviation guard ─────────────────────────────────────────────
  describe("deviation guard", () => {
    it("rejects price exceeding deviation threshold", () => {
      setup();
      submitPrice(1_000_000, wallet1()); // baseline: $1.00
      // Now submit > 20% deviation
      const { result } = submitPrice(1_300_000, wallet1()); // +30%
      expect(result).toBeOk(Cl.bool(false)); // ERR-DEVIATION-TOO-HIGH
    });

    it("accepts price within deviation threshold", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      // 15% deviation — within default 20% max
      const { result } = submitPrice(1_150_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts first price with no reference", () => {
      setup();
      // No aggregated price yet — anything valid should work
      const { result } = submitPrice(5_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Admin parameter bounds ──────────────────────────────────────
  describe("admin parameter bounds", () => {
    it("rejects min-reporters below 1", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-reporters", [Cl.uint(0)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310)); // ERR-INVALID-PARAM
    });

    it("rejects min-reporters above MAX-REPORTERS (10)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-reporters", [Cl.uint(11)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310));
    });

    it("accepts min-reporters at boundaries (1 and 10)", () => {
      setup();
      let { result } = simnet.callPublicFn(
        CONTRACT, "set-min-reporters", [Cl.uint(1)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));

      ({ result } = simnet.callPublicFn(
        CONTRACT, "set-min-reporters", [Cl.uint(10)], deployer()
      ));
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects max-deviation of zero", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-max-deviation", [Cl.uint(0)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects max-deviation above 50% (5000 bps)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-max-deviation", [Cl.uint(5001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310));
    });

    it("accepts max-deviation at upper bound (5000)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-max-deviation", [Cl.uint(5000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects max-price-age below 72 blocks", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-max-price-age", [Cl.uint(71)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects max-price-age above 2016 blocks", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-max-price-age", [Cl.uint(2017)], deployer()
      );
      expect(result).toBeErr(Cl.uint(310));
    });
  });

  // ── Pause guards ────────────────────────────────────────────────
  describe("pause guards", () => {
    it("rejects submission when oracle is paused", () => {
      setup();
      pause();
      const { result } = submitPrice(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(309)); // ERR-PAUSED
    });

    it("allows submission after unpause", () => {
      setup();
      pause();
      unpause();
      const { result } = submitPrice(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Admin price override ────────────────────────────────────────
  describe("admin price override", () => {
    it("allows admin to set price directly", () => {
      setup();
      const { result } = adminSetPrice(2_500_000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects zero admin price", () => {
      setup();
      const { result } = adminSetPrice(0);
      expect(result).toBeErr(Cl.uint(303)); // ERR-INVALID-PRICE
    });

    it("rejects admin price at sanity limit", () => {
      setup();
      const { result } = adminSetPrice(1_000_000_000_000);
      expect(result).toBeErr(Cl.uint(303));
    });

    it("rejects non-owner admin price override", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "admin-set-price", [Cl.uint(1_000_000)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(301)); // ERR-OWNER-ONLY
    });
  });

  // ── Read-only freshness ─────────────────────────────────────────
  describe("price freshness", () => {
    it("reports stale when no price has been submitted", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-is-price-fresh", [], deployer()
      );
      expect(result).toBeBool(false);
    });

    it("reports fresh after submission", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-is-price-fresh", [], deployer()
      );
      expect(result).toBeBool(true);
    });

    it("reports price age correctly", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      simnet.mineEmptyBlocks(10);
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-price-age", [], deployer()
      );
      expect(result).toBeUint(10);
    });
  });

  // ── Double initialization ───────────────────────────────────────
  describe("initialization", () => {
    it("rejects double initialization", () => {
      setup();
      const { result } = initOracle();
      expect(result).toBeErr(Cl.uint(301)); // ERR-OWNER-ONLY (already initialized)
    });

    it("rejects non-owner initialization", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT, "initialize-oracle", [], wallet1()
      );
      expect(result).toBeErr(Cl.uint(301));
    });
  });

  // ── Submission metrics ──────────────────────────────────────────
  describe("submission tracking", () => {
    it("increments submission count per reporter", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      submitPrice(1_050_000, wallet1());

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-reporter-submissions",
        [Cl.principal(wallet1())], deployer()
      );
      expect(result).toBeUint(2);
    });

    it("tracks rejections in oracle stats", () => {
      setup();
      submitPrice(1_000_000, wallet1());
      submitPrice(2_000_000, wallet1()); // rejected — too far from 1M

      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-oracle-stats", [], deployer()
      );
      const stats = result as any;
      // result is a tuple; check total-rejections field
      expect(stats.value["total-rejections"]).toStrictEqual(Cl.uint(1));
    });
  });
});
