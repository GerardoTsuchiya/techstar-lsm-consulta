import { builtinModules } from 'node:module';
import { defineConfig } from 'vite';

/**
 * Compila el proceso principal y el preload de Electron (etapa B) a `dist-electron/`.
 * Formato CommonJS, un archivo autónomo por entrada: el preload con `sandbox: true` solo puede
 * cargar `electron`, así que no debe compartir fragmentos con el proceso principal.
 *   vite build -c vite.electron.config.ts                 → main.cjs (vacía la carpeta)
 *   vite build -c vite.electron.config.ts --mode preload  → preload.cjs
 * `electron` y `ws` quedan fuera del paquete; el núcleo (`src/nucleo`) se incluye.
 */
export default defineConfig(({ mode }) => {
  const entrada = mode === 'preload' ? 'preload' : 'main';
  return {
    build: {
      ssr: `electron/${entrada}.ts`,
      outDir: 'dist-electron',
      emptyOutDir: entrada === 'main',
      target: 'node22',
      minify: false,
      sourcemap: false,
      rollupOptions: {
        external: ['electron', 'ws', ...builtinModules, ...builtinModules.map((m) => `node:${m}`)],
        output: { format: 'cjs', entryFileNames: '[name].cjs' },
      },
    },
  };
});
