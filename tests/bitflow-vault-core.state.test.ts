import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("State Transition Tests", () => {
  describe("valid state transitions", () => {
    it("No deposit → Deposit: new user can deposit", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Verify no existing deposit
      const initialBalance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(initialBalance.result).toBeUint(0);

      // Transition: deposit
      const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const afterBalance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(afterBalance.result).toBeUint(5000);
    });

    it("Deposit → Borrow: user with deposit can borrow", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(300000)], wallet);

      // Verify no loan exists
      const loanBefore = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loanBefore.result).toBeNone();

      // Transition: borrow
      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(200000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const loanAfter = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loanAfter.result).toBeSome(expect.any(Object));
    });

    it("Borrow → Repay: user with active loan can repay", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(300000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(200000), Cl.uint(500), Cl.uint(30)], wallet);

      // Verify loan exists
      const loanBefore = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loanBefore.result).toBeSome(expect.any(Object));

      // Transition: repay
      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeOk(expect.any(Object));

      const loanAfter = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet)], wallet);
      expect(loanAfter.result).toBeNone();
    });

    it("Repay → Withdraw: user can withdraw after repaying", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(300000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(200000), Cl.uint(500), Cl.uint(30)], wallet);
      simnet.callPublicFn(CONTRACT, "repay", [], wallet);

      // Transition: withdraw
      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(300000)], wallet);
      expect(result).toBeOk(Cl.bool(true));

      const finalBalance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(finalBalance.result).toBeUint(0);
    });

    it("Repay → Borrow again: user can take new loan after repaying", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(300000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);
      simnet.callPublicFn(CONTRACT, "repay", [], wallet);

      // Should allow new borrow
      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(150000), Cl.uint(600), Cl.uint(60)], wallet);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("complete lifecycle: deposit → borrow → repay → withdraw → deposit again", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      // Step 1: Deposit
      let res = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(500000)], wallet);
      expect(res.result).toBeOk(Cl.bool(true));

      // Step 2: Borrow
      res = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(300000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(res.result).toBeOk(Cl.bool(true));

      // Step 3: Repay
      res = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(res.result).toBeOk(expect.any(Object));

      // Step 4: Withdraw all
      res = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(500000)], wallet);
      expect(res.result).toBeOk(Cl.bool(true));

      // Step 5: Deposit again
      res = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(2000)], wallet);
      expect(res.result).toBeOk(Cl.bool(true));

      const finalBalance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
      expect(finalBalance.result).toBeUint(2000);
    });
  });

  describe("invalid state transitions", () => {
    it("cannot borrow before depositing (no collateral)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(105)); // ERR-INSUFFICIENT-COLLATERAL
    });

    it("cannot repay without an active loan", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "repay", [], wallet);
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });

    it("cannot withdraw more than deposited", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(2000)], wallet);
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });

    it("cannot borrow twice with active loan", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(600000)], wallet);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(200000), Cl.uint(500), Cl.uint(30)], wallet);

      const { result } = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet);
      expect(result).toBeErr(Cl.uint(103)); // ERR-ALREADY-HAS-LOAN
    });

    it("cannot liquidate position with no loan", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1);

      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(70)], deployer);
      const { result } = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet1)], wallet2);
      expect(result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });

    it("cannot withdraw with zero balance (never deposited)", () => {
      const accounts = simnet.getAccounts();
      const wallet = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(100)], wallet);
      expect(result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });
  });
});
