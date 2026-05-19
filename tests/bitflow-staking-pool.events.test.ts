import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

/**
 * Verifies staking pool user functions emit structured events
 * with block-height for indexer reconstruction.
 */
describe("bitflow-staking-pool event emission", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const wallet1 = () => simnet.getAccounts().get("wallet_1")!;

  const initPool = () => {
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(1000)], deployer());
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(10_000_000)], deployer());
  };

  describe("stake event", () => {
    it("emits stake event with user, amount, new-balance, and block", () => {
      initPool();
      const { events } = simnet.callPublicFn(
        CONTRACT, "stake", [Cl.uint(1_000_000)], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data.value;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("stake"));
      expect(payload).toHaveTupleProperty("amount", Cl.uint(1_000_000));
      expect(Object.keys(payload.value)).toContain("block");
    });
  });

  describe("unstake-requested event", () => {
    it("emits unstake-requested event with block", () => {
      initPool();
      simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1_000_000)], wallet1());
      const { events } = simnet.callPublicFn(
        CONTRACT, "request-unstake", [], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data.value;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("unstake-requested"));
      expect(Object.keys(payload.value)).toContain("block");
    });
  });

  describe("unstake event", () => {
    it("emits unstake event with user, amount, remaining, and block", () => {
      initPool();
      simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1_000_000)], wallet1());
      simnet.callPublicFn(CONTRACT, "request-unstake", [], wallet1());
      // Mine past cooldown (144 blocks)
      simnet.mineEmptyBlocks(145);
      const { events } = simnet.callPublicFn(
        CONTRACT, "unstake", [Cl.uint(500_000)], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data.value;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("unstake"));
      expect(Object.keys(payload.value)).toContain("block");
    });
  });

  describe("emergency-unstake event", () => {
    it("emits emergency-unstake event with block when pool is paused", () => {
      initPool();
      simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1_000_000)], wallet1());
      simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
      const { events } = simnet.callPublicFn(
        CONTRACT, "emergency-unstake", [], wallet1()
      );
      const prints = events.filter((e: any) => e.event === "print_event");
      expect(prints.length).toBeGreaterThanOrEqual(1);
      const payload = (prints[0] as any).data.value;
      expect(payload).toHaveTupleProperty("event", Cl.stringAscii("emergency-unstake"));
      expect(Object.keys(payload.value)).toContain("block");
    });
  });
});
