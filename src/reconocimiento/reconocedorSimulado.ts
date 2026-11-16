import type { ClipTemporal } from '../camara/adaptador';
import type { PoliticaRecursos } from '../nucleo/tipos';
import type { Reconocedor, ResultadoReconocimiento } from './reconocedor';

/**
 * ⚠ RECONOCEDOR SIMULADO — NO ES RECONOCIMIENTO DE LSM.
 *
 * No analiza el clip (ni siquiera lee sus datos). Cuando se pide un reconocimiento queda
 * esperando a que una persona (el operador de la prueba) elija en la pantalla
 * «reconocido como X» o «desconocido». Sirve para probar la interfaz, la revisión, el envío y
 * el aviso de expresión desconocida mientras no hay modelo ni muestras autorizadas.
 *
 * Solo existe con la política `desarrollo`: crearlo con otra política lanza un error, y la vista
 * lo identifica con la etiqueta «Simulador · no es reconocimiento real».
 */
export class ReconocedorSimulado implements Reconocedor {
  readonly nombre = 'Simulador de desarrollo (no reconoce LSM)';
  readonly simulado = true;
  readonly vocabulario: readonly string[];
  private pendiente: { capturaId: string; resolver: (r: ResultadoReconocimiento) => void } | null = null;
  private readonly oyentes = new Set<(capturaId: string | null) => void>();

  constructor(politica: PoliticaRecursos, vocabulario: readonly string[]) {
    if (politica !== 'desarrollo') {
      throw new Error('El reconocedor simulado solo puede usarse en modo desarrollo.');
    }
    this.vocabulario = [...vocabulario];
  }

  /** Captura que espera la decisión del operador, o `null`. */
  get capturaPendiente(): string | null {
    return this.pendiente?.capturaId ?? null;
  }

  alPendiente(fn: (capturaId: string | null) => void): () => void {
    this.oyentes.add(fn);
    return () => {
      this.oyentes.delete(fn);
    };
  }

  reconocer(clip: ClipTemporal, senal: AbortSignal): Promise<ResultadoReconocimiento> {
    // Una petición anterior sin decidir se abandona: solo cuenta la captura en curso.
    this.pendiente = null;
    return new Promise((resolver, rechazar) => {
      if (senal.aborted) {
        rechazar(senal.reason);
        return;
      }
      const capturaId = clip.capturaId;
      senal.addEventListener(
        'abort',
        () => {
          if (this.pendiente?.capturaId === capturaId) this.fijarPendiente(null);
          rechazar(senal.reason);
        },
        { once: true },
      );
      this.fijarPendiente({ capturaId, resolver });
    });
  }

  /** El operador decide el resultado. Se ignora si esa captura ya no espera. */
  elegir(capturaId: string, resultado: ResultadoReconocimiento): boolean {
    const p = this.pendiente;
    if (!p || p.capturaId !== capturaId) return false;
    if (resultado.tipo === 'reconocido' && !this.vocabulario.includes(resultado.entradaId)) return false;
    this.fijarPendiente(null);
    p.resolver(resultado);
    return true;
  }

  private fijarPendiente(p: ReconocedorSimulado['pendiente']) {
    this.pendiente = p;
    for (const fn of [...this.oyentes]) fn(p?.capturaId ?? null);
  }
}

export function esSimulado(r: Reconocedor | null): r is ReconocedorSimulado {
  return r instanceof ReconocedorSimulado;
}
