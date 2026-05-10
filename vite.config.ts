import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        popup: 'src/popup/index.html',
      },
      output: {
        manualChunks: {
          recharts: ['recharts'],
        },
      },
    },
  },
});
