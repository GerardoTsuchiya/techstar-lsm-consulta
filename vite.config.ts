import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Política de contenido de la versión compilada (la que carga Electron): solo código propio,
 * sin scripts en línea, y conexiones WebSocket hacia la laptop del médico.
 * No se aplica en `npm run dev` porque el servidor de desarrollo inyecta scripts en línea.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' ws:",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function politicaDeContenido(): Plugin {
  return {
    name: 'techstar-csp',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// `host: '127.0.0.1'` mantiene el servidor de desarrollo en loopback (TECHSTAR_MVP.md §5).
// La red local solo se abre desde el modo médico de Electron, con vinculación (etapa B).
// `base: './'`: Electron carga `dist/index.html` desde disco.
export default defineConfig({
  base: './',
  plugins: [react(), politicaDeContenido()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/pruebas/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'electron/**/*.test.ts'],
  },
});
