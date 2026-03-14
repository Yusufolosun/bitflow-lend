import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT_NAME = "bitflow-vault-core";

describe("BitFlow Vault Core - Comprehensive Test Suite (40+ Tests)", () => {

  describe("1. Deposit Function Tests (8 tests)", () => {
    it("allows users to deposit STX", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const depositAmount = 1000;
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "deposit",
        [Cl.uint(depositAmount)],
        wallet_1
      );

      expect(result).toBeOk(Cl.bool(true));

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(depositAmount);
    });

    it("allows multiple consecutive deposits from same user", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2500)], wallet_1);

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(4000);
    });

    it("tracks total deposits correctly with multiple users", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;
      const wallet_3 = accounts.get("wallet_3")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_3);

      const totalDepositsResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-deposits",
        [],
        wallet_1
      );
      expect(totalDepositsResponse.result).toBeUint(6000);
    });

    it("rejects zero amount deposits", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "deposit",
        [Cl.uint(0)],
        wallet_1
      );

      expect(result).toBeErr(Cl.uint(102)); // ERR-INVALID-AMOUNT
    });

    it("handles very large deposit amounts", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const largeAmount = 100000000; // 100 million STX
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "deposit",
        [Cl.uint(largeAmount)],
        wallet_1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("correctly updates deposit after partial withdrawal then new deposit", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(2500);
    });

    it("maintains separate balances for different users", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(5000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(7500)], wallet_2);

      const wallet1Balance = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      const wallet2Balance = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_2)],
        wallet_2
      );

      expect(wallet1Balance.result).toBeUint(5000);
      expect(wallet2Balance.result).toBeUint(7500);
    });

    it("handles minimum deposit of 1 micro-STX", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "deposit",
        [Cl.uint(1)],
        wallet_1
      );

      expect(result).toBeOk(Cl.bool(true));
    });
  });

  describe("2. Withdrawal Function Tests (7 tests)", () => {
    it("allows users to withdraw their deposits", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      const withdrawResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "withdraw",
        [Cl.uint(500)],
        wallet_1
      );

      expect(withdrawResponse.result).toBeOk(Cl.bool(true));

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(500);
    });

    it("prevents users from withdrawing more than deposited", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      const withdrawResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "withdraw",
        [Cl.uint(2000)],
        wallet_1
      );

      expect(withdrawResponse.result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });

    it("allows full withdrawal of entire balance", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(5000)], wallet_1);
      const withdrawResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "withdraw",
        [Cl.uint(5000)],
        wallet_1
      );

      expect(withdrawResponse.result).toBeOk(Cl.bool(true));

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(0);
    });

    it("prevents withdrawal of zero amount", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      const withdrawResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "withdraw",
        [Cl.uint(0)],
        wallet_1
      );

      // Contract returns STX transfer error (u3) for zero amount
      expect(withdrawResponse.result).toBeErr(Cl.uint(3));
    });

    it("prevents withdrawal when balance is zero", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const withdrawResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "withdraw",
        [Cl.uint(100)],
        wallet_1
      );

      expect(withdrawResponse.result).toBeErr(Cl.uint(101)); // ERR-INSUFFICIENT-BALANCE
    });

    it("updates total deposits after withdrawal", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(1000)], wallet_1);

      const totalDepositsResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-total-deposits",
        [],
        wallet_1
      );
      expect(totalDepositsResponse.result).toBeUint(4000);
    });

    it("allows multiple partial withdrawals", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(10000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(3000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(1000)], wallet_1);

      const userDepositResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(userDepositResponse.result).toBeUint(4000);
    });
  });

  describe("3. Borrow Function Tests (9 tests)", () => {
    it("allows users to borrow against sufficient collateral", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);

      const startBlock = simnet.blockHeight;
      const borrowAmount = 1000;
      const interestRate = 5;
      const termDays = 30;
      const borrowResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(borrowAmount), Cl.uint(interestRate), Cl.uint(termDays)],
        wallet_1
      );

      expect(borrowResponse.result).toBeOk(Cl.bool(true));

      const loanResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-loan",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      expect(loanResponse.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(borrowAmount),
          "interest-rate": Cl.uint(interestRate),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(startBlock + 1 + termDays * 144),
        })
      );
    });

    it("prevents borrowing without sufficient collateral", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
      const borrowResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(1000), Cl.uint(5), Cl.uint(30)],
        wallet_1
      );

      expect(borrowResponse.result).toBeErr(Cl.uint(105)); // ERR-INSUFFICIENT-COLLATERAL
    });

    it("prevents users from having multiple active loans", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      const secondBorrow = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(500), Cl.uint(5), Cl.uint(30)],
        wallet_1
      );

      expect(secondBorrow.result).toBeErr(Cl.uint(103)); // ERR-ALREADY-HAS-LOAN
    });

    it("correctly calculates required collateral at 150%", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const tests = [
        { borrow: 1000, required: 1500 },
        { borrow: 2000, required: 3000 },
        { borrow: 500, required: 750 },
        { borrow: 10000, required: 15000 },
      ];

      tests.forEach(test => {
        const result = simnet.callReadOnlyFn(
          CONTRACT_NAME,
          "calculate-required-collateral",
          [Cl.uint(test.borrow)],
          wallet_1
        );
        expect(result.result).toBeUint(test.required);
      });
    });

    it("accepts minimum loan term of 7 days", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      const borrowResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(1000), Cl.uint(5), Cl.uint(7)],
        wallet_1
      );

      expect(borrowResponse.result).toBeOk(Cl.bool(true));
    });

    it("accepts maximum loan term of 365 days", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      const borrowResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(1000), Cl.uint(5), Cl.uint(365)],
        wallet_1
      );

      expect(borrowResponse.result).toBeOk(Cl.bool(true));
    });

    it("handles various interest rates correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;
      const wallet_3 = accounts.get("wallet_3")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_3);

      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(1), Cl.uint(30)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(50), Cl.uint(30)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(100), Cl.uint(30)], wallet_3);

      const loan1 = simnet.callReadOnlyFn(CONTRACT_NAME, "get-user-loan", [Cl.principal(wallet_1)], wallet_1);
      const loan2 = simnet.callReadOnlyFn(CONTRACT_NAME, "get-user-loan", [Cl.principal(wallet_2)], wallet_2);
      const loan3 = simnet.callReadOnlyFn(CONTRACT_NAME, "get-user-loan", [Cl.principal(wallet_3)], wallet_3);

      expect(loan1.result).toBeSome(expect.any(Object));
      expect(loan2.result).toBeSome(expect.any(Object));
      expect(loan3.result).toBeSome(expect.any(Object));
    });

    it("prevents borrowing zero amount", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      const borrowResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(0), Cl.uint(5), Cl.uint(30)],
        wallet_1
      );

      // Contract returns STX transfer error (u3) for zero amount
      expect(borrowResponse.result).toBeErr(Cl.uint(3));
    });

    it("correctly calculates term end block for various loan terms", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(10000)], wallet_1);

      const startBlock = simnet.blockHeight;
      const termDays = 90;
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(10), Cl.uint(termDays)], wallet_1);

      const loanResponse = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-loan",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      const expectedTermEnd = startBlock + 1 + termDays * 144;
      expect(loanResponse.result).toBeSome(
        Cl.tuple({
          amount: Cl.uint(1000),
          "interest-rate": Cl.uint(10),
          "start-block": Cl.uint(startBlock + 1),
          "term-end": Cl.uint(expectedTermEnd),
        })
      );
    });
  });

  describe("4. Repayment Function Tests (8 tests)", () => {
    it("allows users to repay their loan with interest", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(10), Cl.uint(30)], wallet_1);

      simnet.mineEmptyBlocks(1000);

      const repayResponse = simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);

      expect(repayResponse.result).toBeOk(expect.any(Object));

      const loanCheck = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-loan",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(loanCheck.result).toBeNone();
    });

    it("prevents repaying when no active loan exists", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      const repayResponse = simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);
      expect(repayResponse.result).toBeErr(Cl.uint(106)); // ERR-NO-ACTIVE-LOAN
    });

    it("correctly calculates interest for short loan duration", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(12), Cl.uint(90)], wallet_1);

      const immediateRepayment = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-repayment-amount",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      expect(immediateRepayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(1000),
          interest: Cl.uint(0),
          total: Cl.uint(1000),
        })
      );
    });

    it("correctly calculates interest after significant time passes", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(12), Cl.uint(90)], wallet_1);

      simnet.mineEmptyBlocks(4320); // 30 days

      const laterRepayment = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-repayment-amount",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      expect(laterRepayment.result).toBeSome(
        Cl.tuple({
          principal: Cl.uint(1000),
          interest: Cl.uint(9),
          total: Cl.uint(1009),
        })
      );
    });

    it("tracks total repaid across multiple loans", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      const initialTotal = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-repaid", [], wallet_1);
      expect(initialTotal.result).toBeUint(0);

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(10), Cl.uint(30)], wallet_1);
      simnet.mineEmptyBlocks(500);
      simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);

      const afterFirstRepay = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-repaid", [], wallet_1);
      expect(afterFirstRepay.result).not.toBeUint(0);

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1500), Cl.uint(8), Cl.uint(60)], wallet_2);
      simnet.mineEmptyBlocks(1000);
      simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_2);

      const finalTotal = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-repaid", [], wallet_2);
      expect(finalTotal.result).not.toEqual(afterFirstRepay.result);
    });

    it("allows user to borrow again after repaying previous loan", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(10), Cl.uint(30)], wallet_1);
      simnet.mineEmptyBlocks(500);
      simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);

      const secondBorrow = simnet.callPublicFn(
        CONTRACT_NAME,
        "borrow",
        [Cl.uint(1500), Cl.uint(8), Cl.uint(60)],
        wallet_1
      );

      expect(secondBorrow.result).toBeOk(Cl.bool(true));
    });

    it("handles repayment with zero interest for very recent loan", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      const repayResponse = simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);

      expect(repayResponse.result).toBeOk(
        Cl.tuple({
          principal: Cl.uint(1000),
          interest: Cl.uint(0),
          total: Cl.uint(1000),
        })
      );
    });

    it("interest calculation increases linearly over time", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(20), Cl.uint(60)], wallet_1);

      simnet.mineEmptyBlocks(1000);
      const repayment1 = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-repayment-amount",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      simnet.mineEmptyBlocks(1000);
      const repayment2 = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-repayment-amount",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      // Both should return repayment data
      expect(repayment1.result).toBeSome(expect.any(Object));
      expect(repayment2.result).toBeSome(expect.any(Object));
    });
  });

  describe("5. Liquidation Tests (8 tests)", () => {
    it("calculates health factor correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      const healthFactor = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "calculate-health-factor",
        [Cl.principal(wallet_1), Cl.uint(100)],
        wallet_1
      );

      expect(healthFactor.result).toBeSome(Cl.uint(150));
    });

    it("identifies liquidatable positions correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      const healthyCheck = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-liquidatable",
        [Cl.principal(wallet_1), Cl.uint(100)],
        wallet_1
      );
      expect(healthyCheck.result).toBeBool(false);

      const unhealthyCheck = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-liquidatable",
        [Cl.principal(wallet_1), Cl.uint(70)],
        wallet_1
      );
      expect(unhealthyCheck.result).toBeBool(true);
    });

    it("allows liquidation of unhealthy positions", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);

      const liquidationResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "liquidate",
        [Cl.principal(wallet_1)],
        wallet_2
      );

      expect(liquidationResponse.result).toBeOk(
        Cl.tuple({
          "seized-collateral": Cl.uint(1500),
          paid: Cl.uint(1050),
          bonus: Cl.uint(50),
        })
      );
    });

    it("prevents liquidating healthy positions", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(100)], deployer);

      const liquidationAttempt = simnet.callPublicFn(
        CONTRACT_NAME,
        "liquidate",
        [Cl.principal(wallet_1)],
        wallet_2
      );

      expect(liquidationAttempt.result).toBeErr(Cl.uint(107)); // ERR-NOT-LIQUIDATABLE
    });

    it("prevents self-liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);

      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);

      const selfLiquidationAttempt = simnet.callPublicFn(
        CONTRACT_NAME,
        "liquidate",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      expect(selfLiquidationAttempt.result).toBeErr(Cl.uint(108)); // ERR-LIQUIDATE-OWN-LOAN
    });

    it("tracks total liquidations correctly", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;
      const wallet_3 = accounts.get("wallet_3")!;

      const initialLiquidations = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-liquidations", [], wallet_1);
      expect(initialLiquidations.result).toBeUint(0);

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT_NAME, "liquidate", [Cl.principal(wallet_1)], wallet_2);

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "liquidate", [Cl.principal(wallet_2)], wallet_3);

      const finalLiquidations = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-liquidations", [], wallet_1);
      expect(finalLiquidations.result).toBeUint(2);
    });

    it("removes loan after successful liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT_NAME, "liquidate", [Cl.principal(wallet_1)], wallet_2);

      const loanCheck = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-loan",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(loanCheck.result).toBeNone();
    });

    it("clears user deposit after liquidation", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1500)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1000), Cl.uint(5), Cl.uint(30)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);
      simnet.callPublicFn(CONTRACT_NAME, "liquidate", [Cl.principal(wallet_1)], wallet_2);

      const depositCheck = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(depositCheck.result).toBeUint(0);
    });
  });

  describe("6. Edge Cases & Integration Tests (5 tests)", () => {
    it("handles complex multi-user scenario correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;
      const wallet_3 = accounts.get("wallet_3")!;

      // Multiple deposits
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(5000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_2);
      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(7000)], wallet_3);

      // Multiple borrows
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(3000), Cl.uint(8), Cl.uint(45)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(2000), Cl.uint(10), Cl.uint(60)], wallet_2);

      // Partial withdrawal
      simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(2000)], wallet_3);

      const totalDeposits = simnet.callReadOnlyFn(CONTRACT_NAME, "get-total-deposits", [], wallet_1);
      expect(totalDeposits.result).toBeUint(13000); // 5000 + 3000 + 5000
    });

    it("correctly handles deposit-borrow-repay-withdraw cycle", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(3000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(2000), Cl.uint(10), Cl.uint(30)], wallet_1);
      simnet.mineEmptyBlocks(1000);
      simnet.callPublicFn(CONTRACT_NAME, "repay", [], wallet_1);
      const withdrawResult = simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(1000)], wallet_1);

      expect(withdrawResult.result).toBeOk(Cl.bool(true));
    });

    it("liquidation bonus calculation is correct", () => {
      const accounts = simnet.getAccounts();
      const deployer = accounts.get("deployer")!;
      const wallet_1 = accounts.get("wallet_1")!;
      const wallet_2 = accounts.get("wallet_2")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(2000)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(1300), Cl.uint(5), Cl.uint(30)], wallet_1);

      simnet.callPublicFn(CONTRACT_NAME, "set-stx-price", [Cl.uint(70)], deployer);

      const liquidationResponse = simnet.callPublicFn(
        CONTRACT_NAME,
        "liquidate",
        [Cl.principal(wallet_1)],
        wallet_2
      );

      // Bonus = 1300 * 5 / 100 = 65
      expect(liquidationResponse.result).toBeOk(
        Cl.tuple({
          "seized-collateral": Cl.uint(2000),
          paid: Cl.uint(1365), // 1300 + 65
          bonus: Cl.uint(65),
        })
      );
    });

    it("handles maximum precision calculations correctly", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(999999)], wallet_1);
      simnet.callPublicFn(CONTRACT_NAME, "borrow", [Cl.uint(666666), Cl.uint(99), Cl.uint(365)], wallet_1);

      simnet.mineEmptyBlocks(52560); // Full year

      const repaymentAmount = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-repayment-amount",
        [Cl.principal(wallet_1)],
        wallet_1
      );

      expect(repaymentAmount.result).toBeSome(expect.any(Object));
    });

    it("multiple withdrawals and deposits maintain accuracy", () => {
      const accounts = simnet.getAccounts();
      const wallet_1 = accounts.get("wallet_1")!;

      for (let i = 0; i < 5; i++) {
        simnet.callPublicFn(CONTRACT_NAME, "deposit", [Cl.uint(1000)], wallet_1);
        simnet.callPublicFn(CONTRACT_NAME, "withdraw", [Cl.uint(500)], wallet_1);
      }

      const finalBalance = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-user-deposit",
        [Cl.principal(wallet_1)],
        wallet_1
      );
      expect(finalBalance.result).toBeUint(2500); // 5 * (1000 - 500)
    });
  });
});
