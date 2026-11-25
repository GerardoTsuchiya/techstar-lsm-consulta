import type { ClipTemporal } from '../../camara/adaptador';
import type { Catalogo, PoliticaRecursos } from '../../nucleo/tipos';
import { entradasDelPaciente, type Reconocedor, type ResultadoReconocimiento } from '../reconocedor';
import { decidir, esModeloReconocedor, type Decision, type ModeloReconocedor } from './clasificador.ts';
import { extractorMediaPipe, VELOCIDAD_EXTRACCION, type ExtractorPuntos } from './extractorMediaPipe.ts';
import type { CuadroPuntos } from './puntos.ts';

/**
 * ⚠ RECONOCEDOR EXPERIMENTAL — NO VALIDADO.
 *
 * Reconoce de verdad (no lo decide una persona como el simulador), pero con un método sencillo y
 * datos muy limitados: puntos de manos y hombros (MediaPipe) comparados con DTW contra plantillas
 * de videos web de 1 o 2 personas por fuente. No se ha probado con personas Sordas ni con su
 * cámara. Ver guias/RECONOCEDOR.md.
 *
 * - Solo existe con la política `desarrollo` y la pantalla lo marca siempre.
 * - Si la seña no se parece lo suficiente a una plantilla, o se parece casi igual a dos, responde
 *   `desconocido` (RF-05).
 * - El clip y sus puntos viven solo en memoria durante `reconocer` (RF-18); no se guardan ni se
 *   usan para entrenar.
 */
export const VOCABULARIO_EXPERIMENTAL = [
  'PAC-S-01',
  'PAC-S-04',
  'PAC-S-05',
  'PAC-S-07',
  'PAC-S-08',
  'PAC-R-01',
  'PAC-R-02',
  'PAC-R-03',
] as const;

/** Datos del último reconocimiento para la pantalla de desarrollo. Sin imagen ni puntos. */
export interface DiagnosticoReconocimiento {
  decision: Decision;
  /** Cuadros analizados del clip. */
  cuadros: number;
  /** Tiempo desde «Listo» hasta el resultado. */
  totalMs: number;
  duracionClipMs: number;
  umbralDistancia: number;
  umbralMargen: number;
}

/** Puntos del cuadro que muestra ahora el video en vivo, o `null` si no hay imagen que analizar. */
export type DetectorEnVivo = (video: HTMLVideoElement) => CuadroPuntos | null;

export interface DependenciasExperimental {
  cargarModelo: () => Promise<ModeloReconocedor>;
  extractor: () => Promise<ExtractorPuntos>;
}

export async function cargarModeloPublicado(base: string = document.baseURI): Promise<ModeloReconocedor> {
  const r = await fetch(new URL('modelos/plantillas-lsm.json', base).href);
  if (!r.ok) throw new Error('No se encontró el modelo del reconocedor experimental.');
  const datos: unknown = await r.json();
  if (!esModeloReconocedor(datos)) throw new Error('El modelo del reconocedor experimental está dañado.');
  return datos;
}

const predeterminadas: DependenciasExperimental = {
  cargarModelo: () => cargarModeloPublicado(),
  extractor: () => extractorMediaPipe(),
};

function conAborto<T>(promesa: Promise<T>, senal: AbortSignal): Promise<T> {
  if (senal.aborted) return Promise.reject(senal.reason);
  return new Promise((resolver, rechazar) => {
    const cancelar = () => rechazar(senal.reason);
    senal.addEventListener('abort', cancelar, { once: true });
    promesa.then(
      (v) => (senal.removeEventListener('abort', cancelar), resolver(v)),
      (e: unknown) => (senal.removeEventListener('abort', cancelar), rechazar(e)),
    );
  });
}

export class ReconocedorExperimental implements Reconocedor {
  readonly nombre = 'Reconocedor experimental · no validado (MediaPipe + DTW, videos web)';
  readonly simulado = false;
  readonly experimental = true;
  readonly vocabulario: readonly string[];
  /** Último resultado, para la pantalla de desarrollo. Se pierde al cerrar la sesión. */
  ultimoDiagnostico: DiagnosticoReconocimiento | null = null;
  private readonly preparado: Promise<{ modelo: ModeloReconocedor; extractor: ExtractorPuntos }>;

  constructor(politica: PoliticaRecursos, catalogo: Catalogo, deps: DependenciasExperimental = predeterminadas) {
    if (politica !== 'desarrollo') {
      throw new Error('El reconocedor experimental solo puede usarse en modo desarrollo.');
    }
    const delPaciente = new Set(entradasDelPaciente(catalogo));
    const vocabulario: string[] = VOCABULARIO_EXPERIMENTAL.filter((id) => delPaciente.has(id));
    this.vocabulario = vocabulario;
    // Se cargan al crear la sesión para que el primer «Listo» no espere a MediaPipe.
    this.preparado = Promise.all([deps.cargarModelo(), deps.extractor()]).then(([modelo, extractor]) => ({
      // Solo plantillas de entradas que el paciente puede expresar en este catálogo.
      modelo: { ...modelo, plantillas: modelo.plantillas.filter((p) => vocabulario.includes(p.entrada)) },
      extractor,
    }));
    // El error se informa al reconocer (la vista lo muestra como «No se pudo interpretar la seña»).
    this.preparado.catch(() => undefined);
  }

  /**
   * Detector para dibujar en vivo, sobre la cámara, los puntos de manos y hombros que analiza este
   * reconocedor (solo modo desarrollo). Usa los mismos modelos que `reconocer`, pero no decide nada
   * ni guarda los puntos. `null` si el extractor no lo ofrece o no se pudo preparar.
   */
  async detectorEnVivo(): Promise<DetectorEnVivo | null> {
    try {
      const { extractor } = await this.preparado;
      return extractor.detectarCuadro ? (video) => extractor.detectarCuadro?.(video) ?? null : null;
    } catch {
      return null;
    }
  }

  async reconocer(clip: ClipTemporal, senal: AbortSignal): Promise<ResultadoReconocimiento> {
    const inicio = performance.now();
    const { modelo, extractor } = await conAborto(this.preparado, senal);
    const puntos = await extractor.extraer(clip.datos, senal, { velocidad: VELOCIDAD_EXTRACCION });
    if (senal.aborted) throw senal.reason;
    const decision = decidir(modelo, puntos);
    this.ultimoDiagnostico = {
      decision,
      cuadros: puntos.cuadros.length,
      totalMs: performance.now() - inicio,
      duracionClipMs: clip.duracionMs,
      umbralDistancia: modelo.umbralDistancia,
      umbralMargen: modelo.umbralMargen,
    };
    return decision.tipo === 'reconocido' && this.vocabulario.includes(decision.entrada)
      ? { tipo: 'reconocido', entradaId: decision.entrada }
      : { tipo: 'desconocido' };
  }
}

export function esExperimental(r: Reconocedor | null): r is ReconocedorExperimental {
  return r instanceof ReconocedorExperimental;
}

/** Texto breve del último resultado para la pantalla de desarrollo. */
export function describirDiagnostico(d: DiagnosticoReconocimiento | null): string | null {
  if (!d) return null;
  const s = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  const tiempo = `respuesta en ${s(d.totalMs)} (clip de ${s(d.duracionClipMs)}, ${d.cuadros} cuadros)`;
  const dec = d.decision;
  if (dec.tipo === 'reconocido') {
    return `Distancia ${dec.distancia.toFixed(2)} (umbral ${d.umbralDistancia.toFixed(2)}), margen ${dec.margen.toFixed(2)} (umbral ${d.umbralMargen.toFixed(2)}) · ${tiempo}`;
  }
  const motivos: Record<typeof dec.motivo, string> = {
    'sin-manos': 'no se vieron las manos',
    'sin-cuerpo': 'no se vieron los hombros',
    lejana: 'no se parece lo suficiente a ninguna seña del vocabulario',
    ambigua: 'se parece casi igual a dos señas',
    'sin-plantillas': 'no hay plantillas para este catálogo',
  };
  const detalle =
    dec.distancia !== undefined
      ? ` · distancia ${dec.distancia.toFixed(2)} (umbral ${d.umbralDistancia.toFixed(2)}), margen ${(dec.margen ?? 1).toFixed(2)}`
      : '';
  return `Rechazo: ${motivos[dec.motivo]}${detalle} · ${tiempo}`;
}
