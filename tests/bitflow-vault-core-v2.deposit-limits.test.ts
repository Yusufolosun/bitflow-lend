import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

/**
 * Verifies v2 deposit-limit enforcement: per-user caps, zero-amount
 * guard, and interaction with withdraw/deposit sequences.
 */
describe("bitflow-vault-core-v2 deposit limit enforcement", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const wallet1 = () => simnet.getAccounts().get("wallet_1")!;
  const wallet2 = () => simnet.getAccounts().get("wallet_2")!;

  const init = () => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(100)], deployer());
  };

  // ── Zero amount is rejected ───────────────────────────────────
  it("rejects zero deposit amount", () => {
    init();
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(0)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(119)); // ERR-ZERO-AMOUNT
  });

  // ── Normal deposit succeeds ───────────────────────────────────
  it("accepts valid deposit amount", () => {
    init();
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(5_000_000)], wallet1()
    );
    expect(result).toBeOk(Cl.bool(true));
  });

  // ── Multiple deposits accumulate ──────────────────────────────
  it("accumulates multiple deposits for same user", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3_000_000)], wallet1());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2_000_000)], wallet1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-user-deposit",
      [Cl.principal(wallet1())], deployer()
    );
    expect(result).toBeUint(5_000_000);
  });

  // ── Per-user cap rejects oversized single deposit ─────────────
  it("rejects single deposit exceeding DEPOSIT-LIMIT", () => {
    init();
    // DEPOSIT-LIMIT = 10_000_000_000_000 (10M STX in microSTX)
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(10_000_000_000_001)], wallet1()
    );
    // Should fail: amount >= DEPOSIT-LIMIT
    expect(result).toBeErr(expect.anything());
  });

  // ── Per-user cap rejects accumulated deposits over limit ──────
  it("rejects cumulative deposit exceeding DEPOSIT-LIMIT", () => {
    init();
    // Deposit just under the limit
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(9_999_999_999_990)], wallet1());
    // Second deposit pushes over
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(20)], wallet1()
    );
    // new-deposit = 10_000_000_000_010 > DEPOSIT-LIMIT
    expect(result).toBeErr(expect.anything());
  });

  // ── Different users have independent caps ─────────────────────
  it("each user has independent deposit cap", () => {
    init();
    const r1 = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(5_000_000_000_000)], wallet1()
    );
    const r2 = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(5_000_000_000_000)], wallet2()
    );
    expect(r1.result).toBeOk(Cl.bool(true));
    expect(r2.result).toBeOk(Cl.bool(true));
  });

  // ── Deposit blocked when deposits toggle disabled ─────────────
  it("rejects deposit when deposits are disabled", () => {
    init();
    simnet.callPublicFn(
      CONTRACT, "toggle-deposits-enabled", [Cl.bool(false)], deployer()
    );
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(1000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
  });

  // ── Deposit blocked when protocol paused ──────────────────────
  it("rejects deposit when protocol is paused", () => {
    init();
    simnet.callPublicFn(CONTRACT, "pause-protocol", [], deployer());
    const { result } = simnet.callPublicFn(
      CONTRACT, "deposit", [Cl.uint(1000)], wallet1()
    );
    expect(result).toBeErr(Cl.uint(112)); // ERR-PROTOCOL-PAUSED
  });

  // ── Total deposits metric updates correctly ───────────────────
  it("updates total-deposits metric on deposit", () => {
    init();
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3_000)], wallet1());
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5_000)], wallet2());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-total-deposits", [], deployer()
    );
    expect(result).toBeUint(8_000);
  });
});
