import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

describe("vault-core contract", () => {
  it("allows users to deposit STX", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;


    // Call deposit with 1000 STX from wallet_1
    const depositAmount = 1000;
    const { result } = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );

    // Verify result is ok
    expect(result).toBeOk(Cl.bool(true));

    // Verify get-user-deposit returns 1000
    const userDepositResponse = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-deposit",
      [Cl.principal(wallet_1)],
      wallet_1
    );
    expect(userDepositResponse.result).toBeUint(depositAmount);
  });

  it("allows users to withdraw their deposits", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit 1000 STX
    const depositAmount = 1000;
    const depositResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );
    expect(depositResponse.result).toBeOk(Cl.bool(true));

    // Withdraw 500 STX
    const withdrawAmount = 500;
    const withdrawResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(withdrawAmount)],
      wallet_1
    );

    // Verify both transactions succeed
    expect(withdrawResponse.result).toBeOk(Cl.bool(true));

    // Verify remaining balance is 500
    const userDepositResponse = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-deposit",
      [Cl.principal(wallet_1)],
      wallet_1
    );
    expect(userDepositResponse.result).toBeUint(depositAmount - withdrawAmount);
  });

  it("prevents users from withdrawing more than deposited", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit 1000 STX
    const depositAmount = 1000;
    const depositResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );
    expect(depositResponse.result).toBeOk(Cl.bool(true));

    // Try to withdraw 2000 STX
    const withdrawAmount = 2000;
    const withdrawResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(withdrawAmount)],
      wallet_1
    );

    // Verify transaction fails with error u101
    expect(withdrawResponse.result).toBeErr(Cl.uint(101));
  });

  it("blocks withdrawal of collateral backing an active loan", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit 150000 STX and borrow 100000 (locks 150000 as collateral)
    simnet.callPublicFn("bitflow-vault-core", "deposit", [Cl.uint(150000)], wallet_1);
    simnet.callPublicFn("bitflow-vault-core", "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet_1);

    // Attempting to withdraw any amount should fail since all 150000 is locked
    const withdrawResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(1)],
      wallet_1
    );

    expect(withdrawResponse.result).toBeErr(Cl.uint(101));
  });

  it("allows withdrawal of excess deposit above locked collateral", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit 200000 STX and borrow 100000 (locks 150000, leaves 50000 available)
    simnet.callPublicFn("bitflow-vault-core", "deposit", [Cl.uint(200000)], wallet_1);
    simnet.callPublicFn("bitflow-vault-core", "borrow", [Cl.uint(100000), Cl.uint(500), Cl.uint(30)], wallet_1);

    // Withdraw 50000 (the unlocked portion) should succeed
    const withdrawResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(50000)],
      wallet_1
    );
    expect(withdrawResponse.result).toBeOk(Cl.bool(true));

    // Withdraw 1 more should fail — nothing left above the locked 150000
    const overWithdraw = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(1)],
      wallet_1
    );
    expect(overWithdraw.result).toBeErr(Cl.uint(101));
  });

  it("tracks total deposits correctly", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // Have wallet_1 deposit 1000
    const wallet1Amount = 1000;
    const deposit1 = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(wallet1Amount)],
      wallet_1
    );
    expect(deposit1.result).toBeOk(Cl.bool(true));

    // Have wallet_2 deposit 2000
    const wallet2Amount = 2000;
    const deposit2 = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(wallet2Amount)],
      wallet_2
    );
    expect(deposit2.result).toBeOk(Cl.bool(true));

    // Verify get-total-deposits returns 3000
    const totalDepositsResponse = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-deposits",
      [],
      wallet_1
    );
    expect(totalDepositsResponse.result).toBeUint(wallet1Amount + wallet2Amount);
  });

  it("emits print events for protocol actions", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit should emit event
    const depositResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    const depositEvents = depositResponse.events.filter(
      (e: any) => e.event === "print_event"
    );
    expect(depositEvents.length).toBeGreaterThan(0);

    // Borrow should emit event
    const borrowResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );
    const borrowEvents = borrowResponse.events.filter(
      (e: any) => e.event === "print_event"
    );
    expect(borrowEvents.length).toBeGreaterThan(0);

    // Repay should emit event
    const repayResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );
    const repayEvents = repayResponse.events.filter(
      (e: any) => e.event === "print_event"
    );
    expect(repayEvents.length).toBeGreaterThan(0);
  });
});

describe("loan management", () => {
  it("allows users to borrow against sufficient collateral", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 150000 STX
    const depositAmount = 150000;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );

    // wallet_1 borrows 100000 STX at 5% interest for 30 days
    // Get current block height right before borrow
    const startBlock = simnet.blockHeight;
    const borrowAmount = 100000;
    const interestRate = 500;
    const termDays = 30;
    const borrowResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(borrowAmount), Cl.uint(interestRate), Cl.uint(termDays)],
      wallet_1
    );

    // Verify borrow transaction returns ok(true)
    expect(borrowResponse.result).toBeOk(Cl.bool(true));

    // Verify get-user-loan returns correct loan details
    const loanResponse = simnet.callReadOnlyFn(
      "bitflow-vault-core",
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

  it("transfers STX to user on successful borrow", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const deployer = accounts.get("deployer")!;

    const depositAmount = 150000;
    const borrowAmount = 100000;

    // Record balance before deposit
    const balanceBefore = simnet.getAssetsMap().get("STX")?.get(wallet_1) ?? BigInt(0);

    // Deposit collateral
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );

    const balanceAfterDeposit = simnet.getAssetsMap().get("STX")?.get(wallet_1) ?? BigInt(0);
    expect(balanceAfterDeposit).toBe(balanceBefore - BigInt(depositAmount));

    // Borrow against collateral
    const borrowResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(borrowAmount), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );
    expect(borrowResponse.result).toBeOk(Cl.bool(true));

    // Verify borrowed STX was actually received by the user
    const balanceAfterBorrow = simnet.getAssetsMap().get("STX")?.get(wallet_1) ?? BigInt(0);
    expect(balanceAfterBorrow).toBe(balanceAfterDeposit + BigInt(borrowAmount));
  });

  it("rejects borrow with zero amount", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(1500)],
      wallet_1
    );

    const borrowResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(0), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    expect(borrowResponse.result).toBeErr(Cl.uint(102));
  });

  it("rejects borrow with interest rate below minimum", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );

    // Rate u0 (0%) should be rejected
    const zeroRate = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(0), Cl.uint(30)],
      wallet_1
    );
    expect(zeroRate.result).toBeErr(Cl.uint(110));

    // Rate u49 (0.49% APR) should be rejected — just below the u50 minimum
    const belowMinRate = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(49), Cl.uint(30)],
      wallet_1
    );
    expect(belowMinRate.result).toBeErr(Cl.uint(110));

    // Rate u50 (0.5% APR) should succeed — exactly at the minimum
    const atMinRate = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(50), Cl.uint(30)],
      wallet_1
    );
    expect(atMinRate.result).toBeOk(Cl.bool(true));
  });

  it("prevents borrowing without sufficient collateral", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 100000 STX (insufficient for borrowing 100000)
    const depositAmount = 100000;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(depositAmount)],
      wallet_1
    );

    // wallet_1 tries to borrow 100000 STX (requires 150000 collateral)
    const borrowAmount = 100000;
    const borrowResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(borrowAmount), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Verify transaction fails with error u105 (err-insufficient-collateral)
    expect(borrowResponse.result).toBeErr(Cl.uint(105));
  });

  it("prevents users from having multiple active loans", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 300000 STX
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(300000)],
      wallet_1
    );

    // wallet_1 successfully borrows 100000 STX
    const firstBorrow = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );
    expect(firstBorrow.result).toBeOk(Cl.bool(true));

    // wallet_1 tries to borrow another 100000 STX
    const secondBorrow = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Verify second borrow fails with error u103 (err-already-has-loan)
    expect(secondBorrow.result).toBeErr(Cl.uint(103));
  });

  it("correctly calculates required collateral", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // Test calculate-required-collateral with different amounts
    // Input: 1000 → Expected: 1500
    const collateral1 = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "calculate-required-collateral",
      [Cl.uint(1000)],
      wallet_1
    );
    expect(collateral1.result).toBeUint(1500);

    // Input: 2000 → Expected: 3000
    const collateral2 = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "calculate-required-collateral",
      [Cl.uint(2000)],
      wallet_1
    );
    expect(collateral2.result).toBeUint(3000);

    // Input: 500 → Expected: 750
    const collateral3 = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "calculate-required-collateral",
      [Cl.uint(500)],
      wallet_1
    );
    expect(collateral3.result).toBeUint(750);
  });

  it("correctly calculates loan term-end block height", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 150000 and borrows 100000 for 30 days
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );

    // Get current block height right before borrow
    const startBlock = simnet.blockHeight;
    const termDays = 30;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(termDays)],
      wallet_1
    );

    // Verify loan term-end = starting block + 4320 blocks (30 * 144)
    const loanResponse = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-loan",
      [Cl.principal(wallet_1)],
      wallet_1
    );

    const expectedTermEnd = startBlock + 1 + termDays * 144; // +1 for transaction block
    expect(loanResponse.result).toBeSome(
      Cl.tuple({
        amount: Cl.uint(100000),
        "interest-rate": Cl.uint(500),
        "start-block": Cl.uint(startBlock + 1),
        "term-end": Cl.uint(expectedTermEnd),
      })
    );
  });
});

describe("loan repayment", () => {
  it("allows users to repay their loan with interest", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 200000 STX
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );

    // wallet_1 borrows 100000 STX at 5% for 30 days
    const borrowAmount = 100000;
    const interestRate = 500;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(borrowAmount), Cl.uint(interestRate), Cl.uint(30)],
      wallet_1
    );

    // Mine 1000 blocks (simulate time passing)
    simnet.mineEmptyBlocks(1000);

    // wallet_1 repays loan
    const repayResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );

    // Verify repay succeeds and returns repayment details
    // interest = ceil((100000 * 500 * 1001) / (100 * 52560)) = 9523
    expect(repayResponse.result).toBeOk(
      Cl.tuple({
        principal: Cl.uint(borrowAmount),
        interest: Cl.uint(9523),
        penalty: Cl.uint(0),    // no penalty (repaid before term end)
        total: Cl.uint(109523),  // principal + interest
      })
    );

    // User no longer has active loan
    const loanCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-loan",
      [Cl.principal(wallet_1)],
      wallet_1
    );
    expect(loanCheck.result).toBeNone();
  });

  it("prevents repaying when no active loan exists", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 has no loan, tries to repay
    const repayResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );

    // Verify transaction fails with error u106 (err-no-active-loan)
    expect(repayResponse.result).toBeErr(Cl.uint(106));
  });

  it("correctly calculates repayment amount", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 200000 and borrows 100000 at 5% for 90 days
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );

    const borrowAmount = 100000;
    const interestRate = 500;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(borrowAmount), Cl.uint(interestRate), Cl.uint(90)],
      wallet_1
    );

    // Call get-repayment-amount immediately after borrowing
    const initialRepayment = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-repayment-amount",
      [Cl.principal(wallet_1)],
      wallet_1
    );

    // Should return some (loan exists) with minimal interest
    expect(initialRepayment.result).toBeSome(
      Cl.tuple({
        principal: Cl.uint(borrowAmount),
        interest: Cl.uint(0),  // No blocks elapsed yet
        penalty: Cl.uint(0),   // Not overdue yet
        total: Cl.uint(borrowAmount),
      })
    );

    // Mine 4320 blocks (30 days worth of blocks: 30 * 144)
    simnet.mineEmptyBlocks(4320);

    // Call get-repayment-amount again after time has passed
    const laterRepayment = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-repayment-amount",
      [Cl.principal(wallet_1)],
      wallet_1
    );

    // Should return some with accumulated interest
    // Expected interest: ceil((100000 * 500 * 4320) / (100 * 52560)) = 41096
    expect(laterRepayment.result).toBeSome(
      Cl.tuple({
        principal: Cl.uint(borrowAmount),
        interest: Cl.uint(41096),
        penalty: Cl.uint(0),  // Still within 90-day term
        total: Cl.uint(141096),
      })
    );
  });

  it("tracks total repaid across multiple loans", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // Check initial total repaid is 0
    const initialTotal = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-repaid",
      [],
      wallet_1
    );
    expect(initialTotal.result).toBeUint(0);

    // wallet_1 deposits 200000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Mine some blocks for interest
    simnet.mineEmptyBlocks(500);

    // wallet_1 repays
    const repay1 = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );
    expect(repay1.result).toBeOk(expect.any(Object));

    // Check total repaid increased
    const afterFirstRepay = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-repaid",
      [],
      wallet_1
    );
    const firstRepayAmount = afterFirstRepay.result;

    // Should be greater than 0
    expect(firstRepayAmount).not.toBeUint(0);

    // wallet_2 deposits 300000, borrows 150000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(300000)],
      wallet_2
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(150000), Cl.uint(800), Cl.uint(60)],
      wallet_2
    );

    // Mine some blocks for interest
    simnet.mineEmptyBlocks(1000);

    // wallet_2 repays
    const repay2 = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_2
    );
    expect(repay2.result).toBeOk(expect.any(Object));

    // Verify get-total-repaid increased
    const finalTotal = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-repaid",
      [],
      wallet_2
    );

    // Final total should be greater than first repay amount
    expect(finalTotal.result).not.toEqual(firstRepayAmount);
  });
});

describe("liquidation system", () => {
  it("calculates health factor correctly", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 150000 STX, borrows 100000 STX
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // STX price = u100 (100 cents = $1)
    const stxPrice = 100;
    const healthFactor = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "calculate-health-factor",
      [Cl.principal(wallet_1), Cl.uint(stxPrice)],
      wallet_1
    );

    // Health factor = 150 (150000 * 100 / 100 / 100000 * 100 = 150%)
    expect(healthFactor.result).toBeSome(Cl.uint(150));
  });

  it("identifies liquidatable positions", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 150000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Price at u100 (healthy: health factor = 150%)
    const healthyCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "is-liquidatable",
      [Cl.principal(wallet_1), Cl.uint(100)],
      wallet_1
    );
    expect(healthyCheck.result).toBeBool(false);

    // Price at u75 (health = 112.5%, still above 110% threshold)
    const borderlineCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "is-liquidatable",
      [Cl.principal(wallet_1), Cl.uint(75)],
      wallet_1
    );
    expect(borderlineCheck.result).toBeBool(false);

    // Price at u70 (health = 105%, below 110% threshold)
    const unhealthyCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "is-liquidatable",
      [Cl.principal(wallet_1), Cl.uint(70)],
      wallet_1
    );
    expect(unhealthyCheck.result).toBeBool(true);
  });

  it("allows liquidation of unhealthy positions", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // wallet_1 deposits 150000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Check initial total liquidations
    const initialLiquidations = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-liquidations",
      [],
      wallet_1
    );
    expect(initialLiquidations.result).toBeUint(0);

    // Admin sets STX price to u70 (makes position liquidatable)
    const deployer = accounts.get("deployer")!;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(70)],
      deployer
    );

    // wallet_2 liquidates wallet_1
    const liquidationResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );

    // Verify liquidation succeeds
    // Liquidation bonus = 100000 * 5 / 100 = 5000
    // Total to pay = 100000 + 5000 = 105000
    expect(liquidationResponse.result).toBeOk(
      Cl.tuple({
        "seized-collateral": Cl.uint(150000),
        paid: Cl.uint(105000),
        bonus: Cl.uint(5000),
      })
    );

    // Verify wallet_1's loan is deleted
    const loanCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-loan",
      [Cl.principal(wallet_1)],
      wallet_1
    );
    expect(loanCheck.result).toBeNone();

    // Verify wallet_1's deposit is 0
    const depositCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-user-deposit",
      [Cl.principal(wallet_1)],
      wallet_1
    );
    expect(depositCheck.result).toBeUint(0);

    // Verify total liquidations increased
    const finalLiquidations = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-total-liquidations",
      [],
      wallet_1
    );
    expect(finalLiquidations.result).toBeUint(1);
  });

  it("sends seized collateral to liquidator not borrower", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    const initialBalances = simnet.getAssetsMap().get("STX")!;
    const wallet2Before = initialBalances.get(wallet_2)!;

    // wallet_1 deposits 150000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Admin sets price to u70, wallet_2 liquidates
    const deployer = accounts.get("deployer")!;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(70)],
      deployer
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );

    // wallet_2 paid 105000 STX (loan + bonus) and received 150000 collateral
    // net gain = 150000 - 105000 = 45000 STX
    const finalBalances = simnet.getAssetsMap().get("STX")!;
    const wallet2After = finalBalances.get(wallet_2)!;
    expect(wallet2After - wallet2Before).toBe(45000n);
  });

  it("prevents liquidating healthy positions", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // wallet_1 deposits 200000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Price is u100 (healthy: 200% collateralized)
    const deployer = accounts.get("deployer")!;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(100)],
      deployer
    );
    const liquidationAttempt = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );

    // Verify transaction fails with err-not-liquidatable (u107)
    expect(liquidationAttempt.result).toBeErr(Cl.uint(107));
  });

  it("prevents self-liquidation", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 150000, borrows 100000
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Price drops to u70 (liquidatable)
    const deployer = accounts.get("deployer")!;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(70)],
      deployer
    );
    const selfLiquidationAttempt = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_1
    );

    // Verify transaction fails with err-liquidate-own-loan (u108)
    expect(selfLiquidationAttempt.result).toBeErr(Cl.uint(108));
  });

  it("allows liquidation of expired loans regardless of health factor", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // wallet_1 deposits 200000, borrows 100000 for 1 day (144 blocks)
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(1)],
      wallet_1
    );

    // At u100 price, health factor = 200% — normally NOT liquidatable
    const deployer = accounts.get("deployer")!;
    simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(100)],
      deployer
    );
    const healthyCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "is-liquidatable",
      [Cl.principal(wallet_1), Cl.uint(100)],
      wallet_1
    );
    expect(healthyCheck.result).toBeBool(false);

    // Mine 145 blocks to go past the 1-day term (144 blocks)
    simnet.mineEmptyBlocks(145);

    // Now expired — should be liquidatable even at u100 price
    const expiredCheck = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "is-liquidatable",
      [Cl.principal(wallet_1), Cl.uint(100)],
      wallet_1
    );
    expect(expiredCheck.result).toBeBool(true);

    // Liquidation should succeed
    const liquidationResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );
    expect(liquidationResponse.result).toBeOk(expect.any(Object));
  });

  it("applies late penalty when repaying an overdue loan", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;

    // wallet_1 deposits 200000, borrows 100000 for 1 day
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(1)],
      wallet_1
    );

    // Mine 200 blocks to go past the 1-day term
    simnet.mineEmptyBlocks(200);

    // Check get-repayment-amount includes a penalty
    const repaymentInfo = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-repayment-amount",
      [Cl.principal(wallet_1)],
      wallet_1
    );

    // penalty = 100000 * 500 / 10000 = 5000
    // interest = ceil((100000 * 500 * 200) / (100 * 52560)) = 1903
    // total = 100000 + 1903 + 5000 = 106903
    expect(repaymentInfo.result).toBeSome(
      Cl.tuple({
        principal: Cl.uint(100000),
        interest: Cl.uint(1903),
        penalty: Cl.uint(5000),
        total: Cl.uint(106903),
      })
    );

    // Repay the overdue loan
    const repayResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );
    expect(repayResponse.result).toBeOk(expect.any(Object));
  });

  it("only allows contract owner to set STX price", () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    // Non-owner cannot set price
    const unauthorized = simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(100)],
      wallet_1
    );
    expect(unauthorized.result).toBeErr(Cl.uint(109));

    // Owner can set price
    const authorized = simnet.callPublicFn(
      "bitflow-vault-core",
      "set-stx-price",
      [Cl.uint(100)],
      deployer
    );
    expect(authorized.result).toBeOk(Cl.bool(true));

    // Verify price was stored
    const storedPrice = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-stx-price",
      [],
      deployer
    );
    expect(storedPrice.result).toBeUint(100);
  });

  it("rejects liquidation when no price is set", () => {
    const accounts = simnet.getAccounts();
    const wallet_1 = accounts.get("wallet_1")!;
    const wallet_2 = accounts.get("wallet_2")!;

    // wallet_1 deposits and borrows
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(150000)],
      wallet_1
    );
    simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );

    // Liquidation fails because no price has been set
    const liquidateResponse = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );
    expect(liquidateResponse.result).toBeErr(Cl.uint(113));
  });
});

describe("emergency pause", () => {
  it("only allows contract owner to pause and unpause", () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    // Non-owner cannot pause
    const unauthorized = simnet.callPublicFn(
      "bitflow-vault-core",
      "pause",
      [],
      wallet_1
    );
    expect(unauthorized.result).toBeErr(Cl.uint(109));

    // Owner can pause
    const pauseResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "pause",
      [],
      deployer
    );
    expect(pauseResult.result).toBeOk(Cl.bool(true));

    // Verify paused state
    const isPaused = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-is-paused",
      [],
      deployer
    );
    expect(isPaused.result).toBeBool(true);

    // Owner can unpause
    const unpauseResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "unpause",
      [],
      deployer
    );
    expect(unpauseResult.result).toBeOk(Cl.bool(true));

    // Verify unpaused state
    const isUnpaused = simnet.callReadOnlyFn(
      "bitflow-vault-core",
      "get-is-paused",
      [],
      deployer
    );
    expect(isUnpaused.result).toBeBool(false);
  });

  it("blocks all operations when paused", () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    // Deposit before pausing so we have funds to test withdraw/borrow
    simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(200000)],
      wallet_1
    );

    // Pause the protocol
    simnet.callPublicFn(
      "bitflow-vault-core",
      "pause",
      [],
      deployer
    );

    // Deposit should fail
    const depositResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(100)],
      wallet_1
    );
    expect(depositResult.result).toBeErr(Cl.uint(112));

    // Withdraw should fail
    const withdrawResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "withdraw",
      [Cl.uint(100)],
      wallet_1
    );
    expect(withdrawResult.result).toBeErr(Cl.uint(112));

    // Borrow should fail
    const borrowResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "borrow",
      [Cl.uint(100000), Cl.uint(500), Cl.uint(30)],
      wallet_1
    );
    expect(borrowResult.result).toBeErr(Cl.uint(112));

    // Repay should fail
    const repayResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "repay",
      [],
      wallet_1
    );
    expect(repayResult.result).toBeErr(Cl.uint(112));

    // Liquidate should fail
    const wallet_2 = accounts.get("wallet_2")!;
    const liquidateResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "liquidate",
      [Cl.principal(wallet_1)],
      wallet_2
    );
    expect(liquidateResult.result).toBeErr(Cl.uint(112));
  });

  it("resumes operations after unpausing", () => {
    const accounts = simnet.getAccounts();
    const deployer = accounts.get("deployer")!;
    const wallet_1 = accounts.get("wallet_1")!;

    // Pause then unpause
    simnet.callPublicFn("bitflow-vault-core", "pause", [], deployer);
    simnet.callPublicFn("bitflow-vault-core", "unpause", [], deployer);

    // Deposit should work after unpausing
    const depositResult = simnet.callPublicFn(
      "bitflow-vault-core",
      "deposit",
      [Cl.uint(1000)],
      wallet_1
    );
    expect(depositResult.result).toBeOk(Cl.bool(true));
  });
});
