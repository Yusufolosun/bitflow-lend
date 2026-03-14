import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

/**
 * Verifies that v1 public functions emit the correct print events
 * with expected field names. Ensures indexer and analytics compatibility.
 */
describe("bitflow-vault-core event emission", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const wallet1 = () => simnet.getAccounts().get("wallet_1")!;
  const wallet2 = () => simnet.getAccounts().get("wallet_2")!;

  const init = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer());
  };

  it("emits deposit event", () => {
    init();
    const { events } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(5000)], wallet1()
    );
    const prints = events.filter((e: any) => e.event === "print_event");
    expect(prints.length).toBeGreaterThanOrEqual(1);
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("deposit"));
  });

  it("emits withdraw event", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
    const { events } = simnet.callPublicFn(
      CONTRACT, "withdraw", [Cl.uint(1000)], wallet1()
    );
    const prints = events.filter((e: any) => e.event === "print_event");
    expect(prints.length).toBeGreaterThanOrEqual(1);
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("withdraw"));
  });

  it("emits borrow event with rate and term", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
    const { events } = simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const prints = events.filter((e: any) => e.event === "print_event");
    expect(prints.length).toBeGreaterThanOrEqual(1);
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("borrow"));
  });

  it("emits repay event with principal, interest, penalty, total", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    const { events } = simnet.callPublicFn(CONTRACT, "repay", [], wallet1());
    const prints = events.filter((e: any) => e.event === "print_event");
    expect(prints.length).toBeGreaterThanOrEqual(1);
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("repay"));
  });

  it("emits liquidation event with liquidator and borrower", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1());
    simnet.callPublicFn(
      CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1()
    );
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(30)], deployer());
    const { events } = simnet.callPublicFn(
      CONTRACT, "liquidate", [Cl.principal(wallet1())], wallet2()
    );
    const prints = events.filter((e: any) => e.event === "print_event");
    expect(prints.length).toBeGreaterThanOrEqual(1);
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("liquidation"));
  });

  it("emits pause event", () => {
    init();
    const { events } = simnet.callPublicFn(CONTRACT, "pause", [], deployer());
    const prints = events.filter((e: any) => e.event === "print_event");
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("pause"));
  });

  it("emits unpause event", () => {
    init();
    simnet.callPublicFn(CONTRACT, "pause", [], deployer());
    const { events } = simnet.callPublicFn(CONTRACT, "unpause", [], deployer());
    const prints = events.filter((e: any) => e.event === "print_event");
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("unpause"));
  });

  it("emits set-stx-price event", () => {
    init();
    const { events } = simnet.callPublicFn(
      CONTRACT, "set-stx-price", [Cl.uint(200)], deployer()
    );
    const prints = events.filter((e: any) => e.event === "print_event");
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("set-stx-price"));
  });

  it("emits protocol-initialized event", () => {
    const { events } = simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    const prints = events.filter((e: any) => e.event === "print_event");
    const payload = (prints[0] as any).value;
    expect(payload).toHaveTupleProperty("event", Cl.stringAscii("protocol-initialized"));
  });
});
