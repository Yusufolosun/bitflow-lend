import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("v1 late-penalty-rate minimum validation", () => {
  const accounts = () => simnet.getAccounts();
  const deployer = () => accounts().get("deployer")!;

  it("rejects setting late penalty rate to zero", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT, "set-late-penalty-rate", [Cl.uint(0)], deployer()
    );
    expect(result).toBeErr(Cl.uint(120));
  });

  it("rejects single-digit basis point penalty", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT, "set-late-penalty-rate", [Cl.uint(9)], deployer()
    );
    expect(result).toBeErr(Cl.uint(120));
  });

  it("accepts 10 basis points (0.1%) as minimum", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT, "set-late-penalty-rate", [Cl.uint(10)], deployer()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  it("rejects above 2000 basis points (20%)", () => {
    const { result } = simnet.callPublicFn(
      CONTRACT, "set-late-penalty-rate", [Cl.uint(2001)], deployer()
    );
    expect(result).toBeErr(Cl.uint(120));
  });
});
