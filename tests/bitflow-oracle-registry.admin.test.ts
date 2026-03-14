import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-oracle-registry";

describe("bitflow-oracle-registry admin guard tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

  const initOracle = () =>
    simnet.callPublicFn(CONTRACT, "initialize-oracle", [], deployer());
  const addReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "add-reporter", [Cl.principal(addr)], deployer());
  const removeReporter = (addr: string) =>
    simnet.callPublicFn(CONTRACT, "remove-reporter", [Cl.principal(addr)], deployer());
  const setMinReporters = (min: number) =>
    simnet.callPublicFn(CONTRACT, "set-min-reporters", [Cl.uint(min)], deployer());
  const setMaxPriceAge = (age: number) =>
    simnet.callPublicFn(CONTRACT, "set-max-price-age", [Cl.uint(age)], deployer());

  const setup = () => {
    initOracle();
    addReporter(wallet1());
    addReporter(wallet2());
  };

  // ── set-min-reporters guards ────────────────────────────────────
  describe("set-min-reporters", () => {
    it("rejects zero min", () => {
      setup();
      const { result } = setMinReporters(0);
      expect(result).toBeErr(Cl.uint(310)); // ERR-INVALID-PARAM
    });

    it("rejects min above MAX-REPORTERS", () => {
      setup();
      const { result } = setMinReporters(11);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects min above current reporter count", () => {
      setup(); // 2 reporters
      const { result } = setMinReporters(3);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("accepts min equal to current reporter count", () => {
      setup(); // 2 reporters
      const { result } = setMinReporters(2);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts min of 1", () => {
      setup();
      const { result } = setMinReporters(1);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("non-admin cannot set min-reporters", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-min-reporters", [Cl.uint(1)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(301)); // ERR-OWNER-ONLY
    });
  });

  // ── remove-reporter guards ──────────────────────────────────────
  describe("remove-reporter guards", () => {
    it("cannot remove reporter below min-reporters", () => {
      setup(); // 2 reporters, min=1
      setMinReporters(2);
      const { result } = removeReporter(wallet1());
      expect(result).toBeErr(Cl.uint(308)); // ERR-MIN-REPORTERS
    });

    it("can remove reporter when above min", () => {
      setup(); // 2 reporters, min=1
      const { result } = removeReporter(wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("cannot remove non-existent reporter", () => {
      setup();
      const { result } = removeReporter(wallet3());
      expect(result).toBeErr(Cl.uint(307)); // ERR-REPORTER-NOT-FOUND
    });
  });

  // ── add-reporter guards ─────────────────────────────────────────
  describe("add-reporter guards", () => {
    it("cannot add duplicate reporter", () => {
      setup();
      const { result } = addReporter(wallet1());
      expect(result).toBeErr(Cl.uint(306)); // ERR-ALREADY-REPORTER
    });

    it("cannot exceed MAX-REPORTERS", () => {
      initOracle();
      // Add 10 reporters (max)
      const accounts = simnet.getAccounts();
      const wallets = Array.from(accounts.values()).slice(1, 11);
      for (const w of wallets) {
        addReporter(w);
      }
      // 11th should fail
      const { result } = addReporter(deployer());
      expect(result).toBeErr(Cl.uint(310)); // ERR-INVALID-PARAM
    });
  });

  // ── set-max-price-age guards ────────────────────────────────────
  describe("set-max-price-age", () => {
    it("rejects age below minimum (72 blocks)", () => {
      setup();
      const { result } = setMaxPriceAge(71);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("rejects age above maximum (2016 blocks)", () => {
      setup();
      const { result } = setMaxPriceAge(2017);
      expect(result).toBeErr(Cl.uint(310));
    });

    it("accepts age at minimum boundary", () => {
      setup();
      const { result } = setMaxPriceAge(72);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("accepts age at maximum boundary", () => {
      setup();
      const { result } = setMaxPriceAge(2016);
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── double initialization guard ─────────────────────────────────
  describe("double initialization", () => {
    it("rejects second initialization", () => {
      initOracle();
      const { result } = initOracle();
      expect(result).toBeErr(Cl.uint(301));
    });
  });

  // ── pause guards ────────────────────────────────────────────────
  describe("pause guards", () => {
    it("non-admin cannot pause", () => {
      setup();
      const { result } = simnet.callPublicFn(CONTRACT, "pause-oracle", [], wallet1());
      expect(result).toBeErr(Cl.uint(301));
    });

    it("non-admin cannot unpause", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "pause-oracle", [], deployer());
      const { result } = simnet.callPublicFn(CONTRACT, "unpause-oracle", [], wallet1());
      expect(result).toBeErr(Cl.uint(301));
    });
  });
});
