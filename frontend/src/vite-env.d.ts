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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

