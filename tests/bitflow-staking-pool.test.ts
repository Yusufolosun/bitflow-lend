import { Cl } from "@stacks/transactions";
import { describe, expect, it } from "vitest";

const CONTRACT = "bitflow-staking-pool";

describe("bitflow-staking-pool", () => {
  // ── helpers ──────────────────────────────────────────────────────
  const getAccounts = () => simnet.getAccounts();
  const deployer = () => getAccounts().get("deployer")!;
  const wallet1 = () => getAccounts().get("wallet_1")!;
  const wallet2 = () => getAccounts().get("wallet_2")!;
  const wallet3 = () => getAccounts().get("wallet_3")!;

  const initPool = () =>
    simnet.callPublicFn(CONTRACT, "initialize-pool", [], deployer());

  const setRate = (rate: number) =>
    simnet.callPublicFn(CONTRACT, "set-reward-rate", [Cl.uint(rate)], deployer());

  const fundRewards = (amount: number) =>
    simnet.callPublicFn(CONTRACT, "fund-rewards", [Cl.uint(amount)], deployer());

  const stake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "stake", [Cl.uint(amount)], sender);

  const requestUnstake = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "request-unstake", [], sender);

  const unstake = (amount: number, sender: string) =>
    simnet.callPublicFn(CONTRACT, "unstake", [Cl.uint(amount)], sender);

  const claimRewards = (sender: string) =>
    simnet.callPublicFn(CONTRACT, "claim-rewards", [], sender);

  const getBalance = (staker: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-balance", [Cl.principal(staker)], staker);

  const getTotalStaked = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-total-staked", [], deployer());

  const getPendingRewards = (staker: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-pending-rewards", [Cl.principal(staker)], staker);

  const getPoolStats = () =>
    simnet.callReadOnlyFn(CONTRACT, "get-pool-stats", [], deployer());

  const getStakerInfo = (staker: string) =>
    simnet.callReadOnlyFn(CONTRACT, "get-staker-info", [Cl.principal(staker)], staker);

  // ── initialization ──────────────────────────────────────────────

  describe("initialization", () => {
    it("allows owner to initialize the pool", () => {
      const { result } = initPool();
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects double initialization", () => {
      initPool();
      const { result } = initPool();
      expect(result).toBeErr(Cl.uint(206));
    });

    it("rejects initialization from non-owner", () => {
      const { result } = simnet.callPublicFn(CONTRACT, "initialize-pool", [], wallet1());
      expect(result).toBeErr(Cl.uint(206));
    });
  });

  // ── staking ─────────────────────────────────────────────────────

  describe("staking", () => {
    it("allows user to stake STX", () => {
      initPool();
      const { result } = stake(5000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("updates staker balance after stake", () => {
      initPool();
      stake(5000000, wallet1());
      const { result } = getBalance(wallet1());
      expect(result).toBeUint(5000000);
    });

    it("updates total staked amount", () => {
      initPool();
      stake(5000000, wallet1());
      const { result } = getTotalStaked();
      expect(result).toBeUint(5000000);
    });

    it("tracks multiple stakers correctly", () => {
      initPool();
      stake(5000000, wallet1());
      stake(3000000, wallet2());
      const { result } = getTotalStaked();
      expect(result).toBeUint(8000000);
    });

    it("allows additional stakes from same user", () => {
      initPool();
      stake(5000000, wallet1());
      stake(3000000, wallet1());
      const { result } = getBalance(wallet1());
      expect(result).toBeUint(8000000);
    });

    it("rejects stake below minimum", () => {
      initPool();
      const { result } = stake(100, wallet1());
      expect(result).toBeErr(Cl.uint(202));
    });

    it("rejects zero stake", () => {
      initPool();
      const { result } = stake(0, wallet1());
      expect(result).toBeErr(Cl.uint(208));
    });

    it("rejects stake exceeding per-user max", () => {
      initPool();
      const { result } = stake(5000000000001, wallet1());
      expect(result).toBeErr(Cl.uint(209));
    });

    it("rejects stake when pool is paused", () => {
      initPool();
      simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
      const { result } = stake(5000000, wallet1());
      expect(result).toBeErr(Cl.uint(207));
    });
  });

  // ── unstaking ───────────────────────────────────────────────────

  describe("unstaking", () => {
    it("requires cooldown request before unstake", () => {
      initPool();
      stake(5000000, wallet1());
      const { result } = unstake(5000000, wallet1());
      expect(result).toBeErr(Cl.uint(204));
    });

    it("allows unstake after cooldown period", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(5000000, wallet1());
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects unstake before cooldown expires", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(50);
      const { result } = unstake(5000000, wallet1());
      expect(result).toBeErr(Cl.uint(204));
    });

    it("rejects unstake exceeding balance", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(6000000, wallet1());
      expect(result).toBeErr(Cl.uint(201));
    });

    it("allows partial unstake", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(3000000, wallet1());
      const { result } = getBalance(wallet1());
      expect(result).toBeUint(2000000);
    });

    it("updates total staked after unstake", () => {
      initPool();
      stake(5000000, wallet1());
      stake(3000000, wallet2());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(5000000, wallet1());
      const { result } = getTotalStaked();
      expect(result).toBeUint(3000000);
    });

    it("rejects request-unstake with no stake", () => {
      initPool();
      const { result } = requestUnstake(wallet1());
      expect(result).toBeErr(Cl.uint(203));
    });

    it("rejects zero unstake amount", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      const { result } = unstake(0, wallet1());
      expect(result).toBeErr(Cl.uint(208));
    });
  });

  // ── rewards ─────────────────────────────────────────────────────

  describe("rewards", () => {
    it("accrues rewards based on reward rate", () => {
      initPool();
      setRate(1000);
      fundRewards(100000000);
      stake(5000000, wallet1());
      simnet.mineEmptyBlocks(10);
      const { result } = getPendingRewards(wallet1());
      // After 10 blocks at rate 1000/block with sole staker => 10 * 1000 = 10000
      expect(result).toBeUint(10000);
    });

    it("allows claiming rewards", () => {
      initPool();
      setRate(1000);
      fundRewards(100000000);
      stake(5000000, wallet1());
      simnet.mineEmptyBlocks(10);
      const { result } = claimRewards(wallet1());
      expect(result).toBeOk(Cl.uint(11000));
    });

    it("resets pending rewards after claim", () => {
      initPool();
      setRate(1000);
      fundRewards(100000000);
      stake(5000000, wallet1());
      simnet.mineEmptyBlocks(10);
      claimRewards(wallet1());
      const { result } = getPendingRewards(wallet1());
      expect(result).toBeUint(0);
    });

    it("rejects claim when no rewards pending", () => {
      initPool();
      stake(5000000, wallet1());
      const { result } = claimRewards(wallet1());
      expect(result).toBeErr(Cl.uint(205));
    });

    it("distributes rewards proportionally to multiple stakers", () => {
      initPool();
      setRate(1000);
      fundRewards(100000000);

      stake(5000000, wallet1());
      stake(5000000, wallet2());

      simnet.mineEmptyBlocks(10);

      const r1 = getPendingRewards(wallet1());
      const r2 = getPendingRewards(wallet2());

      // wallet1 earns 1 extra block solo before wallet2 joins
      expect(r1.result).toBeUint(6000);
      expect(r2.result).toBeUint(5000);
    });
  });

  // ── admin functions ─────────────────────────────────────────────

  describe("admin", () => {
    it("allows owner to set reward rate", () => {
      initPool();
      const { result } = setRate(5000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects reward rate from non-owner", () => {
      initPool();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-reward-rate", [Cl.uint(5000)], wallet1()
      );
      expect(result).toBeErr(Cl.uint(206));
    });

    it("rejects excessively high reward rate", () => {
      initPool();
      const { result } = simnet.callPublicFn(
        CONTRACT, "set-reward-rate", [Cl.uint(200000000)], deployer()
      );
      expect(result).toBeErr(Cl.uint(210));
    });

    it("allows owner to pause and unpause pool", () => {
      initPool();
      let { result } = simnet.callPublicFn(CONTRACT, "pause-pool", [], deployer());
      expect(result).toBeOk(Cl.bool(true));
      ({ result } = simnet.callPublicFn(CONTRACT, "unpause-pool", [], deployer()));
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects pause from non-owner", () => {
      initPool();
      const { result } = simnet.callPublicFn(CONTRACT, "pause-pool", [], wallet1());
      expect(result).toBeErr(Cl.uint(206));
    });

    it("allows owner to fund rewards", () => {
      initPool();
      const { result } = fundRewards(10000000);
      expect(result).toBeOk(Cl.bool(true));
    });

    it("rejects zero fund amount", () => {
      initPool();
      const { result } = simnet.callPublicFn(
        CONTRACT, "fund-rewards", [Cl.uint(0)], deployer()
      );
      expect(result).toBeErr(Cl.uint(208));
    });
  });

  // ── read-only queries ───────────────────────────────────────────

  describe("read-only queries", () => {
    it("returns correct pool stats", () => {
      initPool();
      setRate(500);
      stake(5000000, wallet1());
      stake(3000000, wallet2());

      const { result } = getPoolStats();
      expect(result).toBeTuple({
        "total-staked": Cl.uint(8000000),
        "total-stakers": Cl.uint(2),
        "reward-rate": Cl.uint(500),
        "total-rewards-distributed": Cl.uint(0),
        "total-stake-volume": Cl.uint(8000000),
        "total-unstake-volume": Cl.uint(0),
        "is-paused": Cl.bool(false),
      });
    });

    it("returns correct staker info", () => {
      initPool();
      stake(5000000, wallet1());

      const { result } = getStakerInfo(wallet1());
      const tupleData = result as any;
      expect(tupleData.value.balance).toBeUint(5000000);
    });

    it("returns staker pool share in basis points", () => {
      initPool();
      stake(5000000, wallet1());
      stake(5000000, wallet2());

      const r1 = simnet.callReadOnlyFn(
        CONTRACT, "get-staker-share", [Cl.principal(wallet1())], wallet1()
      );
      expect(r1.result).toBeUint(5000); // 50% = 5000 bps
    });

    it("returns contract version", () => {
      const { result } = simnet.callReadOnlyFn(
        CONTRACT, "get-contract-version", [], deployer()
      );
      expect(result).toBeAscii("1.0.0");
    });

    it("returns zero for non-staker balance", () => {
      initPool();
      const { result } = getBalance(wallet3());
      expect(result).toBeUint(0);
    });
  });

  // ── edge cases ──────────────────────────────────────────────────

  describe("edge cases", () => {
    it("handles stake-unstake-restake cycle", () => {
      initPool();
      stake(5000000, wallet1());
      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(5000000, wallet1());

      const balAfterUnstake = getBalance(wallet1());
      expect(balAfterUnstake.result).toBeUint(0);

      stake(3000000, wallet1());
      const balAfterRestake = getBalance(wallet1());
      expect(balAfterRestake.result).toBeUint(3000000);
    });

    it("correctly decrements staker count on full unstake", () => {
      initPool();
      stake(5000000, wallet1());
      stake(3000000, wallet2());

      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(5000000, wallet1());

      const { result } = getPoolStats();
      const tupleData = result as any;
      expect(tupleData.value["total-stakers"]).toBeUint(1);
    });

    it("does not decrement staker count on partial unstake", () => {
      initPool();
      stake(5000000, wallet1());

      requestUnstake(wallet1());
      simnet.mineEmptyBlocks(145);
      unstake(2000000, wallet1());

      const { result } = getPoolStats();
      const tupleData = result as any;
      expect(tupleData.value["total-stakers"]).toBeUint(1);
    });

    it("rewards continue accruing after rate change", () => {
      initPool();
      setRate(1000);
      fundRewards(100000000);
      stake(5000000, wallet1());

      simnet.mineEmptyBlocks(5);
      setRate(2000);
      simnet.mineEmptyBlocks(5);

      const { result } = getPendingRewards(wallet1());
      // 5 blocks * 1000 + 1 block (rate change tx) * 1000 + 5 blocks * 2000 = 16000
      expect(result).toBeUint(16000);
    });
  });
});
