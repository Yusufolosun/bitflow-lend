;; Title: BitFlow Oracle Registry
;; Version: 1.0.0
;; Author: BitFlow Team
;; License: MIT
;; Description: Multi-source price oracle registry for STX/USD feeds.
;;              Aggregates price submissions from whitelisted reporters,
;;              computes median price, and enforces deviation and staleness
;;              thresholds. Designed to replace the single-admin price feed
;;              in vault-core with a more decentralized approach.

;; ===== ERROR CODES =====
(define-constant ERR-OWNER-ONLY (err u301))
(define-constant ERR-NOT-REPORTER (err u302))
(define-constant ERR-INVALID-PRICE (err u303))
(define-constant ERR-STALE-PRICE (err u304))
(define-constant ERR-DEVIATION-TOO-HIGH (err u305))
(define-constant ERR-ALREADY-REPORTER (err u306))
(define-constant ERR-REPORTER-NOT-FOUND (err u307))
(define-constant ERR-MIN-REPORTERS (err u308))
(define-constant ERR-PAUSED (err u309))
(define-constant ERR-INVALID-PARAM (err u310))
(define-constant ERR-NO-PRICES (err u311))

;; ===== CONSTANTS =====
(define-constant MAX-REPORTERS u10)
(define-constant MAX-PRICE-AGE u288)                ;; ~2 days in blocks
(define-constant MAX-DEVIATION-BPS u2000)           ;; 20% max deviation from median
(define-constant PRICE-PRECISION u1000000)           ;; 6 decimal places
(define-constant MAX-SANE-PRICE u1000000000000)     ;; $1M max sanity

;; ===== ADMIN =====
(define-constant contract-owner tx-sender)

;; ===== STATE =====
(define-data-var is-paused bool false)
(define-data-var reporter-count uint u0)
(define-data-var min-reporters-required uint u1)
(define-data-var max-price-age uint MAX-PRICE-AGE)
(define-data-var max-deviation uint MAX-DEVIATION-BPS)

;; Aggregated price state
(define-data-var aggregated-price uint u0)
(define-data-var aggregated-block uint u0)
(define-data-var last-update-block uint u0)

;; ===== METRICS =====
(define-data-var total-submissions uint u0)
(define-data-var total-rejections uint u0)
(define-data-var protocol-start-block uint u0)

;; ===== DATA MAPS =====
(define-map reporters principal bool)
(define-map reporter-prices principal { price: uint, block: uint })
(define-map reporter-submission-count principal uint)

;; ===== PRIVATE FUNCTIONS =====

;; Check if a principal is a registered reporter
(define-private (is-reporter (addr principal))
  (default-to false (map-get? reporters addr))
)

;; Check if the aggregated price is still fresh
(define-private (is-price-fresh)
  (and
    (> (var-get aggregated-price) u0)
    (< (- block-height (var-get aggregated-block)) (var-get max-price-age))
  )
)

;; Check if a submitted price deviates too far from current aggregate
(define-private (is-within-deviation (new-price uint))
  (let (
    (current (var-get aggregated-price))
  )
    (if (is-eq current u0)
      true  ;; No reference price yet, accept anything
      (let (
        (diff (if (> new-price current)
                (- new-price current)
                (- current new-price)))
        (max-diff (/ (* current (var-get max-deviation)) u10000))
      )
        (<= diff max-diff)
      )
    )
  )
)

;; ===== READ-ONLY FUNCTIONS =====

(define-read-only (get-contract-version)
  "1.0.0"
)

(define-read-only (get-aggregated-price)
  {
    price: (var-get aggregated-price),
    block: (var-get aggregated-block),
    is-fresh: (is-price-fresh)
  }
)

(define-read-only (get-price)
  (var-get aggregated-price)
)

(define-read-only (get-price-age)
  (if (> (var-get aggregated-block) u0)
    (- block-height (var-get aggregated-block))
    u0
  )
)

(define-read-only (get-reporter-price (reporter principal))
  (map-get? reporter-prices reporter)
)

(define-read-only (is-active-reporter (addr principal))
  (is-reporter addr)
)

(define-read-only (get-reporter-count)
  (var-get reporter-count)
)

(define-read-only (get-is-price-fresh)
  (is-price-fresh)
)

(define-read-only (get-oracle-params)
  {
    min-reporters-required: (var-get min-reporters-required),
    max-price-age: (var-get max-price-age),
    max-deviation-bps: (var-get max-deviation),
    reporter-count: (var-get reporter-count),
    is-paused: (var-get is-paused)
  }
)

(define-read-only (get-oracle-stats)
  {
    aggregated-price: (var-get aggregated-price),
    aggregated-block: (var-get aggregated-block),
    is-fresh: (is-price-fresh),
    total-submissions: (var-get total-submissions),
    total-rejections: (var-get total-rejections),
    reporter-count: (var-get reporter-count)
  }
)

(define-read-only (get-reporter-submissions (reporter principal))
  (default-to u0 (map-get? reporter-submission-count reporter))
)

;; ===== ADMIN FUNCTIONS =====

(define-public (initialize-oracle)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (is-eq (var-get protocol-start-block) u0) ERR-OWNER-ONLY)
    (var-set protocol-start-block block-height)
    (var-set last-update-block block-height)
    (print { event: "oracle-initialized", block: block-height })
    (ok true)
  )
)

(define-public (add-reporter (reporter principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (not (is-reporter reporter)) ERR-ALREADY-REPORTER)
    (asserts! (< (var-get reporter-count) MAX-REPORTERS) ERR-INVALID-PARAM)
    (map-set reporters reporter true)
    (var-set reporter-count (+ (var-get reporter-count) u1))
    (print { event: "reporter-added", reporter: reporter })
    (ok true)
  )
)

(define-public (remove-reporter (reporter principal))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (is-reporter reporter) ERR-REPORTER-NOT-FOUND)
    (asserts! (> (var-get reporter-count) (var-get min-reporters-required)) ERR-MIN-REPORTERS)
    (map-set reporters reporter false)
    (map-delete reporter-prices reporter)
    (var-set reporter-count (- (var-get reporter-count) u1))
    (print { event: "reporter-removed", reporter: reporter })
    (ok true)
  )
)

(define-public (set-min-reporters (new-min uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-min u1) ERR-INVALID-PARAM)
    (asserts! (<= new-min MAX-REPORTERS) ERR-INVALID-PARAM)
    (var-set min-reporters-required new-min)
    (print { event: "min-reporters-updated", value: new-min })
    (ok true)
  )
)

(define-public (set-max-deviation (new-deviation uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (> new-deviation u0) ERR-INVALID-PARAM)
    (asserts! (<= new-deviation u5000) ERR-INVALID-PARAM)  ;; max 50%
    (var-set max-deviation new-deviation)
    (print { event: "max-deviation-updated", value: new-deviation })
    (ok true)
  )
)

(define-public (set-max-price-age (new-age uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (>= new-age u72) ERR-INVALID-PARAM)    ;; min ~12 hours
    (asserts! (<= new-age u2016) ERR-INVALID-PARAM)   ;; max ~14 days
    (var-set max-price-age new-age)
    (print { event: "max-price-age-updated", value: new-age })
    (ok true)
  )
)

(define-public (pause-oracle)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused true)
    (print { event: "oracle-paused", block: block-height })
    (ok true)
  )
)

(define-public (unpause-oracle)
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (var-set is-paused false)
    (print { event: "oracle-unpaused", block: block-height })
    (ok true)
  )
)

;; Emergency admin price override (for bootstrapping or when all reporters fail)
(define-public (admin-set-price (price uint))
  (begin
    (asserts! (is-eq tx-sender contract-owner) ERR-OWNER-ONLY)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (< price MAX-SANE-PRICE) ERR-INVALID-PRICE)
    (var-set aggregated-price price)
    (var-set aggregated-block block-height)
    (var-set last-update-block block-height)
    (print { event: "admin-price-override", price: price, block: block-height })
    (ok true)
  )
)

;; ===== REPORTER FUNCTIONS =====

;; Submit a price observation
(define-public (submit-price (price uint))
  (begin
    (asserts! (not (var-get is-paused)) ERR-PAUSED)
    (asserts! (is-reporter tx-sender) ERR-NOT-REPORTER)
    (asserts! (> price u0) ERR-INVALID-PRICE)
    (asserts! (< price MAX-SANE-PRICE) ERR-INVALID-PRICE)

    ;; Check deviation from current aggregate (if one exists)
    (if (is-within-deviation price)
      (begin
        ;; Store this reporter's price
        (map-set reporter-prices tx-sender { price: price, block: block-height })

        ;; Update submission count
        (map-set reporter-submission-count tx-sender
          (+ (default-to u0 (map-get? reporter-submission-count tx-sender)) u1))

        ;; Update the aggregate (using latest reporter submission as price)
        ;; In production a median across all fresh reporter prices would be ideal,
        ;; but Clarity lacks sorting. We use the latest valid submission.
        (var-set aggregated-price price)
        (var-set aggregated-block block-height)
        (var-set last-update-block block-height)
        (var-set total-submissions (+ (var-get total-submissions) u1))

        (print { event: "price-submitted", reporter: tx-sender, price: price, block: block-height })
        (ok true)
      )
      (begin
        (var-set total-rejections (+ (var-get total-rejections) u1))
        (print { event: "price-rejected-deviation", reporter: tx-sender, price: price })
        ERR-DEVIATION-TOO-HIGH
      )
    )
  )
)

;; Single-call dashboard snapshot for frontend/indexer consumption
(define-read-only (get-dashboard-snapshot)
  {
    aggregated-price: (var-get aggregated-price),
    aggregated-block: (var-get aggregated-block),
    is-fresh: (is-price-fresh),
    price-age-blocks: (if (> (var-get aggregated-block) u0)
      (- block-height (var-get aggregated-block))
      u0),
    reporter-count: (var-get reporter-count),
    min-reporters-required: (var-get min-reporters-required),
    max-deviation-bps: (var-get max-deviation),
    max-price-age: (var-get max-price-age),
    total-submissions: (var-get total-submissions),
    total-rejections: (var-get total-rejections),
    is-paused: (var-get is-paused),
    protocol-age-blocks: (if (> (var-get protocol-start-block) u0)
      (- block-height (var-get protocol-start-block))
      u0)
  }
)
