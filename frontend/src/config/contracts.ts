import { StacksMainnet, StacksTestnet } from '@stacks/network';

/**
 * Contract Configuration
 * Manages contract addresses and network settings
 */

export const NETWORK_CONFIG = {
  testnet: new StacksTestnet(),
  mainnet: new StacksMainnet(),
};

// Determine active network from environment variable, defaulting to testnet for safety
export const ACTIVE_NETWORK = (import.meta.env.VITE_NETWORK || 'testnet') as 'testnet' | 'mainnet';

// Get the active network instance
export const getNetwork = () => NETWORK_CONFIG[ACTIVE_NETWORK];

// Contract Details
export const VAULT_CONTRACT = {
  name: 'bitflow-vault-core',

  // Testnet deployment address (UPDATED: February 10, 2026)
  testnet: {
    address: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    contractName: 'bitflow-vault-core',
  },

  // Mainnet deployment address (DEPLOYED: February 10, 2026)
  mainnet: {
    address: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
    contractName: 'bitflow-vault-core',
  },
};

// Contract version registry — supports viewing/managing positions across
// contract upgrades. The "active" entry is the current deployment; older
// entries are kept so users can still interact with legacy positions during
// migration windows.
export interface ContractVersion {
  version: string;
  address: { testnet: string; mainnet: string };
  contractName: string;
  deprecated?: boolean;
}

export const CONTRACT_VERSIONS: ContractVersion[] = [
  {
    version: '1.0.0',
    address: {
      testnet: VAULT_CONTRACT.testnet.address,
      mainnet: VAULT_CONTRACT.mainnet.address,
    },
    contractName: 'bitflow-vault-core',
  },
];

// Points to the latest non-deprecated version
export const getActiveContractVersion = (): ContractVersion => {
  const active = CONTRACT_VERSIONS.filter((v) => !v.deprecated);
  return active[active.length - 1];
};

// Get the active contract address
export const getContractAddress = () => {
  return ACTIVE_NETWORK === 'testnet' 
    ? VAULT_CONTRACT.testnet.address 
    : VAULT_CONTRACT.mainnet.address;
};

// Get the full contract identifier
export const getContractId = () => {
  const config = ACTIVE_NETWORK === 'testnet' 
    ? VAULT_CONTRACT.testnet 
    : VAULT_CONTRACT.mainnet;
  
  return `${config.address}.${config.contractName}`;
};

// Protocol Constants — canonical source, matches the Clarity contract definitions:
//   MIN-COLLATERAL-RATIO  u150  (contracts/bitflow-vault-core.clar:25)
//   LIQUIDATION-THRESHOLD u110  (contracts/bitflow-vault-core.clar:26)
//   LATE-PENALTY-RATE     u500  (contracts/bitflow-vault-core.clar:31) = 5% penalty
export const PROTOCOL_CONSTANTS = {
  MIN_COLLATERAL_RATIO: 150, // 150% — minimum collateral-to-loan ratio
  LIQUIDATION_THRESHOLD: 110, // 110% — positions below this are liquidatable
  LIQUIDATION_BONUS: 5, // 5% — bonus awarded to liquidators
  BLOCKS_PER_YEAR: 52560, // Stacks blocks per year (approx)
  BLOCK_TIME_MINUTES: 10, // Average block time
};

// API Endpoints
export const API_ENDPOINTS = {
  testnet: 'https://api.testnet.hiro.so',
  mainnet: 'https://api.mainnet.hiro.so',
};

export const getApiEndpoint = () => {
  return ACTIVE_NETWORK === 'testnet' 
    ? API_ENDPOINTS.testnet 
    : API_ENDPOINTS.mainnet;
};

// Explorer URLs
export const EXPLORER_URLS = {
  testnet: 'https://explorer.hiro.so',
  mainnet: 'https://explorer.hiro.so',
};

export const getExplorerUrl = (txId?: string) => {
  const baseUrl = ACTIVE_NETWORK === 'testnet' 
    ? EXPLORER_URLS.testnet 
    : EXPLORER_URLS.mainnet;
  
  return txId 
    ? `${baseUrl}/txid/${txId}?chain=${ACTIVE_NETWORK}` 
    : `${baseUrl}?chain=${ACTIVE_NETWORK}`;
};
