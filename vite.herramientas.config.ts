import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { esSecuenciaPuntos } from './src/reconocimiento/experimental/puntos.ts';
import { mediapipeSinInternet } from './vite.mediapipe.ts';

/**
 * Herramienta de extracción de puntos (reconocedor experimental). SOLO para el equipo, en
 * 127.0.0.1:5174, nunca en la app: `npm run herramienta-puntos`.
 *
 * Lee los videos de `recursos-candidatos/videos/` (ignorada por git; permiso de entrenamiento de
 * sus fuentes) según `recursos-candidatos/inventario-reconocedor.json` y guarda los puntos en
 * `recursos-candidatos/puntos/` (ignorada). No recibe ni guarda capturas de consulta (RF-18).
 */
const RAIZ = path.dirname(fileURLToPath(import.meta.url));
const VIDEOS = path.join(RAIZ, 'recursos-candidatos', 'videos');
const PUNTOS = path.join(RAIZ, 'recursos-candidatos', 'puntos');
const INVENTARIO = path.join(RAIZ, 'recursos-candidatos', 'inventario-reconocedor.json');
const NOMBRE = /^[A-Za-z0-9_-]+\.mp4$/;
const LIMITE_BYTES = 5 * 1024 * 1024;

function archivosDelInventario(): Set<string> {
  const inv = JSON.parse(readFileSync(INVENTARIO, 'utf8')) as { videos: { archivo: string }[] };
  return new Set(inv.videos.map((v) => v.archivo));
}

function leerCuerpo(req: IncomingMessage): Promise<string> {
  return new Promise((resolver, rechazar) => {
    let total = 0;
    const partes: Buffer[] = [];
    req.on('data', (b: Buffer) => {
      total += b.length;
      if (total > LIMITE_BYTES) {
        rechazar(new Error('Demasiado grande'));
        req.destroy();
      } else partes.push(b);
    });
    req.on('end', () => resolver(Buffer.concat(partes).toString('utf8')));
    req.on('error', rechazar);
  });
}

function servidorHerramienta(): Plugin {
  return {
    name: 'techstar-herramienta-puntos',
    configureServer(server) {
      server.middlewares.use('/__techstar', (req, res, next) => {
        const url = (req.url ?? '').split('?')[0]!;
        const responder = (codigo: number, cuerpo: unknown) => {
          res.statusCode = codigo;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(cuerpo));
        };
        if (req.method === 'GET' && url === '/inventario') {
          const existentes = existsSync(PUNTOS) ? readdirSync(PUNTOS).filter((n) => n.endsWith('.json')) : [];
          return responder(200, { inventario: JSON.parse(readFileSync(INVENTARIO, 'utf8')), existentes });
        }
        const video = /^\/videos\/(.+)$/.exec(url)?.[1];
        if (req.method === 'GET' && video) {
          if (!NOMBRE.test(video) || !archivosDelInventario().has(video)) return responder(404, { error: 'No está en el inventario' });
          const ruta = path.join(VIDEOS, video);
          if (!existsSync(ruta)) return responder(404, { error: 'Falta el video' });
          // Con rangos (206): el modo «buscar» necesita saltar dentro del video.
          const total = statSync(ruta).size;
          const rango = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
          res.setHeader('Content-Type', 'video/mp4');
          res.setHeader('Accept-Ranges', 'bytes');
          if (!rango) {
            res.setHeader('Content-Length', total);
            return void createReadStream(ruta).pipe(res);
          }
          const inicio = rango[1] ? Number(rango[1]) : 0;
          const fin = rango[2] ? Math.min(Number(rango[2]), total - 1) : total - 1;
          res.statusCode = 206;
          res.setHeader('Content-Range', `bytes ${inicio}-${fin}/${total}`);
          res.setHeader('Content-Length', fin - inicio + 1);
          return void createReadStream(ruta, { start: inicio, end: fin }).pipe(res);
        }
        const destino = /^\/puntos\/([A-Za-z0-9_-]+\.mp4)\/(reproducir)$/.exec(url);
        if (req.method === 'POST' && destino) {
          const [, archivo, modo] = destino;
          if (!archivosDelInventario().has(archivo!)) return responder(404, { error: 'No está en el inventario' });
          void leerCuerpo(req).then(
            (texto) => {
              const datos: unknown = JSON.parse(texto);
              if (!esSecuenciaPuntos(datos)) return responder(400, { error: 'Secuencia inválida' });
              mkdirSync(PUNTOS, { recursive: true });
              writeFileSync(path.join(PUNTOS, `${archivo!.replace(/\.mp4$/, '')}.${modo}.json`), JSON.stringify(datos));
              responder(200, { ok: true });
            },
            () => responder(413, { error: 'Cuerpo inválido' }),
          );
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [mediapipeSinInternet(), servidorHerramienta()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true, open: false },
});
