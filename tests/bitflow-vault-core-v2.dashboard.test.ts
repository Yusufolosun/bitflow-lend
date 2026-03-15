import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 dashboard snapshot", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("returns all fields in a single call", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-dashboard-snapshot", [], deployer()
    );
    const data = result as any;

    expect(data.value["total-deposits"]).toBeUint(10000000);
    expect(data.value["stx-price"]).toBeUint(10000);
    expect(data.value["is-paused"]).toBeBool(false);
  });

  it("reflects utilization after a borrow", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(10000)], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(10000000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(1000000), Cl.uint(500), Cl.uint(30)],
      wallet1()
    );

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-dashboard-snapshot", [], deployer()
    );
    const data = result as any;

    expect(data.value["total-outstanding-borrows"]).toBeUint(1000000);
    // 1M / 10M * 10000 = 1000 bps
    expect(data.value["utilization-bps"]).toBeUint(1000);
  });
});
