import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, Vite sert le studio (port 5175) et passe la connexion /ws au pont (port 4850).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: { '/ws': { target: 'ws://127.0.0.1:4850', ws: true }, '/apercu': { target: 'http://127.0.0.1:4850' } },
  },
  build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});
