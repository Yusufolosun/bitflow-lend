import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';

/**
 * Contract Configuration
 * Manages contract addresses and network settings
 */

export const NETWORK_CONFIG = {
  testnet: STACKS_TESTNET,
  mainnet: STACKS_MAINNET,
};

const resolveEnvContractAddress = (): string | null => {
  const rawValue = import.meta.env.VITE_CONTRACT_ADDRESS?.trim();
  if (!rawValue) return null;

  // Backward compatibility: accept either "SP..." or "SP....contract-name" and keep address part.
  const [address] = rawValue.split('.');
  return address || null;
};

const ENV_CONTRACT_ADDRESS = resolveEnvContractAddress();
const ENV_STACKS_API_URL = import.meta.env.VITE_STACKS_API_URL?.trim() || null;

export const resolveActiveNetwork = (value: string | undefined): 'testnet' | 'mainnet' => {
  return value === 'mainnet' ? 'mainnet' : 'testnet';
};

// Determine active network from environment variable, defaulting to testnet for safety
export const ACTIVE_NETWORK = resolveActiveNetwork(import.meta.env.VITE_NETWORK);

// Get the active network instance
export const getNetwork = () => NETWORK_CONFIG[ACTIVE_NETWORK];

// Contract Details
export const VAULT_CONTRACT = {
  name: 'bitflow-vault-core-v2',

  // Testnet deployment address (UPDATED: February 10, 2026)
  testnet: {
    address: 'ST1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK1GA0CF0',
    contractName: 'bitflow-vault-core-v2',
  },

  // Mainnet deployment address (DEPLOYED: February 10, 2026)
  mainnet: {
    address: 'SP1M46W6CVGAMH3ZJD3TKMY5KCY48HWAZK0DYG193',
    contractName: 'bitflow-vault-core-v2',
  },
};

// Staking Pool Contract Details
export const STAKING_CONTRACT = {
  name: 'bitflow-staking-pool',
  testnet: {
    address: VAULT_CONTRACT.testnet.address,
    contractName: 'bitflow-staking-pool',
  },
  mainnet: {
    address: VAULT_CONTRACT.mainnet.address,
    contractName: 'bitflow-staking-pool',
  },
};

// Oracle Registry Contract Details
export const ORACLE_CONTRACT = {
  name: 'bitflow-oracle-registry',
  testnet: {
    address: VAULT_CONTRACT.testnet.address,
    contractName: 'bitflow-oracle-registry',
  },
  mainnet: {
    address: VAULT_CONTRACT.mainnet.address,
    contractName: 'bitflow-oracle-registry',
  },
};

// Contract version registry.
export interface ContractVersion {
  version: string;
  address: { testnet: string; mainnet: string };
  contractName: string;
  deprecated?: boolean;
}

export const CONTRACT_VERSIONS: ContractVersion[] = [
  {
    version: '2.0.0',
    address: {
      testnet: VAULT_CONTRACT.testnet.address,
      mainnet: VAULT_CONTRACT.mainnet.address,
    },
    contractName: 'bitflow-vault-core-v2',
  },
];

// Points to the latest non-deprecated version
export const getActiveContractVersion = (): ContractVersion => {
  const active = CONTRACT_VERSIONS.filter((v) => !v.deprecated);
  return active[active.length - 1];
};

// Get the active contract address
export const getContractAddress = () => {
  if (ENV_CONTRACT_ADDRESS) {
    return ENV_CONTRACT_ADDRESS;
  }

  return ACTIVE_NETWORK === 'testnet' 
    ? VAULT_CONTRACT.testnet.address 
    : VAULT_CONTRACT.mainnet.address;
};

// Get the full contract identifier (uses active version)
export const getContractId = () => {
  const active = getActiveContractVersion();
  const address = ACTIVE_NETWORK === 'testnet'
    ? active.address.testnet
    : active.address.mainnet;

  return `${address}.${active.contractName}`;
};

// Protocol Constants — canonical source, matches the Clarity contract definitions:
//   MIN-COLLATERAL-RATIO  u150  (contracts/bitflow-vault-core-v2.clar)
//   LIQUIDATION-THRESHOLD u110  (contracts/bitflow-vault-core-v2.clar)
//   LATE-PENALTY-RATE     u500  (contracts/bitflow-vault-core-v2.clar) = 5% penalty
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
  if (ENV_STACKS_API_URL) {
    return ENV_STACKS_API_URL;
  }

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
