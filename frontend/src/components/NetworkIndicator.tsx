import React from 'react';
import { Wifi } from 'lucide-react';
import { ACTIVE_NETWORK } from '../config/contracts';
import { NETWORK_COPY } from '../constants/messages';

/**
 * NetworkIndicator Component
 * Displays the currently active blockchain network with a status dot
 */
export const NetworkIndicator: React.FC = () => {
  const isMainnet = ACTIVE_NETWORK === 'mainnet';
  const networkLabel = isMainnet ? NETWORK_COPY.mainnetLabel : NETWORK_COPY.testnetLabel;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        isMainnet
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      }`}
      role="status"
      aria-live="polite"
      aria-label={NETWORK_COPY.ariaLabel(networkLabel)}
      title={NETWORK_COPY.title(networkLabel)}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isMainnet ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
        }`}
        aria-hidden="true"
      />
      <Wifi size={12} aria-hidden="true" />
      <span>{networkLabel}</span>
    </div>
  );
};

export default NetworkIndicator;
