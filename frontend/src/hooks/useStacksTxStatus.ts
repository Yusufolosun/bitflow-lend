import { useEffect, useMemo, useState } from 'react';
import {
  HiroTxResponse,
  StacksPendingPhase,
  StacksTxStatusSnapshot,
  StacksTxStatusState,
} from '../types/txStatus';

const POLL_INTERVAL_MS = 30_000;
const NOT_FOUND_GRACE_MS = 60 * 60 * 1000;
const DEFAULT_BLOCK_TIME_MINUTES = 10;
const DEFAULT_API_ENDPOINT = 'https://api.testnet.hiro.so';

const DEFAULT_MESSAGE = 'Transaction in Stacks mempool — confirming with Bitcoin...';

const INITIAL_SNAPSHOT: StacksTxStatusSnapshot = {
  state: 'idle',
  txStatusRaw: null,
  message: '',
  txId: null,
  elapsedMs: 0,
  estimatedMs: DEFAULT_BLOCK_TIME_MINUTES * 60 * 1000,
  remainingMs: DEFAULT_BLOCK_TIME_MINUTES * 60 * 1000,
  progressPercent: 0,
  microblockAnchorTime: null,
  hasTerminalError: false,
  isPolling: false,
};

const getMappedState = (txStatusRaw: string | null): StacksTxStatusState => {
  switch (txStatusRaw) {
    case 'success':
      return 'success';
    case 'abort_by_response':
    case 'abort_by_post_condition':
      return 'abort_by_response';
    default:
      return 'pending';
  }
};

const getPendingPhase = (txStatusRaw: string | null): StacksPendingPhase => {
  if (txStatusRaw === 'not_found') {
    return 'propagation';
  }

  return 'mempool';
};

const mapLifecycle = (txStatusRaw: string | null): {
  state: StacksTxStatusState;
  pendingPhase: StacksPendingPhase;
} => ({
  state: getMappedState(txStatusRaw),
  pendingPhase: getPendingPhase(txStatusRaw),
});

const getMappedMessage = (state: StacksTxStatusState): string => {
  switch (state) {
    case 'success':
      return 'Confirmed';
    case 'abort_by_response':
      return 'Transaction rejected — check post-conditions';
    case 'not_found':
      return 'Transaction not found after 60 minutes. Confirm the tx ID in the explorer.';
    case 'pending':
      return DEFAULT_MESSAGE;
    default:
      return '';
  }
};

const buildProgress = (elapsedMs: number, estimatedMs: number) => {
  const boundedElapsed = Math.max(0, elapsedMs);
  const remainingMs = Math.max(estimatedMs - boundedElapsed, 0);
  const progressPercent = Math.min((boundedElapsed / estimatedMs) * 100, 100);

  return {
    elapsedMs: boundedElapsed,
    remainingMs,
    progressPercent,
  };
};

export const useStacksTxStatus = (txId: string): StacksTxStatusSnapshot => {
  const [snapshot, setSnapshot] = useState<StacksTxStatusSnapshot>(INITIAL_SNAPSHOT);

  const normalizedTxId = useMemo(() => txId.trim(), [txId]);

  useEffect(() => {
    if (!normalizedTxId) {
      setSnapshot(INITIAL_SNAPSHOT);
      return;
    }

    let cancelled = false;
    const apiEndpoint = import.meta.env.VITE_STACKS_API_URL || DEFAULT_API_ENDPOINT;
    const startedAt = Date.now();
    const estimatedMs = DEFAULT_BLOCK_TIME_MINUTES * 60 * 1000;
    let intervalId: number | null = null;

    const updateSnapshot = (
      state: StacksTxStatusState,
      txStatusRaw: string | null,
      microblockAnchorTime?: number | null
    ) => {
      const elapsedMs = Date.now() - startedAt;
      const progress = buildProgress(elapsedMs, estimatedMs);

      if (cancelled) {
        return;
      }

      const lifecycle = mapLifecycle(txStatusRaw);

      const nextSnapshot: StacksTxStatusSnapshot = {
        state,
        txStatusRaw,
        txId: normalizedTxId,
        message: getMappedMessage(state),
        elapsedMs: progress.elapsedMs,
        estimatedMs,
        remainingMs: progress.remainingMs,
        progressPercent: progress.progressPercent,
        microblockAnchorTime: microblockAnchorTime ?? null,
        hasTerminalError: state === 'abort_by_response' || state === 'not_found',
        isPolling: state === 'pending',
        pendingPhase: lifecycle.pendingPhase,
      };

      setSnapshot(nextSnapshot);

      if (intervalId !== null && state !== 'pending') {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    updateSnapshot('pending', 'pending');

    const poll = async () => {
      try {
        const response = await fetch(`${apiEndpoint}/extended/v1/tx/${normalizedTxId}`);

        if (response.status === 404) {
          const elapsedMs = Date.now() - startedAt;
          if (elapsedMs >= NOT_FOUND_GRACE_MS) {
            updateSnapshot('not_found', 'not_found');
            return;
          }

          updateSnapshot('pending', 'not_found');
          return;
        }

        if (!response.ok) {
          updateSnapshot('pending', 'pending');
          return;
        }

        const data = (await response.json()) as HiroTxResponse;
        const nextState = getMappedState(data.tx_status);

        updateSnapshot(nextState, data.tx_status, data.microblock_anchor_time);
      } catch {
        updateSnapshot('pending', 'pending');
      }
    };

    void poll();
    intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [normalizedTxId]);

  return snapshot;
};

export default useStacksTxStatus;
