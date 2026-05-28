import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// LIFF は SPA を想定。URL は触らないため base は './' で
// 静的ホスティング先のサブパスにも対応できるようにしておく。
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
