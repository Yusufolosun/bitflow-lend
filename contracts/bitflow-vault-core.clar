;; Title: BitFlow Lend - Vault Core
;; Version: 1.0.0
;; Author: BitFlow Team
;; License: MIT
;; Description: Bitcoin-native fixed-rate lending protocol with
;;              fixed interest rates and liquidation protection.
;;              Users can deposit STX as collateral, borrow against it,
;;              and earn yield. Implements 150% collateralization ratio
;;              with automated liquidations at 110% health threshold.

;; Error codes
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
(define-constant ERR-INVALID-PARAM (err u120))

;; Tunable protocol parameters (admin-updatable)
(define-data-var min-collateral-ratio uint u150)
(define-data-var liquidation-threshold uint u110)
(define-data-var max-interest-rate uint u10000) ;; 100% APR in basis points
(define-data-var min-interest-rate uint u50)    ;; 0.5% APR minimum in basis points
(define-data-var min-term-days uint u1)
(define-data-var max-term-days uint u365)       ;; Maximum 1 year loan term
(define-data-var late-penalty-rate uint u500)   ;; 5% flat penalty on overdue loans

;; Data maps
(define-map user-deposits principal uint)
(define-map user-loans principal { amount: uint, interest-rate: uint, start-block: uint, term-end: uint })
(define-data-var total-deposits uint u0)
(define-data-var total-repaid uint u0)
(define-data-var total-liquidations uint u0)
(define-data-var total-outstanding-borrows uint u0)
(define-data-var admin-stx-price uint u0)
(define-data-var is-paused bool false)

;; Protocol-wide metrics
(define-data-var total-deposits-count uint u0)
(define-data-var total-withdrawals-count uint u0)
(define-data-var total-borrows-count uint u0)
(define-data-var total-repayments-count uint u0)
(define-data-var total-liquidations-count uint u0)

;; Volume metrics (in micro-STX)
(define-data-var total-deposit-volume uint u0)
(define-data-var total-borrow-volume uint u0)
(define-data-var total-repay-volume uint u0)
(define-data-var total-liquidation-volume uint u0)

;; Time-based metrics
(define-data-var last-activity-block uint u0)
(define-data-var protocol-start-block uint u0)

;; Contract owner for initialization
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u109))

;; Private functions

;; Calculate interest based on principal, rate, and blocks elapsed
;; Uses ceiling division to prevent rounding to zero on small amounts
(define-private (calculate-interest (principal uint) (rate uint) (blocks-elapsed uint))
  (let (
    (numerator (* (* principal rate) blocks-elapsed))
    (denominator (* u100 u52560))
  )
    (if (is-eq numerator u0)
      u0
      (/ (- (+ numerator denominator) u1) denominator)
    )
  )
)

;; Read-only functions

;; Get contract version
(define-read-only (get-contract-version)
  "1.0.0"
)

;; Get user's deposit balance
(define-read-only (get-user-deposit (user principal))
  (default-to u0 (map-get? user-deposits user))
)

;; Get total deposits in the vault
(define-read-only (get-total-deposits)
  (var-get total-deposits)
)

;; Get user's loan details
(define-read-only (get-user-loan (user principal))
  (map-get? user-loans user)
)

;; Calculate required collateral for a borrow amount
(define-read-only (calculate-required-collateral (borrow-amount uint))
  (/ (* borrow-amount (var-get min-collateral-ratio)) u100)
)

;; Get total amount repaid across all loans
(define-read-only (get-total-repaid)
  (var-get total-repaid)
)

;; Get total liquidations
(define-read-only (get-total-liquidations)
  (var-get total-liquidations)
)

;; Get protocol statistics
(define-read-only (get-protocol-stats)
  {
    total-deposits: (var-get total-deposits),
    total-repaid: (var-get total-repaid),
    total-liquidations: (var-get total-liquidations),
    total-outstanding-borrows: (var-get total-outstanding-borrows)
  }
)

;; Get current utilization ratio in basis points (0-10000)
;; Utilization = outstanding borrows / total deposits * 10000
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

;; Get maximum borrow amount for a user based on their deposit
(define-read-only (get-max-borrow-amount (user principal))
  (let (
    (user-deposit (default-to u0 (map-get? user-deposits user)))
    (max-borrow (/ (* user-deposit u100) (var-get min-collateral-ratio)))
  )
    max-borrow
  )
)

;; Calculate health factor for a user's loan
(define-read-only (calculate-health-factor (user principal) (stx-price uint))
  (match (map-get? user-loans user)
    loan
      (let (
        (user-deposit (default-to u0 (map-get? user-deposits user)))
        (loan-amount (get amount loan))
        (collateral-value (/ (* user-deposit stx-price) u100))
        (health-factor (/ (* collateral-value u100) loan-amount))
      )
        (some health-factor)
      )
    none
  )
)

;; Check if a user's loan is liquidatable
;; Returns true if health factor < 110% OR loan term has expired
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

;; Get repayment amount for a user's loan
(define-read-only (get-repayment-amount (user principal))
  (match (map-get? user-loans user)
    loan
      (let (
        (blocks-elapsed (- block-height (get start-block loan)))
        (interest (calculate-interest (get amount loan) (get interest-rate loan) blocks-elapsed))
        (penalty (if (> block-height (get term-end loan))
          (/ (* (get amount loan) (var-get late-penalty-rate)) u10000)
          u0))
        (total (+ (get amount loan) interest penalty))
      )
        (some { principal: (get amount loan), interest: interest, penalty: penalty, total: total })
      )
    none
  )
)

;; Get the admin-set STX price
(define-read-only (get-stx-price)
  (var-get admin-stx-price)
)

;; Check if protocol is paused
(define-read-only (get-is-paused)
  (var-get is-paused)
)

;; Public functions

;; Pause the protocol (contract owner only)
(define-public (pause)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set is-paused true)
    (print { event: "pause" })
    (ok true)
  )
)

;; Unpause the protocol (contract owner only)
(define-public (unpause)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (var-set is-paused false)
    (print { event: "unpause" })
    (ok true)
  )
)

;; Set STX price (contract owner only)
(define-public (set-stx-price (price uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> price u0) ERR-INVALID-AMOUNT)
    (var-set admin-stx-price price)
    (print { event: "set-stx-price", price: price })
    (ok true)
  )
)

;; Update protocol parameters (contract owner only)
;; Each setter enforces safety bounds to prevent destructive values

(define-public (set-min-collateral-ratio (new-ratio uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (>= new-ratio u100) ERR-INVALID-PARAM)
    (asserts! (<= new-ratio u500) ERR-INVALID-PARAM)
    (var-set min-collateral-ratio new-ratio)
    (print { event: "set-min-collateral-ratio", value: new-ratio })
    (ok true)))

(define-public (set-liquidation-threshold (new-threshold uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (>= new-threshold u100) ERR-INVALID-PARAM)
    (asserts! (< new-threshold (var-get min-collateral-ratio)) ERR-INVALID-PARAM)
    (var-set liquidation-threshold new-threshold)
    (print { event: "set-liquidation-threshold", value: new-threshold })
    (ok true)))

(define-public (set-interest-rate-bounds (new-min uint) (new-max uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (> new-min u0) ERR-INVALID-PARAM)
    (asserts! (> new-max new-min) ERR-INVALID-PARAM)
    (asserts! (<= new-max u50000) ERR-INVALID-PARAM) ;; cap at 500% APR
    (var-set min-interest-rate new-min)
    (var-set max-interest-rate new-max)
    (print { event: "set-interest-rate-bounds", min: new-min, max: new-max })
    (ok true)))

(define-public (set-term-limits (new-min uint) (new-max uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (>= new-min u1) ERR-INVALID-PARAM)
    (asserts! (> new-max new-min) ERR-INVALID-PARAM)
    (asserts! (<= new-max u730) ERR-INVALID-PARAM) ;; cap at 2 years
    (var-set min-term-days new-min)
    (var-set max-term-days new-max)
    (print { event: "set-term-limits", min: new-min, max: new-max })
    (ok true)))

(define-public (set-late-penalty-rate (new-rate uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (<= new-rate u2000) ERR-INVALID-PARAM) ;; cap at 20%
    (var-set late-penalty-rate new-rate)
    (print { event: "set-late-penalty-rate", value: new-rate })
    (ok true)))

;; Read-only: current protocol parameters
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

;; Deposit STX into the vault
;; @param amount: Amount of STX (in micro-STX) to deposit
;; @returns (ok true) on success
;; Transfers STX from caller to contract and updates user's deposit balance
(define-public (deposit (amount uint))
  (begin
    ;; Check protocol is not paused
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    
    ;; Validate amount is greater than zero
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    
    ;; Transfer STX from user to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Update user's deposit balance
    (map-set user-deposits tx-sender 
      (+ (default-to u0 (map-get? user-deposits tx-sender)) amount))
    
    ;; Update total deposits
    (var-set total-deposits (+ (var-get total-deposits) amount))
    
    ;; Update analytics
    (var-set total-deposits-count (+ (var-get total-deposits-count) u1))
    (var-set total-deposit-volume (+ (var-get total-deposit-volume) amount))
    (var-set last-activity-block block-height)
    
    ;; Emit event
    (print { event: "deposit", user: tx-sender, amount: amount })
    
    (ok true)
  )
)

;; Withdraw STX from the vault
;; @param amount: Amount of STX (in micro-STX) to withdraw
;; @returns (ok true) on success
;; Note: Can only withdraw excess balance not locked as loan collateral
(define-public (withdraw (amount uint))
  (let (
    (user-balance (default-to u0 (map-get? user-deposits tx-sender)))
    (locked-collateral (match (map-get? user-loans tx-sender)
      loan (calculate-required-collateral (get amount loan))
      u0))
    (available-balance (- user-balance locked-collateral))
    (recipient tx-sender)
  )
    ;; Check protocol is not paused
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    
    ;; Verify user has sufficient unlocked balance
    (asserts! (>= available-balance amount) ERR-INSUFFICIENT-BALANCE)
    
    ;; Transfer STX from contract to user
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    
    ;; Update user's deposit balance
    (map-set user-deposits recipient (- user-balance amount))
    
    ;; Update total deposits
    (var-set total-deposits (- (var-get total-deposits) amount))
    
    ;; Update analytics
    (var-set total-withdrawals-count (+ (var-get total-withdrawals-count) u1))
    (var-set last-activity-block block-height)
    
    ;; Emit event
    (print { event: "withdraw", user: tx-sender, amount: amount })
    
    (ok true)
  )
)

;; Borrow against deposited collateral
;; @param amount: Amount of STX to borrow
;; @param interest-rate: Annual interest rate in basis points (e.g., 10 = 0.1%)
;; @param term-days: Loan term in days
;; @returns (ok true) on success
;; Requires 150% collateralization ratio (user must have 1.5x borrow amount deposited)
(define-public (borrow (amount uint) (interest-rate uint) (term-days uint))
  (let (
    (user-balance (default-to u0 (map-get? user-deposits tx-sender)))
    (required-collateral (calculate-required-collateral amount))
    (term-end (+ block-height (* term-days u144))) ;; ~144 blocks per day
    (recipient tx-sender)
  )
    ;; Check protocol is not paused
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    
    ;; Validate borrow amount is greater than zero
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)

    ;; Validate interest rate (must be between 0.5% and 100% APR)
    (asserts! (and (>= interest-rate (var-get min-interest-rate)) (<= interest-rate (var-get max-interest-rate))) ERR-INVALID-INTEREST-RATE)
    
    ;; Validate loan term (1 day to 1 year)
    (asserts! (and (>= term-days (var-get min-term-days)) (<= term-days (var-get max-term-days))) ERR-INVALID-TERM)
    
    ;; Verify user doesn't already have an active loan (one loan per user)
    (asserts! (is-none (map-get? user-loans tx-sender)) ERR-ALREADY-HAS-LOAN)
    
    ;; Verify user has enough deposited collateral (150% ratio)
    (asserts! (>= user-balance required-collateral) ERR-INSUFFICIENT-COLLATERAL)
    
    ;; Transfer borrowed STX from contract to user
    (try! (as-contract (stx-transfer? amount tx-sender recipient)))
    
    ;; Store loan details
    (map-set user-loans tx-sender {
      amount: amount,
      interest-rate: interest-rate,
      start-block: block-height,
      term-end: term-end
    })
    
    ;; Update analytics
    (var-set total-borrows-count (+ (var-get total-borrows-count) u1))
    (var-set total-borrow-volume (+ (var-get total-borrow-volume) amount))
    (var-set total-outstanding-borrows (+ (var-get total-outstanding-borrows) amount))
    (var-set last-activity-block block-height)
    
    ;; Emit event
    (print { event: "borrow", user: tx-sender, amount: amount, rate: interest-rate, term: term-days })
    
    (ok true)
  )
)

;; Repay an active loan
;; @returns (ok { principal, interest, total }) with repayment details
;; Calculates accrued interest based on blocks elapsed and repays full amount
(define-public (repay)
  (begin
    ;; Check protocol is not paused
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (let (
      (loan (unwrap! (map-get? user-loans tx-sender) ERR-NO-ACTIVE-LOAN))
      (loan-amount (get amount loan))
      (blocks-elapsed (- block-height (get start-block loan)))
      (interest (calculate-interest loan-amount (get interest-rate loan) blocks-elapsed))
      (penalty (if (> block-height (get term-end loan))
        (/ (* loan-amount (var-get late-penalty-rate)) u10000)
        u0))
      (total-repayment (+ loan-amount interest penalty))
    )
    
      ;; Transfer total repayment (principal + interest + penalty) from user to contract
      (try! (stx-transfer? total-repayment tx-sender (as-contract tx-sender)))
    
    ;; Remove the loan from user's record
    (map-delete user-loans tx-sender)
    
    ;; Update total repaid
    (var-set total-repaid (+ (var-get total-repaid) total-repayment))
    (var-set total-outstanding-borrows (if (>= (var-get total-outstanding-borrows) loan-amount)
      (- (var-get total-outstanding-borrows) loan-amount)
      u0))
    
    ;; Update analytics
    (var-set total-repayments-count (+ (var-get total-repayments-count) u1))
    (var-set total-repay-volume (+ (var-get total-repay-volume) total-repayment))
    (var-set last-activity-block block-height)
    
    ;; Emit event
    (print { event: "repay", user: tx-sender, principal: loan-amount, interest: interest, total: total-repayment })
    
    ;; Return repayment details
    (ok { principal: loan-amount, interest: interest, total: total-repayment })
    )
  )
)

;; Liquidate an undercollateralized loan
;; @param borrower: Address of the borrower to liquidate
;; @returns (ok { loan-amount, bonus, total-paid }) on success
;; Liquidator pays loan + 5% bonus and receives borrower's collateral
;; Only works if health factor < 110% using admin-set STX price
(define-public (liquidate (borrower principal))
  (begin
    ;; Check protocol is not paused
    (asserts! (not (var-get is-paused)) ERR-PROTOCOL-PAUSED)
    (let (
      (liquidator tx-sender)
      (current-price (var-get admin-stx-price))
      (loan (unwrap! (map-get? user-loans borrower) ERR-NO-ACTIVE-LOAN))
      (borrower-deposit (default-to u0 (map-get? user-deposits borrower)))
      (loan-amount (get amount loan))
      (liquidation-bonus (/ (* loan-amount u5) u100)) ;; 5% bonus for liquidator
      (total-to-pay (+ loan-amount liquidation-bonus))
    )
    
      ;; Ensure admin has set a price
      (asserts! (> current-price u0) ERR-PRICE-NOT-SET)
    
      ;; Prevent self-liquidation
      (asserts! (not (is-eq tx-sender borrower)) ERR-LIQUIDATE-OWN-LOAN)
    
      ;; Verify health factor is below 110% threshold using stored price
      (asserts! (is-liquidatable borrower current-price) ERR-NOT-LIQUIDATABLE)
    
    ;; Transfer payment from liquidator to contract
    (try! (stx-transfer? total-to-pay tx-sender (as-contract tx-sender)))
    
    ;; Transfer borrower's collateral to liquidator
    (try! (as-contract (stx-transfer? borrower-deposit tx-sender liquidator)))
    
    ;; Delete borrower's loan
    (map-delete user-loans borrower)
    
    ;; Set borrower's deposit to 0
    (map-set user-deposits borrower u0)
    
    ;; Update total deposits
    (var-set total-deposits (- (var-get total-deposits) borrower-deposit))
    
    ;; Increment liquidation counter
    (var-set total-liquidations (+ (var-get total-liquidations) u1))
    (var-set total-outstanding-borrows (if (>= (var-get total-outstanding-borrows) loan-amount)
      (- (var-get total-outstanding-borrows) loan-amount)
      u0))
    
    ;; Update analytics
    (var-set total-liquidations-count (+ (var-get total-liquidations-count) u1))
    (var-set total-liquidation-volume (+ (var-get total-liquidation-volume) borrower-deposit))
    (var-set last-activity-block block-height)
    
    ;; Emit event
    (print { event: "liquidation", liquidator: tx-sender, borrower: borrower, seized: borrower-deposit, paid: total-to-pay })
    
    ;; Return liquidation details
    (ok { seized-collateral: borrower-deposit, paid: total-to-pay, bonus: liquidation-bonus })
    )
  )
)

;; Analytics read-only functions

;; Get protocol transaction metrics
(define-read-only (get-protocol-metrics)
  {
    total-deposits: (var-get total-deposits-count),
    total-withdrawals: (var-get total-withdrawals-count),
    total-borrows: (var-get total-borrows-count),
    total-repayments: (var-get total-repayments-count),
    total-liquidations: (var-get total-liquidations-count)
  }
)

;; Get protocol volume metrics
(define-read-only (get-volume-metrics)
  {
    deposit-volume: (var-get total-deposit-volume),
    borrow-volume: (var-get total-borrow-volume),
    repay-volume: (var-get total-repay-volume),
    liquidation-volume: (var-get total-liquidation-volume)
  }
)

;; Get protocol age in blocks
(define-read-only (get-protocol-age)
  (- block-height (var-get protocol-start-block))
)

;; Get blocks since last activity
(define-read-only (get-time-since-last-activity)
  (- block-height (var-get last-activity-block))
)

;; Get comprehensive user position summary
;; @param user: Principal address of the user
;; @param stx-price: Current STX price for health factor calculation
;; @returns Summary of user's deposits, loan, health factor, and borrowing capacity
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
        (some u200) ;; No loan = 200% health (max safe)
      ),
      is-liquidatable: (match loan-data
        loan-info (is-liquidatable user stx-price)
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

;; ===== MIGRATION SUPPORT =====
;; Read-only export functions for migrating user state to a new contract version.
;; A migration script can call these per-user to snapshot positions, then replay
;; them into the replacement contract via import functions.

;; Export a single user's full position for migration
;; Returns deposit, loan details, and repayment breakdown in one call
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
          term-end: (get term-end loan-info)
        }
        { amount: u0, interest-rate: u0, start-block: u0, term-end: u0 }
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
    stx-price: (var-get admin-stx-price),
    is-paused: (var-get is-paused),
    protocol-start-block: (var-get protocol-start-block),
    last-activity-block: (var-get last-activity-block),
    exported-at-block: block-height
  }
)

;; Initialization function (can only be called once by contract owner)
(define-public (initialize)
  (begin
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    (asserts! (is-eq (var-get protocol-start-block) u0) err-owner-only)
    (var-set protocol-start-block block-height)
    (var-set last-activity-block block-height)
    (ok true)
  )
)
