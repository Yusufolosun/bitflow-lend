import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 dashboard snapshot tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

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
  const getSnapshot = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-dashboard-snapshot", [], deployer());

  const setup = () => {
    init();
    setPrice(100);
  };

  it("returns all expected fields", () => {
    setup();
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("total-deposits", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-repaid", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-liquidations", Cl.uint(0));
    expect(result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(0));
    expect(result).toHaveTupleProperty("utilization-bps", Cl.uint(0));
    expect(result).toHaveTupleProperty("stx-price", Cl.uint(100));
    expect(result).toHaveTupleProperty("is-paused", Cl.bool(false));
  });

  it("reflects deposits in snapshot", () => {
    setup();
    deposit(5_000_000, wallet1());
    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("total-deposits", Cl.uint(5_000_000));
  });

  it("calculates utilization after borrow", () => {
    setup();
    deposit(10_000_000, wallet1());
    borrow(5_000_000, 500, 30, wallet1());

    const { result } = getSnapshot();
    // utilization = 5M / 10M * 10000 = 5000 bps = 50%
    expect(result).toHaveTupleProperty("utilization-bps", Cl.uint(5000));
  });

  it("includes volume metrics", () => {
    setup();
    deposit(10_000_000, wallet1());
    borrow(2_000_000, 500, 30, wallet1());

    const { result } = getSnapshot();
    expect(result).toHaveTupleProperty("deposit-volume", Cl.uint(10_000_000));
    expect(result).toHaveTupleProperty("borrow-volume", Cl.uint(2_000_000));
  });

  it("includes protocol age", () => {
    setup();
    simnet.mineEmptyBlocks(10);
    const { result } = getSnapshot();
    const age = (result as any).data?.["protocol-age-blocks"]?.value;
    expect(Number(age)).toBeGreaterThanOrEqual(10);
  });
});
