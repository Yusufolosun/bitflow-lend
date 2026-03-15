import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("v2 deposit validation", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  it("rejects zero deposit", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(0)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(119));
  });

  it("rejects deposit exceeding per-user limit", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(10000000000001)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(101));
  });

  it("accepts a valid deposit", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(5000000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("increments deposit count metric", () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000000)], wallet1());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-protocol-metrics", [], deployer()
    );
    const data = result as any;
    expect(data.value["total-deposits"]).toBeUint(2);
  });
});
