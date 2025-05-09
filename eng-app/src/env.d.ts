/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FITBIT_CLIENT_ID: string;
  readonly VITE_FITBIT_CLIENT_SECRET: string;
  readonly VITE_GARMIN_CLIENT_ID: string;
  readonly VITE_GARMIN_CLIENT_SECRET: string;
  readonly VITE_GOOGLE_FIT_CLIENT_ID: string;
  readonly VITE_GOOGLE_FIT_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
} 