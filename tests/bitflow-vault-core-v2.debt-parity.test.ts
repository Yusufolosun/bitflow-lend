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

  it("uses the same debt basis for health factor and repayment amount", () => {
    init();
    setPrice(100);

    const depositAmount = 10_000_000;
    const borrowAmount = 1_000_000;

    deposit(depositAmount, wallet1());
    borrow(borrowAmount, 500, 30, wallet1());

    const healthFactor = readHealthFactor(wallet1(), 100);
    const repayment = readRepaymentDebt(wallet1());

    const collateralValue = (BigInt(depositAmount) * 100n) / 100n;
    const expectedHealthFactor = (collateralValue * 100n) / repayment.outstandingDebt;

    expect(healthFactor).toBe(expectedHealthFactor);
    expect(repayment.total).toBe(repayment.outstandingDebt + repayment.penalty);
  });
});
