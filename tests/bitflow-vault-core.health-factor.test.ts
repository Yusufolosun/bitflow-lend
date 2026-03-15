import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

/**
 * Tests health factor edge cases: zero prices, no loan, boundary
 * thresholds for liquidation, and term-expired loans.
 */
describe("bitflow-vault-core health factor edge cases", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const wallet1 = () => simnet.getAccounts().get("wallet_1")!;
  const wallet2 = () => simnet.getAccounts().get("wallet_2")!;

  const setup = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer());
  };

  // -- No loan -> none ------------------------------------------------
  it("returns none when user has no loan", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(100)], deployer()
    );
    expect(result).toBeNone();
  });

  // -- Healthy at exactly 150% ----------------------------------------
  it("shows healthy at exactly 150% collateral ratio", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(100)], deployer()
    );
    // health = (150000 * 100 / 100) * 100 / 100000 = 150
    expect(result).toBeSome(Cl.uint(150));
  });

  // -- Exactly at liquidation threshold --------------------------------
  it("is not liquidatable at exactly 110%", () => {
    setup();
    // deposit 150000, borrow 100000
    // HF = (150000 * price / 100) * 100 / 100000 = 1.5 * price
    // HF at price 74 = (150000*74/100)*100/100000 = 111 -> not liquidatable
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "is-liquidatable",
      [Cl.principal(wallet1()), Cl.uint(74)], deployer()
    );
    expect(result).toBeBool(false);
  });

  // -- Just below liquidation threshold --------------------------------
  it("is liquidatable just below 110%", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    // HF at price 73 = (150000*73/100)*100/100000 = 109 -> liquidatable
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "is-liquidatable",
      [Cl.principal(wallet1()), Cl.uint(73)], deployer()
    );
    expect(result).toBeBool(true);
  });

  // -- Term-expired loan is liquidatable regardless of HF ---------------
  it("is liquidatable when term expires even with healthy HF", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(500000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(1)], wallet1()
    );
    // Mine past term end (1 day = 144 blocks)
    simnet.mineEmptyBlocks(150);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "is-liquidatable",
      [Cl.principal(wallet1()), Cl.uint(100)], deployer()
    );
    expect(result).toBeBool(true);
  });

  // -- No loan -> not liquidatable --------------------------------------
  it("is not liquidatable when user has no loan", () => {
    setup();
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "is-liquidatable",
      [Cl.principal(wallet1()), Cl.uint(100)], deployer()
    );
    expect(result).toBeBool(false);
  });

  // -- Health factor with zero price ------------------------------------
  it("health factor is zero when price is zero", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(500000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(0)], deployer()
    );
    // (500000 * 0 / 100) * 100 / 100000 = 0
    expect(result).toBeSome(Cl.uint(0));
  });

  // -- Very high price -> very high HF ---------------------------------
  it("health factor scales with very high price", () => {
    setup();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(150000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "calculate-health-factor",
      [Cl.principal(wallet1()), Cl.uint(10000)], deployer()
    );
    // (150000*10000/100)*100/100000 = 15000
    expect(result).toBeSome(Cl.uint(15000));
  });
});
