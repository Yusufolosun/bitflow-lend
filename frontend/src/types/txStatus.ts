export type StacksTxStatusState = 'idle' | 'pending' | 'success' | 'abort_by_response' | 'not_found';

export type StacksPendingPhase = 'mempool' | 'propagation';

export interface StacksTxStatusSnapshot {
  state: StacksTxStatusState;
  txStatusRaw: string | null;
  message: string;
  txId: string | null;
  elapsedMs: number;
  estimatedMs: number;
  remainingMs: number;
  progressPercent: number;
  microblockAnchorTime?: number | null;
  hasTerminalError: boolean;
  isPolling: boolean;
  pendingPhase?: StacksPendingPhase;
  notFoundGraceRemainingMs?: number | null;
  averageBlockTimeMinutes?: number;
}

export interface HiroTxResponse {
  tx_id: string;
  tx_status: string;
  microblock_anchor_time?: number | null;
}

