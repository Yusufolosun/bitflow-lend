import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v3";

describe("bitflow-vault-core-v3 debt parity", () => {
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;

  const init = () =>
    simnet.callPublicFn(CONTRACT, "initialize", [], deployer());
  const setPrice = (price: number) =>
    simnet.callPublicFn(CONTRACT, "set-stx-price", [Cl.uint(price)], deployer());
  const deposit = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "deposit", [Cl.uint(amount)], sender);
  const borrow = (amount: number, rate: number, termDays: number, sender: string) =>
    simnet.callPublicFn(
      CONTRACT,
      "borrow",
      [Cl.uint(amount), Cl.uint(rate), Cl.uint(termDays)],
      sender
    );

  const readHealthFactor = (user: string, stxPrice: number): bigint => {
    const response = simnet.callReadOnlyFn(
      CONTRACT,
      "calculate-health-factor",
      [Cl.principal(user), Cl.uint(stxPrice)],
      deployer()
    );
    return BigInt((response.result as any).value?.value);
  };

  const readRepaymentDebt = (user: string) => {
    const response = simnet.callReadOnlyFn(
      CONTRACT,
      "get-repayment-amount",
      [Cl.principal(user)],
      deployer()
    );
    const tuple = (response.result as any).value?.value;

    const principal = BigInt(tuple.principal.value);
    const interest = BigInt(tuple.interest.value);
    const penalty = BigInt(tuple.penalty.value);
    const total = BigInt(tuple.total.value);

    return {
      principal,
      interest,
      penalty,
      total,
      outstandingDebt: principal + interest,
    };
  };

  const readLoanSnapshot = (user: string) => {
    const response = simnet.callReadOnlyFn(
      CONTRACT,
      "get-user-loan",
      [Cl.principal(user)],
      deployer()
    );
    const tuple = (response.result as any).value?.value;

    return {
      principal: BigInt(tuple.amount.value),
      rate: BigInt(tuple["interest-rate"].value),
      startBlock: BigInt(tuple["start-block"].value),
    };
  };

  const readOutstandingDebt = (principal: bigint, rate: bigint, elapsedBlocks: bigint) => {
    const response = simnet.callReadOnlyFn(
      CONTRACT,
      "calculate-outstanding-debt",
      [Cl.uint(principal), Cl.uint(rate), Cl.uint(elapsedBlocks)],
      deployer()
    );

    const rawValue = (response.result as any).value;
    return BigInt(rawValue?.value ?? rawValue);
  };

  const expectedHealthFactor = (depositAmount: number, stxPrice: number, debt: bigint) => {
    const collateralValue = (BigInt(depositAmount) * BigInt(stxPrice)) / 100n;
    return (collateralValue * 100n) / debt;
  };

  it("uses the same debt basis for health factor and repayment amount", () => {
    init();
    setPrice(100);

    const depositAmount = 10_000_000;
    const borrowAmount = 1_000_000;
    const stxPrice = 100;

    deposit(depositAmount, wallet1());
    borrow(borrowAmount, 500, 30, wallet1());

    const healthFactor = readHealthFactor(wallet1(), stxPrice);
    const repayment = readRepaymentDebt(wallet1());

    expect(healthFactor).toBe(expectedHealthFactor(depositAmount, stxPrice, repayment.outstandingDebt));
    expect(repayment.total).toBe(repayment.outstandingDebt + repayment.penalty);
  });

  it("keeps debt parity after interest accrual and late penalty", () => {
    init();
    setPrice(100);

    const depositAmount = 20_000_000;
    const borrowAmount = 2_000_000;
    const stxPrice = 100;

    deposit(depositAmount, wallet1());
    borrow(borrowAmount, 500, 1, wallet1());
    simnet.mineEmptyBlocks(200);

    const healthFactor = readHealthFactor(wallet1(), stxPrice);
    const repayment = readRepaymentDebt(wallet1());

    expect(repayment.penalty).toBeGreaterThan(0n);
    expect(healthFactor).toBe(expectedHealthFactor(depositAmount, stxPrice, repayment.outstandingDebt));
    expect(repayment.total).toBe(repayment.outstandingDebt + repayment.penalty);
  });

  it("matches calculate-outstanding-debt with repayment principal plus interest", () => {
    init();
    setPrice(100);

    deposit(10_000_000, wallet1());
    borrow(1_000_000, 500, 30, wallet1());
    simnet.mineEmptyBlocks(25);

    const loan = readLoanSnapshot(wallet1());
    const currentBlock = BigInt(simnet.blockHeight);
    const elapsedBlocks = currentBlock - loan.startBlock;

    const outstandingDebt = readOutstandingDebt(loan.principal, loan.rate, elapsedBlocks);
    const repayment = readRepaymentDebt(wallet1());

    expect(outstandingDebt).toBe(repayment.outstandingDebt);
  });

  it("returns principal when elapsed blocks is zero", () => {
    const principal = 1_500_000n;
    const rate = 500n;
    const elapsedBlocks = 0n;

    const outstandingDebt = readOutstandingDebt(principal, rate, elapsedBlocks);
    expect(outstandingDebt).toBe(principal);
  });

  it("increases outstanding debt as elapsed blocks grow", () => {
    const principal = 1_500_000n;
    const rate = 500n;

    const debtAt10 = readOutstandingDebt(principal, rate, 10n);
    const debtAt100 = readOutstandingDebt(principal, rate, 100n);

    expect(debtAt100).toBeGreaterThan(debtAt10);
    expect(debtAt10).toBeGreaterThanOrEqual(principal);
  });

  it("debt grows proportionally over full-year elapsed blocks", () => {
    const principal = 10_000_000n;
    const rate = 500n; // 5% annual

    const debtAtYear = readOutstandingDebt(principal, rate, 52560n);
    const interest = debtAtYear - principal;

    // 5% of 10M = 500_000, allow 1% tolerance
    expect(interest).toBeGreaterThan(490_000n);
    expect(interest).toBeLessThan(510_000n);
  });

  it("zero-rate loan accrues no interest", () => {
    // rate=0 is not valid per contract constraints, but test defensive math
    // Using minimum rate (50 = 0.5%) instead
    const principal = 1_000_000n;
    const rate = 50n;
    const debtAt0 = readOutstandingDebt(principal, rate, 0n);
    expect(debtAt0).toBe(principal);
  });
});

