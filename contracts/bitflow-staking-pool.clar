;; Title: BitFlow Staking Pool
;; Version: 1.0.0
;; Author: BitFlow Team
;; License: MIT
;; Description: STX staking pool with reward distribution. Users stake STX
;;              to earn protocol rewards proportional to their share of the
;;              pool. Rewards accrue per-block and are claimable at any time.
;;              Implements a checkpoint-based accounting system to avoid
;;              iterating over all stakers on each reward distribution.

;; ===== ERROR CODES =====
(define-constant ERR-INSUFFICIENT-BALANCE (err u201))
(define-constant ERR-INVALID-AMOUNT (err u202))
(define-constant ERR-NO-STAKE (err u203))
(define-constant ERR-COOLDOWN-ACTIVE (err u204))
(define-constant ERR-NO-REWARDS (err u205))
(define-constant ERR-OWNER-ONLY (err u206))
(define-constant ERR-PROTOCOL-PAUSED (err u207))
(define-constant ERR-ZERO-AMOUNT (err u208))
(define-constant ERR-MAX-STAKE-EXCEEDED (err u209))
(define-constant ERR-INVALID-PARAM (err u210))
(define-constant ERR-INSUFFICIENT-REWARD-BALANCE (err u211))

;; ===== CONSTANTS =====
(define-constant MIN-STAKE-AMOUNT u1000000)        ;; 1 STX minimum stake
(define-constant MAX-STAKE-PER-USER u5000000000000) ;; 5M STX max per user
(define-constant COOLDOWN-PERIOD u144)              ;; ~1 day unstaking cooldown
(define-constant REWARD-PRECISION u1000000000000)   ;; 12 decimal precision for reward math

;; ===== ADMIN =====
(define-constant contract-owner tx-sender)

;; ===== PROTOCOL STATE =====
(define-data-var is-paused bool false)
(define-data-var total-staked uint u0)
(define-data-var reward-per-token-stored uint u0)
(define-data-var last-reward-block uint u0)
(define-data-var reward-rate uint u0)  ;; rewards per block in microSTX

;; ===== METRICS =====
(define-data-var total-stakers uint u0)
(define-data-var total-rewards-distributed uint u0)
(define-data-var total-stake-volume uint u0)
(define-data-var total-unstake-volume uint u0)
(define-data-var protocol-start-block uint u0)

;; ===== USER STATE =====
(define-map staker-balances principal uint)
(define-map staker-reward-per-token-paid principal uint)
(define-map staker-rewards principal uint)
(define-map staker-cooldown-end principal uint)
(define-map staker-last-action principal uint)

;; ===== PRIVATE FUNCTIONS =====

;; Calculate the accumulated reward per token since last update
(define-private (reward-per-token)
  (let (
    (staked (var-get total-staked))
  )
    (if (is-eq staked u0)
      (var-get reward-per-token-stored)
      (+ (var-get reward-per-token-stored)
         (/ (* (- block-height (var-get last-reward-block))
               (* (var-get reward-rate) REWARD-PRECISION))
            staked))
    )
  )
)

;; Calculate pending rewards for a given staker
(define-private (earned (staker principal))
  (let (
    (balance (default-to u0 (map-get? staker-balances staker)))
    (per-token (reward-per-token))
    (paid (default-to u0 (map-get? staker-reward-per-token-paid staker)))
    (pending (default-to u0 (map-get? staker-rewards staker)))
  )
    (+ pending
       (/ (* balance (- per-token paid))
          REWARD-PRECISION))
  )
)

;; Update reward accounting checkpoint
(define-private (update-reward (staker principal))
  (let (
    (current-per-token (reward-per-token))
    (staker-earned (earned staker))
  )
    (var-set reward-per-token-stored current-per-token)
    (var-set last-reward-block block-height)
    (map-set staker-rewards staker staker-earned)
    (map-set staker-reward-per-token-paid staker current-per-token)
    true
  )
)

;; ===== READ-ONLY FUNCTIONS =====

(define-read-only (get-contract-version)
  "1.0.0"
)

(define-read-only (get-staker-balance (staker principal))
  (default-to u0 (map-get? staker-balances staker))
)

(define-read-only (get-total-staked)
  (var-get total-staked)
)

(define-read-only (get-pending-rewards (staker principal))
  (earned staker)
)

(define-read-only (get-reward-rate)
  (var-get reward-rate)
)

(define-read-only (get-is-paused)
  (var-get is-paused)
)

(define-read-only (get-cooldown-end (staker principal))
  (default-to u0 (map-get? staker-cooldown-end staker))
)

(define-read-only (get-staker-share (staker principal))
  (let (
    (balance (default-to u0 (map-get? staker-balances staker)))
    (total (var-get total-staked))
  )
    (if (> total u0)
      (/ (* balance u10000) total)
      u0)
  )
)

(define-read-only (get-pool-stats)
  {
    total-staked: (var-get total-staked),
    total-stakers: (var-get total-stakers),
    reward-rate: (var-get reward-rate),
    total-rewards-distributed: (var-get total-rewards-distributed),
    total-stake-volume: (var-get total-stake-volume),
    total-unstake-volume: (var-get total-unstake-volume),
    is-paused: (var-get is-paused)
  }
)

(define-read-only (get-staker-info (staker principal))
  {
    balance: (default-to u0 (map-get? staker-balances staker)),
    pending-rewards: (earned staker),
    cooldown-end: (default-to u0 (map-get? staker-cooldown-end staker)),
    pool-share-bps: (get-staker-share staker),
    last-action-block: (default-to u0 (map-get? staker-last-action staker))
  }
)

;; Estimated annual reward rate in basis points (bps) for current pool state
;; Uses ~52560 blocks/year (10-min blocks). Returns 0 if no stake.
(define-read-only (get-estimated-apy-bps)
  (let (
    (staked (var-get total-staked))
    (rate (var-get reward-rate))
  )
    (if (is-eq staked u0)
      u0
      (/ (* (* rate u52560) u10000) staked))
  )
)

;; ===== ADMIN FUNCTIONS =====

(define-public (set-reward-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (<= new-rate u100000000) ERR-INVALID-PARAM)
    ;; Checkpoint current rewards before changing rate
    (var-set reward-per-token-stored (reward-per-token))
    (var-set last-reward-block block-height)
    (var-set reward-rate new-rate)
    (print { event: "reward-rate-updated", rate: new-rate, block: block-height })
    (ok true)
  )
)

(define-public (pause-pool)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused true)
    (print { event: "pool-paused", block: block-height })
    (ok true)
  )
)

(define-public (unpause-pool)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused false)
    (print { event: "pool-unpaused", block: block-height })
    (ok true)
  )
)

(define-public (fund-rewards (amount uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    (print { event: "rewards-funded", amount: amount, block: block-height })
    (ok true)
  )
)

(define-public (initialize-pool)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (is-eq (var-get protocol-start-block) u0) ERR-OWNER-ONLY)
    (var-set protocol-start-block block-height)
    (var-set last-reward-block block-height)
    (print { event: "pool-initialized", block: block-height })
    (ok true)
  )
)

;; ===== USER FUNCTIONS =====

;; Emergency unstake -- only available when pool is paused.
;; Bypasses cooldown so users can retrieve funds during emergencies.
;; Forfeits any unclaimed rewards to keep the operation simple/safe.
(define-public (emergency-unstake)
  (begin
    (asserts! (var-get is-paused) ERR-PROTOCOL-PAUSED)

    (let (
      (recipient tx-sender)
      (balance (default-to u0 (map-get? staker-balances recipient)))
    )
      (asserts! (> balance u0) ERR-NO-STAKE)

      ;; Return the full staked balance
      (try! (as-contract (stx-transfer? balance tx-sender recipient)))

      ;; Clear staker state
      (map-set staker-balances recipient u0)
      (map-set staker-rewards recipient u0)
      (map-set staker-cooldown-end recipient u0)
      (map-set staker-last-action recipient block-height)

      ;; Update pool metrics
      (var-set total-staked (if (>= (var-get total-staked) balance)
        (- (var-get total-staked) balance)
        u0))
      (var-set total-unstake-volume (+ (var-get total-unstake-volume) balance))
      (var-set total-stakers (if (> (var-get total-stakers) u0)
        (- (var-get total-stakers) u1)
        u0))

      (print { event: "emergency-unstake", user: recipient, amount: balance })
      (ok balance)
    )
  )
)

;; Stake STX into the pool
(define-public (stake (amount uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (> (var-get protocol-start-block) u0) ERR-PROTOCOL-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= amount MIN-STAKE-AMOUNT) ERR-INVALID-AMOUNT)

    (let (
      (current-balance (default-to u0 (map-get? staker-balances tx-sender)))
      (new-balance (+ current-balance amount))
      (is-new-staker (is-eq current-balance u0))
    )
      (asserts! (<= new-balance MAX-STAKE-PER-USER) ERR-MAX-STAKE-EXCEEDED)

      ;; Update reward accounting before changing balances
      (update-reward tx-sender)

      ;; Transfer STX from user to contract
      (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

      ;; Update staker balance
      (map-set staker-balances tx-sender new-balance)
      (map-set staker-last-action tx-sender block-height)

      ;; Update pool metrics
      (var-set total-staked (+ (var-get total-staked) amount))
      (var-set total-stake-volume (+ (var-get total-stake-volume) amount))

      ;; Increment staker count if new
      (if is-new-staker
        (var-set total-stakers (+ (var-get total-stakers) u1))
        true
      )

      (print { event: "stake", user: tx-sender, amount: amount, new-balance: new-balance })
      (ok true)
    )
  )
)

;; Request unstake (starts cooldown timer)
(define-public (request-unstake)
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (let (
      (balance (default-to u0 (map-get? staker-balances tx-sender)))
    )
      (asserts! (> balance u0) ERR-NO-STAKE)
      (map-set staker-cooldown-end tx-sender (+ block-height COOLDOWN-PERIOD))
      (print { event: "unstake-requested", user: tx-sender, cooldown-end: (+ block-height COOLDOWN-PERIOD) })
      (ok true)
    )
  )
)

;; Unstake STX after cooldown period
(define-public (unstake (amount uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (let (
      (recipient tx-sender)
      (current-balance (default-to u0 (map-get? staker-balances recipient)))
      (cooldown-end (default-to u0 (map-get? staker-cooldown-end recipient)))
    )
      (asserts! (>= current-balance amount) ERR-INSUFFICIENT-BALANCE)
      (asserts! (> cooldown-end u0) ERR-COOLDOWN-ACTIVE)
      (asserts! (>= block-height cooldown-end) ERR-COOLDOWN-ACTIVE)

      ;; Update reward accounting before changing balances
      (update-reward recipient)

      ;; Transfer STX from contract to user
      (try! (as-contract (stx-transfer? amount tx-sender recipient)))

      ;; Update staker balance
      (let (
        (new-balance (- current-balance amount))
      )
        (map-set staker-balances recipient new-balance)
        (map-set staker-last-action recipient block-height)

        ;; Reset cooldown
        (map-set staker-cooldown-end recipient u0)

        ;; Update pool metrics
        (var-set total-staked (if (>= (var-get total-staked) amount)
          (- (var-get total-staked) amount)
          u0))
        (var-set total-unstake-volume (+ (var-get total-unstake-volume) amount))

        ;; Decrement staker count if fully unstaked
        (if (is-eq new-balance u0)
          (var-set total-stakers (if (> (var-get total-stakers) u0)
            (- (var-get total-stakers) u1)
            u0))
          true
        )

        (print { event: "unstake", user: recipient, amount: amount, remaining: new-balance })
        (ok true)
      )
    )
  )
)

;; Claim accumulated rewards
(define-public (claim-rewards)
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (let (
      (recipient tx-sender)
    )
      ;; Update reward accounting
      (update-reward recipient)

      (let (
        (reward-amount (default-to u0 (map-get? staker-rewards recipient)))
      )
        (asserts! (> reward-amount u0) ERR-NO-REWARDS)

        ;; Verify contract has sufficient STX to pay rewards
        (asserts! (>= (stx-get-balance (as-contract tx-sender)) reward-amount)
          ERR-INSUFFICIENT-REWARD-BALANCE)

        ;; Reset pending rewards
        (map-set staker-rewards recipient u0)

        ;; Transfer rewards to staker
        (try! (as-contract (stx-transfer? reward-amount tx-sender recipient)))

        ;; Update metrics
        (var-set total-rewards-distributed (+ (var-get total-rewards-distributed) reward-amount))
        (map-set staker-last-action recipient block-height)

        (print { event: "rewards-claimed", user: recipient, amount: reward-amount })
        (ok reward-amount)
      )
    )
  )
)

;; Single-call dashboard snapshot for frontend/indexer consumption
(define-read-only (get-dashboard-snapshot)
  (let (
    (staked (var-get total-staked))
    (rate (var-get reward-rate))
  )
    {
      total-staked: staked,
      total-stakers: (var-get total-stakers),
      reward-rate: rate,
      estimated-apy-bps: (if (is-eq staked u0) u0 (/ (* (* rate u52560) u10000) staked)),
      total-rewards-distributed: (var-get total-rewards-distributed),
      total-stake-volume: (var-get total-stake-volume),
      total-unstake-volume: (var-get total-unstake-volume),
      is-paused: (var-get is-paused),
      protocol-age-blocks: (if (> (var-get protocol-start-block) u0)
        (- block-height (var-get protocol-start-block))
        u0)
    }
  )
)
