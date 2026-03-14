import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 concurrent multi-user tests", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT, "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );
  const repay = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "repay", [], sender);
  const getSnapshot = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-dashboard-snapshot", [], deployer());
  const getUserDeposit = (user: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(user)], deployer());

  const setup = () => {
    init();
    setPrice(100);
  };

  // ── Multiple users deposit ──────────────────────────────────────
  describe("concurrent deposits", () => {
    it("tracks deposits per user independently", () => {
      setup();
      deposit(5_000_000, wallet1());
      deposit(8_000_000, wallet2());
      deposit(3_000_000, wallet3());

      expect(getUserDeposit(wallet1()).result).toBeUint(5_000_000);
      expect(getUserDeposit(wallet2()).result).toBeUint(8_000_000);
      expect(getUserDeposit(wallet3()).result).toBeUint(3_000_000);
    });

    it("protocol total reflects all deposits", () => {
      setup();
      deposit(5_000_000, wallet1());
      deposit(8_000_000, wallet2());
      deposit(3_000_000, wallet3());

      const { result } = getSnapshot();
      expect(result).toHaveTupleProperty("total-deposits", Cl.uint(16_000_000));
    });
  });

  // ── Multiple users borrow concurrently ──────────────────────────
  describe("concurrent borrows", () => {
    it("allows multiple users to have active loans", () => {
      setup();
      deposit(10_000_000, wallet1());
      deposit(10_000_000, wallet2());
      deposit(10_000_000, wallet3());

      const b1 = borrow(2_000_000, 500, 30, wallet1());
      const b2 = borrow(3_000_000, 800, 60, wallet2());
      const b3 = borrow(1_000_000, 300, 90, wallet3());

      expect(b1.result).toBeOk(Cl.bool(true));
      expect(b2.result).toBeOk(Cl.bool(true));
      expect(b3.result).toBeOk(Cl.bool(true));
    });

    it("tracks total outstanding borrows across users", () => {
      setup();
      deposit(10_000_000, wallet1());
      deposit(10_000_000, wallet2());

      borrow(2_000_000, 500, 30, wallet1());
      borrow(3_000_000, 800, 60, wallet2());

      const { result } = getSnapshot();
      expect(result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(5_000_000));
    });
  });

  // ── One user repayment doesn't affect others ────────────────────
  describe("repayment isolation", () => {
    it("repaying one loan does not affect another user's loan", () => {
      setup();
      deposit(10_000_000, wallet1());
      deposit(10_000_000, wallet2());

      borrow(2_000_000, 500, 30, wallet1());
      borrow(3_000_000, 800, 60, wallet2());

      simnet.mineEmptyBlocks(10);
      repay(wallet1()); // wallet1 repays

      // wallet2 still has an active loan
      const loan = simnet.callReadOnlyFn(
        CONTRACT, "get-user-loan", [Cl.principal(wallet2())], deployer()
      );
      expect(loan.result).not.toBeNone();

      // wallet1's loan is gone
      const loan1 = simnet.callReadOnlyFn(
        CONTRACT, "get-user-loan", [Cl.principal(wallet1())], deployer()
      );
      expect(loan1.result).toBeNone();
    });

    it("outstanding borrows decremented by repaid amount only", () => {
      setup();
      deposit(10_000_000, wallet1());
      deposit(10_000_000, wallet2());

      borrow(2_000_000, 500, 30, wallet1());
      borrow(3_000_000, 800, 60, wallet2());

      repay(wallet1());

      const { result } = getSnapshot();
      // Only wallet2's 3M should remain outstanding
      expect(result).toHaveTupleProperty("total-outstanding-borrows", Cl.uint(3_000_000));
    });
  });

  // ── Utilization reflects multi-user state ───────────────────────
  describe("utilization multi-user", () => {
    it("utilization grows with more borrows", () => {
      setup();
      deposit(20_000_000, wallet1());
      deposit(20_000_000, wallet2());

      borrow(5_000_000, 500, 30, wallet1());
      // utilization = 5M / 40M * 10000 = 1250 bps
      const snap1 = getSnapshot();
      expect(snap1.result).toHaveTupleProperty("utilization-bps", Cl.uint(1250));

      borrow(10_000_000, 500, 30, wallet2());
      // utilization = 15M / 40M * 10000 = 3750 bps
      const snap2 = getSnapshot();
      expect(snap2.result).toHaveTupleProperty("utilization-bps", Cl.uint(3750));
    });
  });

  // ── Deposit after borrow for different user ─────────────────────
  describe("new deposit dilutes utilization", () => {
    it("new deposit reduces utilization ratio", () => {
      setup();
      deposit(10_000_000, wallet1());
      borrow(5_000_000, 500, 30, wallet1());

      // Before new deposit: util = 5M / 10M = 5000 bps
      const snap1 = getSnapshot();
      expect(snap1.result).toHaveTupleProperty("utilization-bps", Cl.uint(5000));

      // New deposit from wallet2
      deposit(10_000_000, wallet2());

      // After: util = 5M / 20M = 2500 bps
      const snap2 = getSnapshot();
      expect(snap2.result).toHaveTupleProperty("utilization-bps", Cl.uint(2500));
    });
  });
});
