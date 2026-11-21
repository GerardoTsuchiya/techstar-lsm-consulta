import { createReadStream, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

/**
 * Sirve (en desarrollo) y copia (al compilar) el código WebAssembly de MediaPipe a `mediapipe/`,
 * para que el reconocedor experimental funcione **sin internet** (también en Electron con `file://`).
 * Solo los dos archivos que usa `FilesetResolver.forVisionTasks` (variante con SIMD, sin módulo).
 */
const CARPETA = path.join(path.dirname(fileURLToPath(import.meta.url)), 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const ARCHIVOS = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm'] as const;

const tipo = (nombre: string) => (nombre.endsWith('.wasm') ? 'application/wasm' : 'text/javascript');

export function mediapipeSinInternet(): Plugin {
  return {
    name: 'techstar-mediapipe',
    configureServer(server) {
      server.middlewares.use('/mediapipe', (req, res, next) => {
        const nombre = (req.url ?? '').split('?')[0]!.replace(/^\//, '');
        if (!(ARCHIVOS as readonly string[]).includes(nombre)) return next();
        res.setHeader('Content-Type', tipo(nombre));
        createReadStream(path.join(CARPETA, nombre)).pipe(res);
      });
    },
    generateBundle() {
      for (const nombre of ARCHIVOS) {
        this.emitFile({ type: 'asset', fileName: `mediapipe/${nombre}`, source: readFileSync(path.join(CARPETA, nombre)) });
      }
    },
  };
}
