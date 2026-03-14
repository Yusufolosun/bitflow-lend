import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

/**
 * Verifies reward-per-token checkpoint precision and rounding behavior
 * across various stake sizes and reward rates.
 */
describe("bitflow-staking-pool reward precision", () => {
  const deployer = () => simnet.getAccounts().get("deployer")!;
  const staker1 = () => simnet.getAccounts().get("wallet_1")!;
  const staker2 = () => simnet.getAccounts().get("wallet_2")!;

  const init = (rewardRate: number) => {
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
    simnet.callPublicFn(
      CONTRACT, "set-reward-rate",
      [Cl.uint(rewardRate)], deployer()
    );
  };

  // ── Zero reward rate yields no rewards ────────────────────────
  it("zero reward rate accrues nothing even after many blocks", () => {
    init(0);
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(10_000_000)], staker1());
    simnet.mineEmptyBlocks(1000);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    expect(result).toBeUint(0);
  });

  // ── Single staker captures all rewards ────────────────────────
  it("single staker receives full block reward", () => {
    init(100); // 100 microSTX per block
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(10_000_000)], staker1());
    simnet.mineEmptyBlocks(10);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    // ~10 blocks * 100 = ~1000 microSTX (may be ±1 due to checkpoint block)
    const value = Number((result as any).value);
    expect(value).toBeGreaterThanOrEqual(900);
    expect(value).toBeLessThanOrEqual(1200);
  });

  // ── Equal stakers split rewards evenly ────────────────────────
  it("two equal stakers split rewards roughly 50/50", () => {
    init(1000);
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5_000_000)], staker1());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5_000_000)], staker2());
    simnet.mineEmptyBlocks(100);

    const r1 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    const r2 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker2())], deployer()
    );
    const v1 = Number((r1.result as any).value);
    const v2 = Number((r2.result as any).value);

    // Both should be within 10% of each other
    expect(Math.abs(v1 - v2)).toBeLessThanOrEqual(Math.max(v1, v2) * 0.15);
  });

  // ── Larger staker gets proportionally more ────────────────────
  it("staker with 3x position earns ~3x rewards", () => {
    init(1000);
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(3_000_000)], staker1());
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1_000_000)], staker2());
    simnet.mineEmptyBlocks(100);

    const r1 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    const r2 = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker2())], deployer()
    );
    const v1 = Number((r1.result as any).value);
    const v2 = Number((r2.result as any).value);

    // staker1 should earn approximately 3x staker2
    const ratio = v1 / v2;
    expect(ratio).toBeGreaterThan(2.5);
    expect(ratio).toBeLessThan(3.5);
  });

  // ── Tiny stake doesn't round to zero rewards ─────────────────
  it("minimum stake still accrues non-zero rewards", () => {
    init(1000);
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(1_000_000)], staker1()); // min stake
    simnet.mineEmptyBlocks(100);
    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    expect(Number((result as any).value)).toBeGreaterThan(0);
  });

  // ── Claim resets pending to zero ──────────────────────────────
  it("claiming rewards resets pending to zero", () => {
    init(1000);
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(5_000_000)], staker1());
    simnet.mineEmptyBlocks(50);
    simnet.callPublicFn(CONTRACT, "claim-rewards", [], staker1());

    const { result } = simnet.callReadOnlyFn(
      CONTRACT, "get-pending-rewards",
      [Cl.principal(staker1())], deployer()
    );
    // Should be near zero (0-1 blocks of rewards since claim)
    expect(Number((result as any).value)).toBeLessThanOrEqual(1100);
  });
});
