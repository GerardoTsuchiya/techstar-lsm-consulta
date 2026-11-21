import { caracteristicas, type Pesos } from './caracteristicas.ts';
import type { SecuenciaPuntos } from './puntos.ts';

/**
 * Clasificador del reconocedor experimental: vecino más cercano con DTW (alineamiento temporal
 * dinámico) sobre las características de cada cuadro, y **rechazo** de lo que no se parece lo
 * suficiente a ninguna plantilla (RF-05: ante la duda responde «desconocido», nunca adivina).
 */

export interface Plantilla {
  /** Entrada del catálogo que representa. */
  entrada: string;
  /** Video de origen (nombre del archivo; «(espejo)» si es la versión reflejada). */
  origen: string;
  vectores: number[][];
}

export interface ModeloReconocedor {
  version: 1;
  descripcion: string;
  /** Cuadros por secuencia tras remuestrear. */
  pasos: number;
  /** Pesos de las características con que se calcularon las plantillas (la consulta usa los mismos). */
  pesos: Pesos;
  /** Ventana de Sakoe-Chiba del DTW, en cuadros. */
  banda: number;
  /** Se rechaza si la distancia a la plantilla más cercana supera este valor. */
  umbralDistancia: number;
  /**
   * Se rechaza si la mejor entrada no se distingue de la segunda:
   * distancia mejor / distancia segunda mayor que este valor (1 = no exige margen).
   */
  umbralMargen: number;
  plantillas: Plantilla[];
}

export type Decision =
  | { tipo: 'reconocido'; entrada: string; distancia: number; margen: number; origen: string }
  | {
      tipo: 'desconocido';
      motivo: 'sin-manos' | 'sin-cuerpo' | 'lejana' | 'ambigua' | 'sin-plantillas';
      /** Entrada más parecida, solo para el registro de evaluación: nunca se muestra como resultado. */
      masParecida?: string;
      distancia?: number;
      margen?: number;
    };

/** Distancia euclidiana entre dos cuadros. */
function distanciaCuadro(a: readonly number[], b: readonly number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i]! - b[i]!;
    s += d * d;
  }
  return Math.sqrt(s);
}

/** DTW con banda; devuelve el costo medio por paso del mejor alineamiento. */
export function dtw(a: readonly number[][], b: readonly number[][], banda: number): number {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0) return Infinity;
  const w = Math.max(banda, Math.abs(n - m));
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  const L = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  D[0]![0] = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = Math.max(1, i - w); j <= Math.min(m, i + w); j++) {
      const c = distanciaCuadro(a[i - 1]!, b[j - 1]!);
      const diag = D[i - 1]![j - 1]!;
      const arriba = D[i - 1]![j]!;
      const izq = D[i]![j - 1]!;
      let mejor = diag;
      let largo = L[i - 1]![j - 1]!;
      if (arriba < mejor) {
        mejor = arriba;
        largo = L[i - 1]![j]!;
      }
      if (izq < mejor) {
        mejor = izq;
        largo = L[i]![j - 1]!;
      }
      D[i]![j] = mejor + c;
      L[i]![j] = largo + 1;
    }
  }
  return D[n]![m]! / L[n]![m]!;
}

/** Distancia mínima a las plantillas de cada entrada, y la plantilla que la dio. */
export function distanciasPorEntrada(
  modelo: Pick<ModeloReconocedor, 'banda' | 'plantillas'>,
  vectores: readonly number[][],
): Map<string, { distancia: number; origen: string }> {
  const res = new Map<string, { distancia: number; origen: string }>();
  for (const p of modelo.plantillas) {
    const d = dtw(vectores, p.vectores, modelo.banda);
    const actual = res.get(p.entrada);
    if (!actual || d < actual.distancia) res.set(p.entrada, { distancia: d, origen: p.origen });
  }
  return res;
}

/** Decide a partir de vectores ya calculados. */
export function decidirVectores(modelo: ModeloReconocedor, vectores: readonly number[][]): Decision {
  const orden = [...distanciasPorEntrada(modelo, vectores)].sort((a, b) => a[1].distancia - b[1].distancia);
  const primera = orden[0];
  if (!primera) return { tipo: 'desconocido', motivo: 'sin-plantillas' };
  const [entrada, { distancia, origen }] = primera;
  const segunda = orden[1]?.[1].distancia ?? Infinity;
  const margen = segunda > 0 ? distancia / segunda : 1;
  if (distancia > modelo.umbralDistancia) return { tipo: 'desconocido', motivo: 'lejana', masParecida: entrada, distancia, margen };
  if (margen > modelo.umbralMargen) return { tipo: 'desconocido', motivo: 'ambigua', masParecida: entrada, distancia, margen };
  return { tipo: 'reconocido', entrada, distancia, margen, origen };
}

/** Decide a partir de los puntos de un clip. */
export function decidir(modelo: ModeloReconocedor, s: SecuenciaPuntos): Decision {
  const c = caracteristicas(s, modelo.pasos, modelo.pesos);
  if (!c.ok) return { tipo: 'desconocido', motivo: c.motivo };
  return decidirVectores(modelo, c.vectores);
}

/** Comprueba la forma de un modelo leído de un archivo. */
export function esModeloReconocedor(v: unknown): v is ModeloReconocedor {
  if (typeof v !== 'object' || v === null) return false;
  const m = v as Partial<ModeloReconocedor>;
  const numero = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  return (
    m.version === 1 &&
    typeof m.descripcion === 'string' &&
    numero(m.pasos) &&
    typeof m.pesos === 'object' &&
    m.pesos !== null &&
    numero(m.pesos.presencia) &&
    numero(m.pesos.posicion) &&
    numero(m.pesos.forma) &&
    numero(m.banda) &&
    numero(m.umbralDistancia) &&
    numero(m.umbralMargen) &&
    Array.isArray(m.plantillas) &&
    m.plantillas.every(
      (p: Partial<Plantilla>) =>
        typeof p.entrada === 'string' &&
        typeof p.origen === 'string' &&
        Array.isArray(p.vectores) &&
        p.vectores.length === m.pasos &&
        p.vectores.every((f) => Array.isArray(f) && f.every(numero)),
    )
  );
}
