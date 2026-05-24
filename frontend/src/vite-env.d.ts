/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: string;
  readonly VITE_CONTRACT_ADDRESS: string;
  readonly VITE_API_URL: string;
  readonly VITE_STACKS_API_URL: string;
  readonly VITE_APP_NAME: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_ENABLE_LIQUIDATIONS: string;
  readonly VITE_ENABLE_NOTIFICATIONS: string;
  readonly VITE_BITFLOW_API_HOST?: string;
  readonly VITE_KEEPER_API_HOST?: string;
  readonly VITE_READONLY_CALL_API_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

