import { describe, it, expect } from 'vitest';
import {
  VAULT_CONTRACT,
  STAKING_CONTRACT,
  ORACLE_CONTRACT,
  PROTOCOL_CONSTANTS,
  CONTRACT_VERSIONS,
  getActiveContractVersion,
  getContractAddress,
  getContractId,
  getApiEndpoint,
  getExplorerUrl,
  API_ENDPOINTS,
} from '../contracts';

describe('Contract Configuration', () => {
  // ── VAULT_CONTRACT ──────────────────────────────────────────────
  describe('VAULT_CONTRACT', () => {
    it('has testnet and mainnet addresses', () => {
      expect(VAULT_CONTRACT.testnet.address).toBeTruthy();
      expect(VAULT_CONTRACT.mainnet.address).toBeTruthy();
    });

    it('uses correct contract name', () => {
      expect(VAULT_CONTRACT.testnet.contractName).toBe('bitflow-vault-core');
      expect(VAULT_CONTRACT.mainnet.contractName).toBe('bitflow-vault-core');
    });

    it('testnet uses ST prefix', () => {
      expect(VAULT_CONTRACT.testnet.address.startsWith('ST')).toBe(true);
    });

    it('mainnet uses SP prefix', () => {
      expect(VAULT_CONTRACT.mainnet.address.startsWith('SP')).toBe(true);
    });
  });

  // ── STAKING_CONTRACT ────────────────────────────────────────────
  describe('STAKING_CONTRACT', () => {
    it('shares deployer address with vault', () => {
      expect(STAKING_CONTRACT.testnet.address).toBe(VAULT_CONTRACT.testnet.address);
      expect(STAKING_CONTRACT.mainnet.address).toBe(VAULT_CONTRACT.mainnet.address);
    });

    it('uses correct contract name', () => {
      expect(STAKING_CONTRACT.testnet.contractName).toBe('bitflow-staking-pool');
    });
  });

  // ── ORACLE_CONTRACT ─────────────────────────────────────────────
  describe('ORACLE_CONTRACT', () => {
    it('shares deployer address with vault', () => {
      expect(ORACLE_CONTRACT.testnet.address).toBe(VAULT_CONTRACT.testnet.address);
      expect(ORACLE_CONTRACT.mainnet.address).toBe(VAULT_CONTRACT.mainnet.address);
    });

    it('uses correct contract name', () => {
      expect(ORACLE_CONTRACT.testnet.contractName).toBe('bitflow-oracle-registry');
    });
  });

  // ── PROTOCOL_CONSTANTS ──────────────────────────────────────────
  describe('PROTOCOL_CONSTANTS', () => {
    it('liquidation threshold is below collateral ratio', () => {
      expect(PROTOCOL_CONSTANTS.LIQUIDATION_THRESHOLD).toBeLessThan(
        PROTOCOL_CONSTANTS.MIN_COLLATERAL_RATIO
      );
    });

    it('has expected blocks per year', () => {
      expect(PROTOCOL_CONSTANTS.BLOCKS_PER_YEAR).toBe(52560);
    });

    it('liquidation bonus is 5%', () => {
      expect(PROTOCOL_CONSTANTS.LIQUIDATION_BONUS).toBe(5);
    });
  });

  // ── CONTRACT_VERSIONS ───────────────────────────────────────────
  describe('CONTRACT_VERSIONS', () => {
    it('contains at least v1 and v2', () => {
      expect(CONTRACT_VERSIONS.length).toBeGreaterThanOrEqual(2);
    });

    it('versions are in order', () => {
      expect(CONTRACT_VERSIONS[0].version).toBe('1.0.0');
      expect(CONTRACT_VERSIONS[1].version).toBe('2.0.0');
    });
  });

  // ── getActiveContractVersion ────────────────────────────────────
  describe('getActiveContractVersion', () => {
    it('returns the latest non-deprecated version', () => {
      const active = getActiveContractVersion();
      expect(active.version).toBe('2.0.0');
    });
  });

  // ── getContractAddress ──────────────────────────────────────────
  describe('getContractAddress', () => {
    it('returns a non-empty string', () => {
      const addr = getContractAddress();
      expect(addr).toBeTruthy();
      expect(typeof addr).toBe('string');
    });
  });

  // ── getContractId ───────────────────────────────────────────────
  describe('getContractId', () => {
    it('returns address.contractName format', () => {
      const id = getContractId();
      expect(id).toContain('.');
      expect(id).toContain('bitflow-vault-core');
    });
  });

  // ── API_ENDPOINTS ───────────────────────────────────────────────
  describe('API_ENDPOINTS', () => {
    it('testnet points to hiro API', () => {
      expect(API_ENDPOINTS.testnet).toContain('testnet.hiro.so');
    });

    it('mainnet points to hiro API', () => {
      expect(API_ENDPOINTS.mainnet).toContain('mainnet.hiro.so');
    });
  });

  // ── getExplorerUrl ──────────────────────────────────────────────
  describe('getExplorerUrl', () => {
    it('returns base URL without txId', () => {
      const url = getExplorerUrl();
      expect(url).toContain('explorer.hiro.so');
    });

    it('includes txId when provided', () => {
      const url = getExplorerUrl('0xabc123');
      expect(url).toContain('0xabc123');
      expect(url).toContain('txid');
    });
  });
});
