/**
 * Página de la herramienta de extracción (`npm run herramienta-puntos`, solo equipo).
 * No forma parte de la app: Vite solo compila `index.html`.
 */
import { extractorMediaPipe, rutasPredeterminadas, VELOCIDAD_EXTRACCION } from '../reconocimiento/experimental/extractorMediaPipe.ts';
import { redondear } from '../reconocimiento/experimental/puntos.ts';

interface VideoInventario {
  archivo: string;
  uso: 'plantilla' | 'desconocida' | 'excluido';
  entrada?: string;
}

const MINIMO_CUADROS_POR_SEGUNDO = 8;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function fila(celdas: (string | number)[], error = false) {
  const tr = document.createElement('tr');
  if (error) tr.className = 'error';
  for (const c of celdas) {
    const td = document.createElement('td');
    td.textContent = String(c);
    tr.appendChild(td);
  }
  $('filas').appendChild(tr);
}

async function extraerTodo() {
  const boton = $<HTMLButtonElement>('iniciar');
  boton.disabled = true;
  const estado = $('estado');
  const repetir = $<HTMLInputElement>('repetir').checked;
  try {
    estado.textContent = 'Cargando MediaPipe…';
    const t0 = performance.now();
    const extractor = await extractorMediaPipe(rutasPredeterminadas(new URL('/', location.href).href));
    fila(['(carga de MediaPipe)', '', '', '', '', '', ((performance.now() - t0) / 1000).toFixed(2)]);
    const { inventario, existentes } = (await (await fetch('/__techstar/inventario')).json()) as {
      inventario: { videos: VideoInventario[] };
      existentes: string[];
    };
    // Igual que la app con el clip de la cámara (mismo extractor, mismo modo y velocidad).
    const modo = 'reproducir' as const;
    const tareas = inventario.videos
      .filter((v) => v.uso !== 'excluido')
      .map((v) => ({ v, modo }))
      .filter(({ v }) => repetir || !existentes.includes(`${v.archivo.replace(/\.mp4$/, '')}.${modo}.json`));
    let hechos = 0;
    for (const { v, modo } of tareas) {
      estado.textContent = `${hechos} de ${tareas.length} · ${v.archivo} (${modo})`;
      const inicio = performance.now();
      try {
        const s = await extractor.extraer(`/__techstar/videos/${v.archivo}`, new AbortController().signal, {
          velocidad: VELOCIDAD_EXTRACCION,
        });
        // Control de calidad: si el equipo no alcanzó a analizar suficientes cuadros, no se guarda.
        const duracion = s.cuadros.at(-1)?.t ?? 0;
        const porSegundo = duracion > 0 ? s.cuadros.length / duracion : 0;
        if (porSegundo < MINIMO_CUADROS_POR_SEGUNDO) {
          throw new Error(`Solo ${porSegundo.toFixed(1)} cuadros/s (mínimo ${MINIMO_CUADROS_POR_SEGUNDO}); no se guardó`);
        }
        const r = await fetch(`/__techstar/puntos/${v.archivo}/${modo}`, { method: 'POST', body: JSON.stringify(redondear(s)) });
        if (!r.ok) throw new Error(`El servidor respondió ${r.status}`);
        fila([
          v.archivo,
          v.entrada ?? v.uso,
          modo,
          s.cuadros.length,
          s.cuadros.filter((c) => c.manos.length > 0).length,
          s.cuadros.filter((c) => c.hombros).length,
          ((performance.now() - inicio) / 1000).toFixed(2),
        ]);
      } catch (e) {
        fila([v.archivo, v.uso, modo, 'error', String(e), '', ''], true);
      }
      hechos++;
    }
    estado.textContent = `Listo: ${hechos} videos.`;
    document.title = `LISTO ${hechos}`;
  } catch (e) {
    estado.textContent = `Error: ${String(e)}`;
    document.title = 'ERROR';
  } finally {
    boton.disabled = false;
  }
}

$('iniciar').addEventListener('click', () => void extraerTodo());
