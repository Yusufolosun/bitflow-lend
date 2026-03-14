import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 admin parameter bounds tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── set-min-collateral-ratio ────────────────────────────────────
  describe("set-min-collateral-ratio", () => {
    it("rejects below 100%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(99)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120)); // ERR-INVALID-PARAM
    });

    it("rejects above 500%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(501)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("accepts 100%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(100)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts 500%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(500)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects non-admin caller", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-collateral-ratio", [Cl.uint(150)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109)); // ERR-OWNER-ONLY
    });
  });

  // ── set-liquidation-threshold ───────────────────────────────────
  describe("set-liquidation-threshold", () => {
    it("rejects below 100%", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-threshold", [Cl.uint(99)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects at or above collateral ratio", () => {
      setup();
      // Default collateral ratio is 150
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-threshold", [Cl.uint(150)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("accepts valid threshold below collateral ratio", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-liquidation-threshold", [Cl.uint(120)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── set-interest-rate-bounds ────────────────────────────────────
  describe("set-interest-rate-bounds", () => {
    it("rejects zero min rate", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds",
        [Cl.uint(0), Cl.uint(1000)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects max ≤ min", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds",
        [Cl.uint(500), Cl.uint(500)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects max above 50000 (500% APR)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds",
        [Cl.uint(50), Cl.uint(50001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("accepts valid bounds", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-interest-rate-bounds",
        [Cl.uint(100), Cl.uint(5000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── set-term-limits ─────────────────────────────────────────────
  describe("set-term-limits", () => {
    it("rejects zero min term", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits",
        [Cl.uint(0), Cl.uint(365)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects max ≤ min", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits",
        [Cl.uint(30), Cl.uint(30)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("rejects max above 730 days", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits",
        [Cl.uint(1), Cl.uint(731)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("accepts valid limits", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-term-limits",
        [Cl.uint(7), Cl.uint(365)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── set-late-penalty-rate ───────────────────────────────────────
  describe("set-late-penalty-rate", () => {
    it("rejects above 2000 bps (20%)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate",
        [Cl.uint(2001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(120));
    });

    it("accepts zero (no penalty)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate",
        [Cl.uint(0)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts max (2000 bps)", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-late-penalty-rate",
        [Cl.uint(2000)], deployer()
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── set-stx-price ──────────────────────────────────────────────
  describe("set-stx-price", () => {
    it("rejects zero price", () => {
      setup();
      const { result } = setPrice(0);
      expect(result).toBeErr(Cl.uint(117)); // ERR-INVALID-PRICE
    });

    it("rejects price above sanity cap", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(100000001)], deployer()
      );
      expect(result).toBeErr(Cl.uint(117)); // ERR-INVALID-PRICE
    });

    it("non-admin cannot set price", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(100)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109)); // ERR-OWNER-ONLY
    });
  });

  // ── get-protocol-parameters ─────────────────────────────────────
  describe("get-protocol-parameters", () => {
    it("returns all parameter fields", () => {
      setup();
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-protocol-parameters", [], deployer()
      );
      expect(result).toHaveTupleProperty("min-collateral-ratio", Cl.uint(150));
      expect(result).toHaveTupleProperty("late-penalty-rate", Cl.uint(500));
    });
  });
});
