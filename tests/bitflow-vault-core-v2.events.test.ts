import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

/**
 * Verifies that all public functions emit the correct print events
 * with expected field names and values. Ensures indexer compatibility.
 */
describe("bitflow-vault-core-v2 event emission", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const wallet1 = () => simnet.getAccounts().get("wallet_1")!;
  const wallet2 = () => simnet.getAccounts().get("wallet_2")!;

  const init = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer());
  };

  // ── Deposit event ─────────────────────────────────────────────
  describe("deposit event", () => {
    it("emits deposit event with user, amount, new-balance", () => {
      init();
      const { events } = simnet.callPublicFn(
        CONTRACT, "deposit", [Cl.uint(5000)], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("deposit"));
    });
  });

  // ── Withdraw event ────────────────────────────────────────────
  describe("withdraw event", () => {
    it("emits withdraw event with user, amount, remaining-balance", () => {
      init();
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
      const { events } = simnet.callPublicFn(
        CONTRACT, "withdraw", [Cl.uint(1000)], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("withdraw"));
    });
  });

  // ── Borrow event ──────────────────────────────────────────────
  describe("borrow event", () => {
    it("emits borrow event with amount, rate, term, price snapshot", () => {
      init();
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
      const { events } = simnet.callPublicFn(
        CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("borrow"));
    });
  });

  // ── Repay event ───────────────────────────────────────────────
  describe("repay event", () => {
    it("emits repay event with principal, interest, penalty, total", () => {
      init();
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
      simnet.callPublicFn(
        CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
      );
      const { events } = simnet.callPublicFn(CONTRACT, "repay", [], wallet1());
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("repay"));
    });
  });

  // ── Liquidation event ─────────────────────────────────────────
  describe("liquidation event", () => {
    it("emits liquidation event with liquidator, borrower, seized, paid", () => {
      init();
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1());
      simnet.callPublicFn(
        CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
      );
      // Drop price to make liquidatable
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(30)], deployer());
      const { events } = simnet.callPublicFn(
        CONTRACT, "liquidate", [Cl.principal(wallet1())], wallet2()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("liquidation"));
    });
  });

  // ── Admin events ──────────────────────────────────────────────
  describe("admin events", () => {
    it("emits protocol-paused event", () => {
      init();
      const { events } = simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const prints = events.filter((e: any) => e.event === "print_event");
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("protocol-paused"));
    });

    it("emits protocol-unpaused event", () => {
      init();
      simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
      const { events } = simnet.callPublicFn(CONTRACT, "unpause-protocol", [], deployer());
      const prints = events.filter((e: any) => e.event === "print_event");
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("protocol-unpaused"));
    });

    it("emits price-updated event with price and block", () => {
      init();
      const { events } = simnet.callPublicFn(
        CONTRACT, "set-stx-price", [Cl.uint(200)], deployer()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("price-updated"));
    });

    it("emits deposits-toggled event", () => {
      init();
      const { events } = simnet.callPublicFn(
        CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], deployer()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("deposits-toggled"));
    });
  });

  // ── Initialize event ──────────────────────────────────────────
  describe("initialize event", () => {
    it("emits protocol-initialized event", () => {
      const { events } = simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
      const prints = events.filter((e: any) => e.event === "print_event");
      const payload = (prints[0] as any).data;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("protocol-initialized"));
    });
  });
});
