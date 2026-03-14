import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 per-function toggle tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const withdraw = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(amount)], sender);
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );
  const liquidate = (target: string, sender: string) =>
    simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(target)], sender);

  const toggle = (fn: string, enabled: boolean) =>
    simnet.callPublicFn(CONTRACT, fn, [Cl.bool(enabled)], deployer());

  const setup = (price = 100) => {
    init();
    setPrice(price);
  };

  // ── Deposits toggle ─────────────────────────────────────────────
  describe("deposits toggle", () => {
    it("blocks deposits when disabled", () => {
      setup();
      toggle("toggle-deposits-enabled", false);
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
    });

    it("allows deposits after re-enabling", () => {
      setup();
      toggle("toggle-deposits-enabled", false);
      toggle("toggle-deposits-enabled", true);
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Withdrawals toggle ──────────────────────────────────────────
  describe("withdrawals toggle", () => {
    it("blocks withdrawals when disabled", () => {
      setup();
      deposit(5_000_000, wallet1());
      toggle("toggle-withdrawals-enabled", false);
      const { result } = withdraw(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("allows withdrawals after re-enabling", () => {
      setup();
      deposit(5_000_000, wallet1());
      toggle("toggle-withdrawals-enabled", false);
      toggle("toggle-withdrawals-enabled", true);
      const { result } = withdraw(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Borrows toggle ──────────────────────────────────────────────
  describe("borrows toggle", () => {
    it("blocks borrows when disabled", () => {
      setup();
      deposit(10_000_000, wallet1());
      toggle("toggle-borrows-enabled", false);
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("allows borrows after re-enabling", () => {
      setup();
      deposit(10_000_000, wallet1());
      toggle("toggle-borrows-enabled", false);
      toggle("toggle-borrows-enabled", true);
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });
  });

  // ── Liquidations toggle ─────────────────────────────────────────
  describe("liquidations toggle", () => {
    it("blocks liquidations when disabled", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(5_000_000, 500, 30, wallet1());
      setPrice(50); // make undercollateralized
      toggle("toggle-liquidations-enabled", false);
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("allows liquidations after re-enabling", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(5_000_000, 500, 30, wallet1());
      setPrice(50);
      toggle("toggle-liquidations-enabled", false);
      toggle("toggle-liquidations-enabled", true);
      const { result } = liquidate(wallet1(), wallet2());
      expect(result).toBeOk(Cl.tuple({
        "seized-collateral": Cl.uint(10_000_000),
        "paid": Cl.uint(5_250_000),
        "bonus": Cl.uint(250_000),
      }));
    });
  });

  // ── Non-admin toggle rejection ──────────────────────────────────
  describe("non-admin toggle rejection", () => {
    it("rejects toggle-deposits-enabled from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109)); // ERR-OWNER-ONLY
    });

    it("rejects toggle-withdrawals-enabled from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "toggle-withdrawals-enabled", [Cl.bool(false)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109));
    });

    it("rejects toggle-borrows-enabled from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "toggle-borrows-enabled", [Cl.bool(false)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109));
    });

    it("rejects toggle-liquidations-enabled from non-owner", () => {
      setup();
      const { result } = simnet.callPublicFn(
        CONTRACT, "toggle-liquidations-enabled", [Cl.bool(false)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(109));
    });
  });

  // ── Independent toggle isolation ────────────────────────────────
  describe("toggle isolation", () => {
    it("disabling deposits does not affect withdrawals", () => {
      setup();
      deposit(5_000_000, wallet1());
      toggle("toggle-deposits-enabled", false);
      const { result } = withdraw(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("disabling borrows does not affect deposits", () => {
      setup();
      toggle("toggle-borrows-enabled", false);
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("disabling liquidations does not affect repayments", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(1_000_000, 500, 30, wallet1());
      toggle("toggle-liquidations-enabled", false);
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet1());
      expect(result).toBeOk(Cl.tuple({
        "principal": Cl.uint(1_000_000),
        "interest": Cl.uint(1), // ceiling division minimum
        "penalty": Cl.uint(0),
        "total": Cl.uint(1_000_001),
      }));
    });
  });

  // ── Global pause overrides toggles ──────────────────────────────
  describe("global pause overrides individual toggles", () => {
    it("deposits blocked when globally paused even if toggle is on", () => {
      setup();
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = deposit(1_000_000, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });

    it("borrows blocked when globally paused even if toggle is on", () => {
      setup();
      deposit(10_000_000, wallet1());
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { result } = borrow(1_000_000, 500, 30, wallet1());
      expect(result).toBeErr(Cl.uint(112));
    });
  });
});
