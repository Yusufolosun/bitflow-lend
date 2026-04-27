import React from 'react';
import { AlertCircle, CheckCircle, ExternalLink, XCircle } from 'lucide-react';
import { getExplorerUrl } from '../config/contracts';
import { StacksTxStatusSnapshot } from '../types/txStatus';
import { formatDurationMinutes, formatUnixSeconds } from '../utils/txStatus';

interface StacksTxStatusPanelProps {
  snapshot: StacksTxStatusSnapshot;
}

const txStatusPalette = {
  pending: {
    panel: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    icon: <AlertCircle className="text-amber-600" size={20} />,
  },
  success: {
    panel: 'bg-emerald-50 border-emerald-100',
    text: 'text-emerald-800',
    icon: <CheckCircle className="text-emerald-600" size={20} />,
  },
  error: {
    panel: 'bg-red-50 border-red-100',
    text: 'text-red-800',
    icon: <XCircle className="text-red-600" size={20} />,
  },
};

export const StacksTxStatusPanel: React.FC<StacksTxStatusPanelProps> = ({ snapshot }) => {
  if (!snapshot.txId || snapshot.state === 'idle') {
    return null;
  }

  const variant = snapshot.hasTerminalError
    ? txStatusPalette.error
    : snapshot.state === 'success'
      ? txStatusPalette.success
      : txStatusPalette.pending;

  const anchorLabel = formatUnixSeconds(snapshot.microblockAnchorTime);
  const averageBlockTimeMinutes = snapshot.averageBlockTimeMinutes ?? 12.5;
  const notFoundGraceRemaining = snapshot.notFoundGraceRemainingMs
    ? formatDurationMinutes(snapshot.notFoundGraceRemainingMs)
    : null;

  return (
    <div className={`p-3 rounded-xl border space-y-3 ${variant.panel}`} role="status" aria-live="polite">
      <div className="flex items-center gap-2">
        {variant.icon}
        <span className={`text-sm font-medium ${variant.text}`}>{snapshot.message}</span>
      </div>

      {snapshot.state === 'pending' && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-amber-800">
            <span>Estimated by average Stacks block time: ~{averageBlockTimeMinutes} min</span>
            <span>{formatDurationMinutes(snapshot.elapsedMs)} elapsed</span>
          </div>
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden" aria-hidden="true">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${snapshot.progressPercent}%` }}
            />
          </div>
          <div className="text-xs text-amber-800">
            {snapshot.remainingMs > 0
              ? `Approx. ${formatDurationMinutes(snapshot.remainingMs)} remaining based on average Stacks block time`
              : 'Confirmation is taking longer than average block time but still valid in mempool.'}
          </div>
          {snapshot.pendingPhase === 'propagation' && notFoundGraceRemaining && (
            <div className="text-xs text-amber-800">
              Indexer propagation is still in progress. We will only mark this as not found after {notFoundGraceRemaining}.
            </div>
          )}
        </div>
      )}

      {anchorLabel && (
        <div className={`text-xs ${variant.text}`}>
          Microblock anchor time: {anchorLabel}
        </div>
      )}

      <a
        href={getExplorerUrl(snapshot.txId)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 text-xs font-medium hover:underline ${variant.text}`}
      >
        View transaction on explorer
        <ExternalLink size={12} />
      </a>
    </div>
  );
};

export default StacksTxStatusPanel;
