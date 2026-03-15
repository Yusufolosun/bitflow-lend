import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 price-valid edge cases", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("price is invalid when price is zero", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-protocol-stats", [], deployer()
    );
    const data = result as any;
    expect(data.value["price-valid"]).toBeBool(false);
  });

  it("price is valid immediately after set", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(50000)], deployer());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-protocol-stats", [], deployer()
    );
    const data = result as any;
    expect(data.value["price-valid"]).toBeBool(true);
  });

  it("price becomes stale after 144 blocks", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(50000)], deployer());
    simnet.mineEmptyBlocks(144);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-protocol-stats", [], deployer()
    );
    const data = result as any;
    expect(data.value["price-valid"]).toBeBool(false);
  });

  it("price refreshes after re-setting within staleness window", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(50000)], deployer());
    simnet.mineEmptyBlocks(100);
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(55000)], deployer());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-protocol-stats", [], deployer()
    );
    const data = result as any;
    expect(data.value["price-valid"]).toBeBool(true);
  });

  it("borrow fails when price is stale", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(50000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.mineEmptyBlocks(145);
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeErr(Cl.uint(114));
  });

  it("borrow succeeds when price is fresh", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(50000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    const { result } = simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
