import { useEffect, useMemo, useState } from 'react';
import { getApiEndpoint, PROTOCOL_CONSTANTS } from '../config/contracts';
import { HiroTxResponse, StacksTxStatusSnapshot, StacksTxStatusState } from '../types/txStatus';

const POLL_INTERVAL_MS = 30_000;
const NOT_FOUND_GRACE_MS = 60 * 60 * 1000;

const DEFAULT_MESSAGE = 'Transaction in Stacks mempool — confirming with Bitcoin...';

const INITIAL_SNAPSHOT: StacksTxStatusSnapshot = {
  state: 'idle',
  txStatusRaw: null,
  message: '',
  txId: null,
  elapsedMs: 0,
  estimatedMs: PROTOCOL_CONSTANTS.BLOCK_TIME_MINUTES * 60 * 1000,
  remainingMs: PROTOCOL_CONSTANTS.BLOCK_TIME_MINUTES * 60 * 1000,
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
    const apiEndpoint = getApiEndpoint();
    const startedAt = Date.now();
    const estimatedMs = PROTOCOL_CONSTANTS.BLOCK_TIME_MINUTES * 60 * 1000;

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

      setSnapshot({
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
      });
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

    const run = async () => {
      await poll();

      const intervalId = window.setInterval(async () => {
        await poll();
      }, POLL_INTERVAL_MS);

      const stopIfTerminal = window.setInterval(() => {
        setSnapshot((current) => {
          if (current.state === 'success' || current.state === 'abort_by_response' || current.state === 'not_found') {
            window.clearInterval(intervalId);
            window.clearInterval(stopIfTerminal);
            return { ...current, isPolling: false };
          }
          return current;
        });
      }, 250);

      return () => {
        window.clearInterval(intervalId);
        window.clearInterval(stopIfTerminal);
      };
    };

    let cleanup: (() => void) | undefined;
    run().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [normalizedTxId]);

  return snapshot;
};

export default useStacksTxStatus;
