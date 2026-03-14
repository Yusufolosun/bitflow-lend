import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

/**
 * Tests multi-reporter interactions: consensus price updates,
 * deviation rejection across reporters, and submission ordering.
 */
describe("bitflow-oracle-registry multi-reporter consensus", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const reporter1 = () => simnet.getAccounts().get("wallet_1")!;
  const reporter2 = () => simnet.getAccounts().get("wallet_2")!;
  const reporter3 = () => simnet.getAccounts().get("wallet_3")!;

  const initOracle = () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  };

  const addReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(addr)], deployer());

  const submitPrice = (price: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(price)], sender);

  const getAggregated = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-aggregated-price", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(reporter1());
    addReporter(reporter2());
    addReporter(reporter3());
  };

  // ── Multiple reporters can submit prices ──────────────────────
  it("all reporters can submit prices", () => {
    setup();
    const r1 = submitPrice(1_000_000, reporter1());
    const r2 = submitPrice(1_010_000, reporter2());
    const r3 = submitPrice(1_005_000, reporter3());
    expect(r1.result).toBeOk(Cl.bool(true));
    expect(r2.result).toBeOk(Cl.bool(true));
    expect(r3.result).toBeOk(Cl.bool(true));
  });

  // ── Latest valid submission becomes aggregate ─────────────────
  it("aggregate reflects last valid submission", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    submitPrice(1_010_000, reporter2());
    submitPrice(1_005_000, reporter3());

    const { result } = getAggregated();
    // Last submission (reporter3) should be the aggregate
    expect(result).toHaveTupleProperty("price", Cl.uint(1_005_000));
  });

  // ── Reporter submission counts tracked independently ──────────
  it("tracks per-reporter submission counts", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    submitPrice(1_010_000, reporter2());
    submitPrice(1_005_000, reporter1());

    const r1Count = simnet.callReadOnlyFn(
      CONTRACT, "get-reporter-submissions",
      [Cl.principal(reporter1())], deployer()
    );
    const r2Count = simnet.callReadOnlyFn(
      CONTRACT, "get-reporter-submissions",
      [Cl.principal(reporter2())], deployer()
    );
    expect(r1Count.result).toBeUint(2);
    expect(r2Count.result).toBeUint(1);
  });

  // ── Deviation rejection doesn't block other reporters ─────────
  it("deviation rejection from one reporter doesn't block others", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    // Reporter2 submits wildly different price (>20% deviation)
    const rejected = submitPrice(2_000_000, reporter2());
    expect(rejected.result).toBeErr(Cl.uint(305));

    // Reporter3 can still submit a valid price
    const accepted = submitPrice(1_050_000, reporter3());
    expect(accepted.result).toBeOk(Cl.bool(true));
  });

  // ── Non-reporter cannot submit ────────────────────────────────
  it("non-reporter cannot submit a price", () => {
    setup();
    const nonReporter = simnet.getAccounts().get("wallet_4")!;
    const { result } = submitPrice(1_000_000, nonReporter);
    expect(result).toBeErr(Cl.uint(302));
  });

  // ── Removed reporter cannot submit ────────────────────────────
  it("removed reporter cannot submit prices", () => {
    setup();
    submitPrice(1_000_000, reporter1()); // establish price
    simnet.callPublicFn(
      CONTRACT, "remove-reporter",
      [Cl.principal(reporter3())], deployer()
    );
    const { result } = submitPrice(1_010_000, reporter3());
    expect(result).toBeErr(Cl.uint(302));
  });

  // ── Individual reporter prices tracked ────────────────────────
  it("stores individual reporter prices", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    submitPrice(1_020_000, reporter2());

    const r1Price = simnet.callReadOnlyFn(
      CONTRACT, "get-reporter-price",
      [Cl.principal(reporter1())], deployer()
    );
    const r2Price = simnet.callReadOnlyFn(
      CONTRACT, "get-reporter-price",
      [Cl.principal(reporter2())], deployer()
    );

    expect(r1Price.result).toBeSome(expect.objectContaining({}));
    expect(r2Price.result).toBeSome(expect.objectContaining({}));
  });

  // ── Stats track total submissions and rejections ──────────────
  it("oracle stats reflect submissions and rejections", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    submitPrice(1_010_000, reporter2());
    submitPrice(5_000_000, reporter3()); // should be rejected

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-oracle-stats", [], deployer()
    );
    expect(result).toHaveTupleProperty("total-submissions", Cl.uint(2));
    expect(result).toHaveTupleProperty("total-rejections", Cl.uint(1));
  });
});
