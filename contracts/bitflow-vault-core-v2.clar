;; Title: BitFlow Lend - Vault Core (Enhanced v2)
;; Version: 2.0.0
;; Author: BitFlow Team
;; License: MIT
;; Description: Bitcoin-native fixed-rate lending protocol with enhanced security
;;              and safety mechanisms. Implements 150% collateralization ratio
;;              with automated liquidations and improved validation.
;;
;; ENHANCEMENTS IN V2:
;; - Stricter input validation and bound checking
;; - Health factor enforcement on sensitive operations
;; - Reentrancy guard pattern via atomic operations
;; - Per-function pause capabilities
;; - Improved precision in interest calculations
;; - Oracle staleness mitigation
;; - Better liquidation sequencing

;; ===== ERROR CODES =====
(define-constant ERR-INSUFFICIENT-BALANCE (err u101))
(define-constant ERR-INVALID-AMOUNT (err u102))
(define-constant ERR-ALREADY-HAS-LOAN (err u103))
(define-constant ERR-INSUFFICIENT-COLLATERAL (err u105))
(define-constant ERR-NO-ACTIVE-LOAN (err u106))
(define-constant ERR-NOT-LIQUIDATABLE (err u107))
(define-constant ERR-LIQUIDATE-OWN-LOAN (err u108))
(define-constant ERR-INVALID-INTEREST-RATE (err u110))
(define-constant ERR-INVALID-TERM (err u111))
(define-constant ERR-PRICE-NOT-SET (err u113))
(define-constant ERR-PROTOCOL-PAUSED (err u112))
(define-constant ERR-OWNER-ONLY (err u109))
(define-constant ERR-STALE-PRICE (err u114))
(define-constant ERR-MIN-BORROW-AMOUNT (err u115))
(define-constant ERR-MAX-BORROW-EXCEEDED (err u116))
(define-constant ERR-INVALID-PRICE (err u117))
(define-constant ERR-HEALTH-FACTOR-LOW (err u118))
(define-constant ERR-ZERO-AMOUNT (err u119))
(define-constant ERR-INVALID-PARAM (err u120))
(define-constant ERR-INSUFFICIENT-LIQUIDITY (err u121))

;; ===== TUNABLE PROTOCOL PARAMETERS =====
(define-data-var min-collateral-ratio uint u150)
(define-data-var liquidation-threshold uint u110)
(define-data-var max-interest-rate uint u10000) ;; 100% APR in basis points
(define-data-var min-interest-rate uint u50)    ;; 0.5% APR in basis points
(define-data-var min-term-days uint u1)
(define-data-var max-term-days uint u365)       ;; Maximum 1 year loan term
(define-data-var late-penalty-rate uint u500)   ;; 5% penalty

;; ===== FIXED CONSTANTS =====
(define-constant MIN-BORROW-AMOUNT u100000) ;; 0.1 STX minimum
(define-constant MAX-BORROW-AMOUNT u500000000000) ;; 500K STX maximum
(define-constant PRICE-STALENESS-THRESHOLD u144) ;; ~1 day blocks
(define-constant DEPOSIT-LIMIT u10000000000000) ;; 10M STX max per user
(define-constant PRECISION-MULTIPLIER u1000000) ;; For decimal calculations

;; ===== DATA STRUCTURES =====
(define-map user-deposits principal uint)
(define-map user-loans principal 
  {
    amount: uint,
    interest-rate: uint,
    start-block: uint,
    term-end: uint,
    created-at-price: uint
  }
)

;; Oracle data with staleness check
(define-data-var admin-stx-price uint u0)
(define-data-var price-update-block uint u0)

;; Protocol Control
(define-data-var is-paused bool false)
(define-data-var deposits-enabled bool true)
(define-data-var withdrawals-enabled bool true)
(define-data-var borrows-enabled bool true)
(define-data-var liquidations-enabled bool true)

;; Financial Metrics
(define-data-var total-deposits uint u0)
(define-data-var total-repaid uint u0)
(define-data-var total-liquidations uint u0)
(define-data-var total-outstanding-borrows uint u0)

;; Protocol Metrics
(define-data-var total-deposits-count uint u0)
(define-data-var total-withdrawals-count uint u0)
(define-data-var total-borrows-count uint u0)
(define-data-var total-repayments-count uint u0)
(define-data-var total-liquidations-count uint u0)

;; Volume metrics
(define-data-var total-deposit-volume uint u0)
(define-data-var total-borrow-volume uint u0)
(define-data-var total-repay-volume uint u0)
(define-data-var total-liquidation-volume uint u0)

;; Timing metrics
(define-data-var last-activity-block uint u0)
(define-data-var protocol-start-block uint u0)

;; Admin
(define-constant contract-owner tx-sender)

;; ===== PRIVATE UTILITY FUNCTIONS =====

;; Safe addition with overflow protection
;; Clarity uint is 128-bit; (+ a b) panics on overflow, so check first.
(define-private (safe-add (a uint) (b uint))
  (let ((max-uint u340282366920938463463374607431768211455))
    (if (> a (- max-uint b))
      max-uint
      (+ a b)
    )
  )
)

;; Safe subtraction with underflow protection
(define-private (safe-sub (a uint) (b uint))
  (if (< a b)
    u0
    (- a b)
  )
)

;; Validate price not stale
(define-private (is-price-valid)
  (let (
    (price (var-get admin-stx-price))
    (update-block (var-get price-update-block))
  )
    (and
      (> price u0)
      (> update-block u0)
      (>= block-height update-block)
      (< (- block-height update-block) PRICE-STALENESS-THRESHOLD)
    )
  )
)

;; Calculate interest with ceiling division to prevent rounding to zero
;; Principal (in microSTX) * RatePercentage (basis points) * BlocksElapsed / (100 * 52560 blocks/year)
;; Uses ceiling division: (a + b - 1) / b for non-zero amounts
(define-private (calculate-interest-precise (principal uint) (rate uint) (blocks-elapsed uint))
  (let (
    (raw-numerator (* (* principal rate) blocks-elapsed))
    (denominator (* u100 u52560))
  )
    (if (is-eq raw-numerator u0)
      u0
      (/ (- (+ raw-numerator denominator) u1) denominator)
    )
  )
)

;; ===== READ-ONLY FUNCTIONS =====

(define-read-only (get-contract-version)
  "2.0.0"
)

(define-read-only (get-user-deposit (user principal))
  (default-to u0 (map-get? user-deposits user))
)

(define-read-only (get-total-deposits)
  (var-get total-deposits)
)

(define-read-only (get-user-loan (user principal))
  (map-get? user-loans user)
)

(define-read-only (calculate-required-collateral (borrow-amount uint))
  (/ (* borrow-amount (var-get min-collateral-ratio)) u100)
)

(define-read-only (get-total-repaid)
  (var-get total-repaid)
)

(define-read-only (get-total-liquidations)
  (var-get total-liquidations)
)

(define-read-only (get-protocol-stats)
  {
    total-deposits: (var-get total-deposits),
    total-repaid: (var-get total-repaid),
    total-liquidations: (var-get total-liquidations),
    total-outstanding-borrows: (var-get total-outstanding-borrows),
    price-valid: (is-price-valid)
  }
)

(define-read-only (get-max-borrow-amount (user principal))
  (if (is-some (map-get? user-loans user))
    u0
    (let (
      (user-deposit (default-to u0 (map-get? user-deposits user)))
      (max-borrow (/ (* user-deposit u100) (var-get min-collateral-ratio)))
    )
      (if (> max-borrow MAX-BORROW-AMOUNT)
        MAX-BORROW-AMOUNT
        max-borrow
      )
    )
  )
)

(define-read-only (calculate-health-factor (user principal) (stx-price uint))
  (match (map-get? user-loans user)
    loan
      (let (
        (user-deposit (default-to u0 (map-get? user-deposits user)))
        (loan-amount (get amount loan))
        (collateral-value (/ (* user-deposit stx-price) u100))
        (health-factor (if (> loan-amount u0)
          (/ (* collateral-value u100) loan-amount)
          u200))
      )
        (some health-factor)
      )
    none
  )
)

(define-read-only (is-liquidatable (user principal) (stx-price uint))
  (match (map-get? user-loans user)
    loan
      (if (> block-height (get term-end loan))
        true
        (match (calculate-health-factor user stx-price)
          health-factor
            (< health-factor (var-get liquidation-threshold))
          false
        )
      )
    false
  )
)

(define-read-only (get-repayment-amount (user principal))
  (match (map-get? user-loans user)
    loan
      (let (
        (blocks-elapsed (safe-sub block-height (get start-block loan)))
        (interest (calculate-interest-precise (get amount loan) (get interest-rate loan) blocks-elapsed))
        (penalty (if (> block-height (get term-end loan))
          (/ (* (get amount loan) (var-get late-penalty-rate)) u10000)
          u0))
        (total (safe-add (safe-add (get amount loan) interest) penalty))
      )
        (some { principal: (get amount loan), interest: interest, penalty: penalty, total: total })
      )
    none
  )
)

(define-read-only (get-stx-price)
  (var-get admin-stx-price)
)

(define-read-only (get-price-staleness-blocks)
  (let ((update-block (var-get price-update-block)))
    (if (and (> update-block u0) (>= block-height update-block))
      (- block-height update-block)
      u0))
)

(define-read-only (get-is-paused)
  (var-get is-paused)
)

(define-read-only (get-protocol-metrics)
  {
    total-deposits: (var-get total-deposits-count),
    total-withdrawals: (var-get total-withdrawals-count),
    total-borrows: (var-get total-borrows-count),
    total-repayments: (var-get total-repayments-count),
    total-liquidations: (var-get total-liquidations-count)
  }
)

(define-read-only (get-volume-metrics)
  {
    deposit-volume: (var-get total-deposit-volume),
    borrow-volume: (var-get total-borrow-volume),
    repay-volume: (var-get total-repay-volume),
    liquidation-volume: (var-get total-liquidation-volume)
  }
)

;; Utilization ratio in basis points (0-10000)
;; Returns 0 when there are no deposits to avoid division by zero
(define-read-only (get-utilization-ratio)
  (let (
    (deposits (var-get total-deposits))
    (borrowed (var-get total-outstanding-borrows))
  )
    (if (> deposits u0)
      (/ (* borrowed u10000) deposits)
      u0))
)

(define-read-only (get-user-position-summary (user principal) (stx-price uint))
  (let (
    (deposit-amount (default-to u0 (map-get? user-deposits user)))
    (loan-data (map-get? user-loans user))
    (max-borrow (get-max-borrow-amount user))
  )
    {
      deposit-amount: deposit-amount,
      has-loan: (is-some loan-data),
      loan-amount: (match loan-data
        loan-info (get amount loan-info)
        u0
      ),
      loan-interest-rate: (match loan-data
        loan-info (get interest-rate loan-info)
        u0
      ),
      loan-term-end: (match loan-data
        loan-info (get term-end loan-info)
        u0
      ),
      health-factor: (match loan-data
        loan-info (calculate-health-factor user stx-price)
        (some u200)
      ),
      is-liquidatable: (is-liquidatable user stx-price),
      is-liquidatable-by-term: (match loan-data
        loan-info (> block-height (get term-end loan-info))
        false
      ),
      max-borrow-available: max-borrow,
      collateral-usage-percent: (if (> deposit-amount u0)
        (match loan-data
          loan-info (/ (* (get amount loan-info) u100) deposit-amount)
          u0
        )
        u0
      )
    }
  )
)

;; ===== ADMIN FUNCTIONS =====

(define-public (pause-protocol)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused true)
    (print { event: "protocol-paused", block: block-height })
    (ok true)
  )
)

(define-public (unpause-protocol)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused false)
    (print { event: "protocol-unpaused", block: block-height })
    (ok true)
  )
)

(define-public (set-stx-price (price uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (< price u100000000) ERR-INVALID-PRICE) ;; Sanity check: price < 100M microSTX
    (var-set admin-stx-price price)
    (var-set price-update-block block-height)
    (print { event: "price-updated", price: price, block: block-height })
    (ok true)
  )
)

(define-public (toggle-deposits-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set deposits-enabled enabled)
    (print { event: "deposits-toggled", enabled: enabled })
    (ok true)
  )
)

(define-public (toggle-withdrawals-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set withdrawals-enabled enabled)
    (print { event: "withdrawals-toggled", enabled: enabled })
    (ok true)
  )
)

(define-public (toggle-borrows-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set borrows-enabled enabled)
    (print { event: "borrows-toggled", enabled: enabled })
    (ok true)
  )
)

(define-public (toggle-liquidations-enabled (enabled bool))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set liquidations-enabled enabled)
    (print { event: "liquidations-toggled", enabled: enabled })
    (ok true)
  )
)

;; Update protocol parameters (contract owner only)
;; Each setter enforces safety bounds to prevent destructive values

(define-public (set-min-collateral-ratio (new-ratio uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-ratio u100) ERR-INVALID-PARAM)
    (asserts! (<= new-ratio u500) ERR-INVALID-PARAM)
    (var-set min-collateral-ratio new-ratio)
    (print { event: "set-min-collateral-ratio", value: new-ratio })
    (ok true)))

(define-public (set-liquidation-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-threshold u100) ERR-INVALID-PARAM)
    (asserts! (< new-threshold (var-get min-collateral-ratio)) ERR-INVALID-PARAM)
    (var-set liquidation-threshold new-threshold)
    (print { event: "set-liquidation-threshold", value: new-threshold })
    (ok true)))

(define-public (set-interest-rate-bounds (new-min uint) (new-max uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (> new-min u0) ERR-INVALID-PARAM)
    (asserts! (> new-max new-min) ERR-INVALID-PARAM)
    (asserts! (<= new-max u50000) ERR-INVALID-PARAM)
    (var-set min-interest-rate new-min)
    (var-set max-interest-rate new-max)
    (print { event: "set-interest-rate-bounds", min: new-min, max: new-max })
    (ok true)))

(define-public (set-term-limits (new-min uint) (new-max uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-min u1) ERR-INVALID-PARAM)
    (asserts! (> new-max new-min) ERR-INVALID-PARAM)
    (asserts! (<= new-max u730) ERR-INVALID-PARAM)
    (var-set min-term-days new-min)
    (var-set max-term-days new-max)
    (print { event: "set-term-limits", min: new-min, max: new-max })
    (ok true)))

(define-public (set-late-penalty-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-rate u10) ERR-INVALID-PARAM)   ;; min 0.1% penalty
    (asserts! (<= new-rate u2000) ERR-INVALID-PARAM)
    (var-set late-penalty-rate new-rate)
    (print { event: "set-late-penalty-rate", value: new-rate })
    (ok true)))

(define-read-only (get-protocol-parameters)
  (ok {
    min-collateral-ratio: (var-get min-collateral-ratio),
    liquidation-threshold: (var-get liquidation-threshold),
    min-interest-rate: (var-get min-interest-rate),
    max-interest-rate: (var-get max-interest-rate),
    min-term-days: (var-get min-term-days),
    max-term-days: (var-get max-term-days),
    late-penalty-rate: (var-get late-penalty-rate)
  }))

;; ===== USER FUNCTIONS =====

(define-public (deposit (amount uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (var-get deposits-enabled) ERR-PROTOCOL-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (< amount DEPOSIT-LIMIT) ERR-INSUFFICIENT-BALANCE)
    
    (let (
      (current-deposit (default-to u0 (map-get? user-deposits tx-sender)))
      (new-deposit (safe-add current-deposit amount))
    )
      (asserts! (<= new-deposit DEPOSIT-LIMIT) ERR-INSUFFICIENT-BALANCE)
      
      ;; Transfer STX from user to contract
      (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
      
      ;; Update user deposit
      (map-set user-deposits tx-sender new-deposit)
      
      ;; Update metrics
      (var-set total-deposits (safe-add (var-get total-deposits) amount))
      (var-set total-deposits-count (+ (var-get total-deposits-count) u1))
      (var-set total-deposit-volume (safe-add (var-get total-deposit-volume) amount))
      (var-set last-activity-block block-height)
      
      (print { event: "deposit", user: tx-sender, amount: amount, new-balance: new-deposit })
      (ok true)
    )
  )
)

(define-public (withdraw (amount uint))
  (let (
    (recipient tx-sender)
  )
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (var-get withdrawals-enabled) ERR-PROTOCOL-PAUSED)
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)

    (let (
      (user-balance (default-to u0 (map-get? user-deposits recipient)))
      (locked-collateral (match (map-get? user-loans recipient)
        loan (calculate-required-collateral (get amount loan))
        u0))
      (available-balance (safe-sub user-balance locked-collateral))
    )
      (asserts! (>= available-balance amount) ERR-INSUFFICIENT-BALANCE)

      ;; Transfer STX from contract to user
      (try! (as-contract (stx-transfer? amount tx-sender recipient)))

      ;; Update user deposit
      (map-set user-deposits recipient (safe-sub user-balance amount))

      ;; Update metrics
      (var-set total-deposits (safe-sub (var-get total-deposits) amount))
      (var-set total-withdrawals-count (+ (var-get total-withdrawals-count) u1))
      (var-set last-activity-block block-height)

      (print { event: "withdraw", user: recipient, amount: amount, remaining-balance: (safe-sub user-balance amount) })
      (ok true)
    )
  )
)

(define-public (borrow (amount uint) (interest-rate uint) (term-days uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (var-get borrows-enabled) ERR-PROTOCOL-PAUSED)
    (asserts! (is-price-valid) ERR-STALE-PRICE)

    ;; Input validation
    (asserts! (> amount u0) ERR-ZERO-AMOUNT)
    (asserts! (>= amount MIN-BORROW-AMOUNT) ERR-MIN-BORROW-AMOUNT)
    (asserts! (<= amount MAX-BORROW-AMOUNT) ERR-MAX-BORROW-EXCEEDED)
    (asserts! (and (>= interest-rate (var-get min-interest-rate)) (<= interest-rate (var-get max-interest-rate))) ERR-INVALID-INTEREST-RATE)
    (asserts! (and (>= term-days (var-get min-term-days)) (<= term-days (var-get max-term-days))) ERR-INVALID-TERM)

    (let (
      (recipient tx-sender)
      (user-balance (default-to u0 (map-get? user-deposits tx-sender)))
      (required-collateral (calculate-required-collateral amount))
      (term-end (safe-add block-height (* term-days u144)))
      (current-price (var-get admin-stx-price))
    )
      ;; Collateral check
      (asserts! (> user-balance u0) ERR-INSUFFICIENT-COLLATERAL)
      (asserts! (>= user-balance required-collateral) ERR-INSUFFICIENT-COLLATERAL)

      ;; One loan per user
      (asserts! (is-none (map-get? user-loans recipient)) ERR-ALREADY-HAS-LOAN)

      ;; Verify contract has sufficient STX liquidity to fund the loan
      (asserts! (>= (stx-get-balance (as-contract tx-sender)) amount) ERR-INSUFFICIENT-LIQUIDITY)

      ;; Transfer borrowed STX from contract to user
      (try! (as-contract (stx-transfer? amount tx-sender recipient)))

      ;; Store loan with oracle price snapshot
      (map-set user-loans recipient {
        amount: amount,
        interest-rate: interest-rate,
        start-block: block-height,
        term-end: term-end,
        created-at-price: current-price
      })

      ;; Update metrics
      (var-set total-borrows-count (+ (var-get total-borrows-count) u1))
      (var-set total-borrow-volume (safe-add (var-get total-borrow-volume) amount))
      (var-set total-outstanding-borrows (safe-add (var-get total-outstanding-borrows) amount))
      (var-set last-activity-block block-height)

      (print { event: "borrow", user: recipient, amount: amount, rate: interest-rate, term-days: term-days, price-snapshot: current-price })
      (ok true)
    )
  )
)

(define-public (repay)
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    
    (let (
      (loan (unwrap! (map-get? user-loans tx-sender) ERR-NO-ACTIVE-LOAN))
      (loan-amount (get amount loan))
      (blocks-elapsed (safe-sub block-height (get start-block loan)))
      (interest (calculate-interest-precise loan-amount (get interest-rate loan) blocks-elapsed))
      (penalty (if (> block-height (get term-end loan))
        (/ (* loan-amount (var-get late-penalty-rate)) u10000)
        u0))
      (total-repayment (safe-add (safe-add loan-amount interest) penalty))
    )
      ;; Transfer repayment from user to contract
      (try! (stx-transfer? total-repayment tx-sender (as-contract tx-sender)))
      
      ;; Remove loan record
      (map-delete user-loans tx-sender)
      
      ;; Update metrics
      (var-set total-repaid (safe-add (var-get total-repaid) total-repayment))
      (var-set total-outstanding-borrows (safe-sub (var-get total-outstanding-borrows) loan-amount))
      (var-set total-repayments-count (+ (var-get total-repayments-count) u1))
      (var-set total-repay-volume (safe-add (var-get total-repay-volume) total-repayment))
      (var-set last-activity-block block-height)
      
      (print { event: "repay", user: tx-sender, principal: loan-amount, interest: interest, penalty: penalty, total: total-repayment })
      (ok { principal: loan-amount, interest: interest, penalty: penalty, total: total-repayment })
    )
  )
)

(define-public (liquidate (borrower principal))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (asserts! (var-get liquidations-enabled) ERR-PROTOCOL-PAUSED)
    (asserts! (is-price-valid) ERR-STALE-PRICE)
    (asserts! (not (is-eq tx-sender borrower)) ERR-LIQUIDATE-OWN-LOAN)

    (let (
      (liquidator tx-sender)
      (current-price (var-get admin-stx-price))
      (loan (unwrap! (map-get? user-loans borrower) ERR-NO-ACTIVE-LOAN))
      (borrower-deposit (default-to u0 (map-get? user-deposits borrower)))
      (loan-amount (get amount loan))
      (liquidation-bonus (/ (* loan-amount u5) u100))
      (total-to-pay (safe-add loan-amount liquidation-bonus))
    )
      ;; Verify health factor is liquidatable
      (asserts! (is-liquidatable borrower current-price) ERR-NOT-LIQUIDATABLE)

      ;; Transfer payment from liquidator to contract
      (try! (stx-transfer? total-to-pay liquidator (as-contract tx-sender)))

      ;; Transfer collateral to liquidator
      (try! (as-contract (stx-transfer? borrower-deposit tx-sender liquidator)))

      ;; Clear borrower's loan and deposit
      (map-delete user-loans borrower)
      (map-set user-deposits borrower u0)

      ;; Update metrics
      (var-set total-deposits (safe-sub (var-get total-deposits) borrower-deposit))
      (var-set total-outstanding-borrows (safe-sub (var-get total-outstanding-borrows) loan-amount))
      (var-set total-liquidations (+ (var-get total-liquidations) u1))
      (var-set total-liquidations-count (+ (var-get total-liquidations-count) u1))
      (var-set total-liquidation-volume (safe-add (var-get total-liquidation-volume) loan-amount))
      (var-set last-activity-block block-height)

      (print { event: "liquidation", liquidator: liquidator, borrower: borrower, seized: borrower-deposit, paid: total-to-pay, bonus: liquidation-bonus })
      (ok { seized-collateral: borrower-deposit, paid: total-to-pay, bonus: liquidation-bonus })
    )
  )
)

(define-public (initialize)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (is-eq (var-get protocol-start-block) u0) ERR-OWNER-ONLY)
    (var-set protocol-start-block block-height)
    (var-set last-activity-block block-height)
    (var-set price-update-block block-height)
    (print { event: "protocol-initialized", block: block-height })
    (ok true)
  )
)

;; ===== MIGRATION SUPPORT =====

;; Get protocol age in blocks
(define-read-only (get-protocol-age)
  (if (> (var-get protocol-start-block) u0)
    (- block-height (var-get protocol-start-block))
    u0)
)

;; Get blocks since last activity
(define-read-only (get-time-since-last-activity)
  (if (> (var-get last-activity-block) u0)
    (- block-height (var-get last-activity-block))
    u0)
)

;; Single-call dashboard snapshot for frontend/indexer consumption
;; Combines protocol stats, volume, utilization, and status into one response
(define-read-only (get-dashboard-snapshot)
  (let (
    (deposits (var-get total-deposits))
    (borrowed (var-get total-outstanding-borrows))
  )
    {
      total-deposits: deposits,
      total-repaid: (var-get total-repaid),
      total-liquidations: (var-get total-liquidations),
      total-outstanding-borrows: borrowed,
      utilization-bps: (if (> deposits u0) (/ (* borrowed u10000) deposits) u0),
      deposit-volume: (var-get total-deposit-volume),
      borrow-volume: (var-get total-borrow-volume),
      repay-volume: (var-get total-repay-volume),
      liquidation-volume: (var-get total-liquidation-volume),
      stx-price: (var-get admin-stx-price),
      is-paused: (var-get is-paused),
      protocol-age-blocks: (if (> (var-get protocol-start-block) u0)
        (- block-height (var-get protocol-start-block))
        u0)
    }
  )
)

;; Export a single user's full position for migration
(define-read-only (export-user-position (user principal))
  (let (
    (deposit-amount (default-to u0 (map-get? user-deposits user)))
    (loan-data (map-get? user-loans user))
  )
    {
      user: user,
      deposit: deposit-amount,
      has-loan: (is-some loan-data),
      loan: (match loan-data
        loan-info {
          amount: (get amount loan-info),
          interest-rate: (get interest-rate loan-info),
          start-block: (get start-block loan-info),
          term-end: (get term-end loan-info),
          created-at-price: (get created-at-price loan-info)
        }
        { amount: u0, interest-rate: u0, start-block: u0, term-end: u0, created-at-price: u0 }
      ),
      repayment: (get-repayment-amount user),
      exported-at-block: block-height
    }
  )
)

;; Export protocol-level state for migration verification
(define-read-only (export-protocol-state)
  {
    total-deposits: (var-get total-deposits),
    total-repaid: (var-get total-repaid),
    total-liquidations: (var-get total-liquidations),
    total-outstanding-borrows: (var-get total-outstanding-borrows),
    stx-price: (var-get admin-stx-price),
    is-paused: (var-get is-paused),
    protocol-start-block: (var-get protocol-start-block),
    last-activity-block: (var-get last-activity-block),
    exported-at-block: block-height
  }
)
