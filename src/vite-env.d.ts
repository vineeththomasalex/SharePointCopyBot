/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEFAULT_CLIENT_ID: string
  readonly VITE_DEFAULT_TENANT_ID: string
  readonly VITE_REDIRECT_URI: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
