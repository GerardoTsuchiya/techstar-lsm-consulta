import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Etapa A: la app corre en el navegador de esta computadora.
// `host: '127.0.0.1'` mantiene el servidor de desarrollo en loopback (TECHSTAR_MVP.md §5).
// La etapa B abrirá la red local solo a través del coordinador, con vinculación.
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
