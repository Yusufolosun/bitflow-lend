import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("oracle deviation bounds manipulation", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;
  const wallet1 = () => accounts().get("wallet_1")!;

  const setup = () => {
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(wallet1())], deployer());
  };

  it("rejects price beyond 20% default deviation with err u305", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(1000000)], wallet1());
    // 25% up = 1250000
    const { result } = simnet.callPublicFn(
      CONTRACT, "submit-price", [Cl.uint(1250000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(305));
  });

  it("accepts price within 20% deviation", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(1000000)], wallet1());
    // 15% up = 1150000
    const { result } = simnet.callPublicFn(
      CONTRACT, "submit-price", [Cl.uint(1150000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("tightened deviation rejects previously valid change with err u305", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(1000000)], wallet1());
    // Tighten to 5%
    simnet.callPublicFn(
      CONTRACT, "set-max-deviation", [Cl.uint(500)], deployer()
    );
    // 10% change should now be rejected
    const { result } = simnet.callPublicFn(
      CONTRACT, "submit-price", [Cl.uint(1100000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(305));
  });

  it("widened deviation accepts previously invalid change", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "submit-price", [Cl.uint(1000000)], wallet1());
    // Widen to 50%
    simnet.callPublicFn(
      CONTRACT, "set-max-deviation", [Cl.uint(5000)], deployer()
    );
    // 40% change should now be accepted
    const { result } = simnet.callPublicFn(
      CONTRACT, "submit-price", [Cl.uint(1400000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });
});
