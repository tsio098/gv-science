/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIFF_ID?: string;
  /** Provider B 用 LIFF ID（/b・/pair-b パスで使用） */
  readonly VITE_LIFF_ID_B?: string;
  readonly VITE_GAS_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
