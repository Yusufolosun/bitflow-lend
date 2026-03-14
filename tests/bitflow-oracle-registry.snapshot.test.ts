import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry dashboard snapshot tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const reporter1 = () => getAccounts().get("wallet_1")!;

  const initOracle = () =>
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  const addReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(addr)], deployer());
  const submitPrice = (price: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(price)], sender);
  const getSnapshot = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-dashboard-snapshot", [], deployer());

  const setup = () => {
    initOracle();
    addReporter(reporter1());
  };

  it("returns all expected fields on fresh oracle", () => {
    setup();
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("aggregated-price", Cl.uint(0));
    expect(result).toHaveTupleProperty("reporter-count", Cl.uint(1));
    expect(result).toHaveTupleProperty("total-submissions", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-rejections", Cl.uint(0));
    expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
    expect(result).toHaveTupleProperty("is-fresh", Cl.bool(false));
  });

  it("reflects price after submission", () => {
    setup();
    submitPrice(1_500_000, reporter1());
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("aggregated-price", Cl.uint(1_500_000));
    expect(result).toHaveTupleProperty("is-fresh", Cl.bool(true));
    expect(result).toHaveTupleProperty("total-submissions", Cl.uint(1));
  });

  it("includes oracle configuration", () => {
    setup();
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("min-reporters-required", Cl.uint(1));
    expect(result).toHaveTupleProperty("max-deviation-bps", Cl.uint(2000));
    expect(result).toHaveTupleProperty("max-price-age", Cl.uint(288));
  });

  it("tracks price age in blocks", () => {
    setup();
    submitPrice(1_000_000, reporter1());
    simnet.mineEmptyBlocks(50);
    const { result } = getSnapshot();
    const age = (result as any).value?.["price-age-blocks"]?.value;
    expect(Number(age)).toBeGreaterThanOrEqual(50);
  });

  it("includes protocol age", () => {
    setup();
    simnet.mineEmptyBlocks(20);
    const { result } = getSnapshot();
    const age = (result as any).value?.["protocol-age-blocks"]?.value;
    expect(Number(age)).toBeGreaterThanOrEqual(20);
  });
});
