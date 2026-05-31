import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// LIFF は SPA。Cloudflare Workers の SPA フォールバックで `/`, `/b/`, その他
// 任意のクライアントルートにアクセスし得る。base が './' だと:
//   /b/ から開く → ブラウザは ./assets/... を /b/assets/... と解決 → 404
// となり真っ白画面になる。assets は常にドメイン直下の /assets/ に
// 配信されるため、base は '/' (絶対パス) に固定する。
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
