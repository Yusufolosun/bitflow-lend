import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-vault-core-v2";

describe("bitflow-vault-core-v2 debt parity", () => {
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
});
