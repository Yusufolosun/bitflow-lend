import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core";

describe("Concurrent User Interaction Tests", () => {
  describe("multiple users depositing", () => {
    it("handles 5 users depositing in sequence", () => {
      const accounts = simnet.getAccounts();
      const wallets = [
        accounts.get("wallet_1")!,
        accounts.get("wallet_2")!,
        accounts.get("wallet_3")!,
        accounts.get("wallet_4")!,
        accounts.get("wallet_5")!,
      ];
      const amounts = [1000, 2000, 3000, 4000, 5000];

      // Each user deposits
      wallets.forEach((wallet, i) => {
        const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amounts[i])], wallet);
        expect(result).toBeOk(Cl.bool(true));
      });

      // Verify each user's balance
      wallets.forEach((wallet, i) => {
        const balance = simnet.callReadOnlyFn(CONTRACT, "get-user-deposit", [Cl.principal(wallet)], wallet);
        expect(balance.result).toBeUint(amounts[i]);
      });

      // Verify total deposits
      const total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], wallets[0]);
      expect(total.result).toBeUint(15000); // 1000+2000+3000+4000+5000
    });

    it("handles 10 users with varying deposit amounts", () => {
      const accounts = simnet.getAccounts();
      const walletNames = Array.from({ length: 10 }, (_, i) => `wallet_${i + 1}`);
      let expectedTotal = 0;

      walletNames.forEach((name, i) => {
        const wallet = accounts.get(name);
        if (wallet) {
          const amount = (i + 1) * 500;
          expectedTotal += amount;
          const { result } = simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], wallet);
          expect(result).toBeOk(Cl.bool(true));
        }
      });

      const total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], accounts.get("wallet_1")!);
      expect(total.result).toBeUint(expectedTotal);
    });
  });

  describe("multiple borrows in same block", () => {
    it("allows different users to borrow independently", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;
      const wallet3 = accounts.get("wallet_3")!;

      // Each deposits and borrows
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(4500)], wallet2);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(6000)], wallet3);

      const borrow1 = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet1);
      const borrow2 = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(3000), Cl.uint(600), Cl.uint(60)], wallet2);
      const borrow3 = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(4000), Cl.uint(700), Cl.uint(90)], wallet3);

      expect(borrow1.result).toBeOk(Cl.bool(true));
      expect(borrow2.result).toBeOk(Cl.bool(true));
      expect(borrow3.result).toBeOk(Cl.bool(true));

      // Verify each has their own loan
      const loan1 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet1)], wallet1);
      const loan2 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet2)], wallet2);
      const loan3 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet3)], wallet3);

      expect(loan1.result).toBeSome(expect.any(Object));
      expect(loan2.result).toBeSome(expect.any(Object));
      expect(loan3.result).toBeSome(expect.any(Object));
    });
  });

  describe("concurrent repayments", () => {
    it("handles multiple users repaying in sequence", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      // Setup: both deposit and borrow
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet1);

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(4500)], wallet2);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(3000), Cl.uint(500), Cl.uint(30)], wallet2);

      simnet.mineEmptyBlocks(100);

      // Both repay
      const repay1 = simnet.callPublicFn(CONTRACT, "repay", [], wallet1);
      const repay2 = simnet.callPublicFn(CONTRACT, "repay", [], wallet2);

      expect(repay1.result).toBeOk(expect.any(Object));
      expect(repay2.result).toBeOk(expect.any(Object));

      // Both loans should be cleared
      const loan1 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet1)], wallet1);
      const loan2 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet2)], wallet2);
      expect(loan1.result).toBeNone();
      expect(loan2.result).toBeNone();
    });
  });

  describe("parallel liquidations", () => {
    it("allows sequential liquidation of multiple undercollateralized positions", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;
      const liquidator = accounts.get("wallet_3")!;

      // Setup two undercollateralized positions
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet1);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1);

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1500)], wallet2);
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet2);

      // Liquidate both at low price
      const stxPrice = 70;
      simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(stxPrice)], deployer);
      const liq1 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet1)], liquidator);
      const liq2 = simnet.callPublicFn(CONTRACT, "liquidate", [Cl.principal(wallet2)], liquidator);

      expect(liq1.result).toBeOk(expect.any(Object));
      expect(liq2.result).toBeOk(expect.any(Object));

      // Both positions should be cleared
      const loan1 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet1)], wallet1);
      const loan2 = simnet.callReadOnlyFn(CONTRACT, "get-user-loan", [Cl.principal(wallet2)], wallet2);
      expect(loan1.result).toBeNone();
      expect(loan2.result).toBeNone();

      // Total liquidations should be 2
      const totalLiq = simnet.callReadOnlyFn(CONTRACT, "get-total-liquidations", [], liquidator);
      expect(totalLiq.result).toBeUint(2);
    });
  });

  describe("mixed operations across users", () => {
    it("handles interleaved deposit, borrow, repay across users", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;
      const wallet3 = accounts.get("wallet_3")!;

      // User 1: deposit
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet1);
      // User 2: deposit
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(4500)], wallet2);
      // User 1: borrow
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(2000), Cl.uint(500), Cl.uint(30)], wallet1);
      // User 3: deposit
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(6000)], wallet3);
      // User 2: borrow
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(3000), Cl.uint(500), Cl.uint(60)], wallet2);

      simnet.mineEmptyBlocks(50);

      // User 1: repay
      const repay1 = simnet.callPublicFn(CONTRACT, "repay", [], wallet1);
      expect(repay1.result).toBeOk(expect.any(Object));

      // User 3: borrow (now that user 1 freed up capital)
      simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(4000), Cl.uint(500), Cl.uint(90)], wallet3);

      // User 1: should be able to borrow again
      const borrow1Again = simnet.callPublicFn(CONTRACT, "borrow", [Cl.uint(1000), Cl.uint(500), Cl.uint(30)], wallet1);
      expect(borrow1Again.result).toBeOk(Cl.bool(true));

      // Verify protocol state
      const metrics = simnet.callReadOnlyFn(CONTRACT, "get-protocol-metrics", [], wallet1);
      expect(metrics.result).toBeTuple({
        "total-deposits": Cl.uint(3),
        "total-withdrawals": Cl.uint(0),
        "total-borrows": Cl.uint(4), // wallet1 twice, wallet2, wallet3
        "total-repayments": Cl.uint(1),
        "total-liquidations": Cl.uint(0),
      });
    });

    it("total deposits update correctly with deposits and withdrawals across users", () => {
      const accounts = simnet.getAccounts();
      const wallet1 = accounts.get("wallet_1")!;
      const wallet2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(5000)], wallet1);
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(3000)], wallet2);

      // Total should be 8000
      let total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], wallet1);
      expect(total.result).toBeUint(8000);

      // Wallet 1 withdraws 2000
      simnet.callPublicFn(CONTRACT, "withdraw", [Cl.uint(2000)], wallet1);

      // Total should be 6000
      total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], wallet1);
      expect(total.result).toBeUint(6000);

      // Wallet 2 deposits more
      simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(1000)], wallet2);

      // Total should be 7000
      total = simnet.callReadOnlyFn(CONTRACT, "get-total-deposits", [], wallet1);
      expect(total.result).toBeUint(7000);
    });
  });
});
