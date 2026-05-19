import React from 'react';
import { Shield, AlertCircle, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { UserLoan } from '../types/vault';
import { formatSTX, formatTimestamp } from '../utils/formatters';
import { getExplorerUrl } from '../config/contracts';
import { POSITIONS_COPY } from '../constants/messages';

interface PositionsListProps {
  positions: UserLoan[];
  isLoading?: boolean;
}

/**
 * PositionsList Component
 * Displays a list of user positions with status badges and sorting
 */
export const PositionsList: React.FC<PositionsListProps> = ({ positions, isLoading }) => {
  // Sort positions: Active first, then Liquidated, then Repaid, finally by timestamp
  const sortedPositions = [...positions].sort((a, b) => {
    const statusPriority = { active: 0, liquidated: 1, repaid: 2 };
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[a.status] - statusPriority[b.status];
    }
    return b.startTimestamp - a.startTimestamp;
  });

  if (isLoading) {
    return (
      <div className="card-elevated animate-pulse flex flex-col gap-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="card-elevated text-center py-12 bg-gray-50/50 border-dashed border-2 border-gray-200">
        <Clock className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-600 font-medium">{POSITIONS_COPY.emptyTitle}</p>
        <p className="text-sm text-gray-500">{POSITIONS_COPY.emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="positions-list">
      {sortedPositions.map((position, index) => {
        const isActive = position.status === 'active';
        const isLiquidated = position.status === 'liquidated';
        const isRepaid = position.status === 'repaid';

        return (
          <div
            key={`${position.startTimestamp}-${index}`}
            className={`card-elevated transition-all ${
              !isActive ? 'opacity-60 grayscale-[0.8] bg-gray-100/50 border-gray-200 cursor-not-allowed select-none' : 'hover:shadow-md border-l-4 border-emerald-500'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Left: Position Info */}
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  isActive ? 'bg-emerald-50 text-emerald-600' : 
                  isLiquidated ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {isActive ? <Shield size={24} /> : isLiquidated ? <AlertCircle size={24} /> : <CheckCircle size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg font-bold text-gray-900">
                      {formatSTX(position.amountSTX)} STX
                    </span>
                    
                    {/* Status Badges */}
                    {isActive && (
                      <span id="badge-active" className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-200">
                        {POSITIONS_COPY.statusActive}
                      </span>
                    )}
                    {isLiquidated && (
                      <span id="badge-liquidated" className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-red-200">
                        {POSITIONS_COPY.statusLiquidated}
                      </span>
                    )}
                    {isRepaid && (
                      <span id="badge-repaid" className="bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-gray-300">
                        {POSITIONS_COPY.statusClosed}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <span>{POSITIONS_COPY.openedLabel(formatTimestamp(position.startTimestamp))}</span>
                    <span>•</span>
                    <span>{position.interestRatePercent}% APR</span>
                  </div>
                </div>
              </div>

              {/* Middle: Details Grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{POSITIONS_COPY.collateralLabel}</div>
                  <div className="text-sm font-semibold text-gray-700">
                    {formatSTX(position.collateralAmountSTX)} STX
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{POSITIONS_COPY.dueBlockLabel}</div>
                  <div className="text-sm font-semibold text-gray-700">
                    #{position.termEnd.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Right: Actions/Links */}
              <div className="flex items-center gap-3 ml-auto md:ml-0">
                <a
                  href={getExplorerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-all"
                  title={POSITIONS_COPY.viewOnExplorer}
                >
                  <ExternalLink size={18} />
                </a>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PositionsList;
