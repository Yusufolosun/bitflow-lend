import React from 'react';
import { Wifi } from 'lucide-react';
import { ACTIVE_NETWORK } from '../config/contracts';

/**
 * NetworkIndicator Component
 * Displays the currently active blockchain network with a status dot
 */
export const NetworkIndicator: React.FC = () => {
  const isMainnet = ACTIVE_NETWORK === 'mainnet';

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        isMainnet
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
      }`}
      title={`Connected to Stacks ${isMainnet ? 'Mainnet' : 'Testnet'}`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isMainnet ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
        }`}
        aria-hidden="true"
      />
      <Wifi size={12} aria-hidden="true" />
      <span>{isMainnet ? 'Mainnet' : 'Testnet'}</span>
    </div>
  );
};

export default NetworkIndicator;
