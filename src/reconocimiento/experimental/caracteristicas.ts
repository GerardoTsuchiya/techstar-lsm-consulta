import { PUNTOS_MANO, type CuadroPuntos, type Punto, type SecuenciaPuntos } from './puntos.ts';

/**
 * Características de una secuencia para el clasificador (reconocedor experimental).
 *
 * Cada mano se sigue de un cuadro al siguiente (por cercanía de la muñeca) y se ordenan: primero
 * la **dominante** (la que pasa más cuadros fuera de la posición de reposo), luego la otra. Por
 * cuadro y por mano:
 * - presencia (1 si se detectó la mano),
 * - posición de la muñeca respecto al centro de los hombros, en anchos de hombros,
 * - forma de la mano: los 20 puntos restantes respecto a la muñeca, en largos de palma.
 * Así no importan el tamaño del video, la distancia a la cámara ni si es vertical u horizontal.
 * Luego se recorta el tramo activo (alguna muñeca por encima de la posición de reposo) y se
 * remuestrea a `PASOS` cuadros por tiempo.
 */
export const PASOS = 20;
const VALORES_MANO = 1 + 2 + (PUNTOS_MANO - 1) * 2;
export const DIMENSION = 2 * VALORES_MANO;

/** Peso de cada grupo en la distancia entre cuadros. */
export interface Pesos {
  presencia: number;
  posicion: number;
  forma: number;
}
export const PESOS: Pesos = { presencia: 0.7, posicion: 1, forma: 0.35 };

/** Mínimo de cuadros activos para intentar reconocer (si no, la seña «no se vio»). */
export const MINIMO_CUADROS_CON_MANOS = 3;

/**
 * Una mano con la muñeca más abajo que esto (en anchos de hombros bajo el centro de los hombros)
 * está en reposo, p. ej. a la altura de la cintura antes y después de la seña.
 */
export const UMBRAL_REPOSO = 0.8;

export interface Referencia {
  cx: number;
  cy: number;
  /** Ancho de hombros en píxeles. */
  escala: number;
}

export type ResultadoCaracteristicas =
  | { ok: true; vectores: number[][]; cuadrosConManos: number }
  | { ok: false; motivo: 'sin-cuerpo' | 'sin-manos'; cuadrosConManos: number };

type Mano = readonly Punto[];
type Par = [Mano | undefined, Mano | undefined];

function mediana(v: number[]): number {
  const o = [...v].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m]! : (o[m - 1]! + o[m]!) / 2;
}

/** Centro y ancho de hombros de toda la secuencia (mediana: estable ante cuadros malos). */
export function referenciaDe(s: SecuenciaPuntos): Referencia | null {
  const conHombros = s.cuadros.flatMap((c) => (c.hombros ? [c.hombros] : []));
  if (conHombros.length === 0) return null;
  const escala = mediana(conHombros.map(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1])));
  if (!(escala > 1)) return null;
  return {
    cx: mediana(conHombros.map(([a, b]) => (a[0] + b[0]) / 2)),
    cy: mediana(conHombros.map(([a, b]) => (a[1] + b[1]) / 2)),
    escala,
  };
}

const enReposo = (m: Mano, ref: Referencia) => (m[0]![1] - ref.cy) / ref.escala >= UMBRAL_REPOSO;
const distancia = (a: Punto, b: Punto) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/**
 * Sigue las dos manos a lo largo de la secuencia y devuelve, por cuadro, [dominante, otra].
 * Al inicio se supone una mano a cada lado del cuerpo, a la altura de la cintura.
 */
export function asignarManos(cuadros: readonly CuadroPuntos[], ref: Referencia): Par[] {
  const previa: [Punto, Punto] = [
    [ref.cx - ref.escala * 0.5, ref.cy + ref.escala],
    [ref.cx + ref.escala * 0.5, ref.cy + ref.escala],
  ];
  const pares = cuadros.map((c): Par => {
    const [a, b] = c.manos;
    let par: Par = [undefined, undefined];
    if (a && b) {
      const directo = distancia(a[0]!, previa[0]) + distancia(b[0]!, previa[1]);
      const cruzado = distancia(b[0]!, previa[0]) + distancia(a[0]!, previa[1]);
      par = directo <= cruzado ? [a, b] : [b, a];
    } else if (a) {
      par = distancia(a[0]!, previa[0]) <= distancia(a[0]!, previa[1]) ? [a, undefined] : [undefined, a];
    }
    if (par[0]) previa[0] = par[0][0]!;
    if (par[1]) previa[1] = par[1][0]!;
    return par;
  });
  const activa = (i: 0 | 1) => pares.filter((p) => p[i] && !enReposo(p[i], ref)).length;
  return activa(1) > activa(0) ? pares.map(([x, y]): Par => [y, x]) : pares;
}

function valoresMano(mano: Mano | undefined, ref: Referencia, pesos: Pesos): number[] {
  if (!mano) return new Array<number>(VALORES_MANO).fill(0);
  const [mx, my] = mano[0]!;
  const nudillo = mano[9]!;
  const palma = Math.max(Math.hypot(nudillo[0] - mx, nudillo[1] - my), 1e-6);
  const v = [pesos.presencia, (pesos.posicion * (mx - ref.cx)) / ref.escala, (pesos.posicion * (my - ref.cy)) / ref.escala];
  for (let i = 1; i < PUNTOS_MANO; i++) {
    const p = mano[i]!;
    v.push((pesos.forma * (p[0] - mx)) / palma, (pesos.forma * (p[1] - my)) / palma);
  }
  return v;
}

/** Remuestrea por tiempo a `pasos` vectores con interpolación lineal. */
export function remuestrear(tiempos: readonly number[], vectores: readonly number[][], pasos = PASOS): number[][] {
  const n = vectores.length;
  if (n === 0) return [];
  if (n === 1) return Array.from({ length: pasos }, () => [...vectores[0]!]);
  const t0 = tiempos[0]!;
  const t1 = tiempos[n - 1]!;
  const salida: number[][] = [];
  let j = 0;
  for (let k = 0; k < pasos; k++) {
    const t = t1 > t0 ? t0 + ((t1 - t0) * k) / (pasos - 1) : t0;
    while (j < n - 2 && tiempos[j + 1]! < t) j++;
    const ta = tiempos[j]!;
    const tb = tiempos[j + 1]!;
    const f = tb > ta ? Math.min(Math.max((t - ta) / (tb - ta), 0), 1) : 0;
    const va = vectores[j]!;
    const vb = vectores[j + 1]!;
    salida.push(va.map((x, i) => x + (vb[i]! - x) * f));
  }
  return salida;
}

/** De una secuencia de puntos a los vectores que compara el clasificador. */
export function caracteristicas(s: SecuenciaPuntos, pasos = PASOS, pesos: Pesos = PESOS): ResultadoCaracteristicas {
  const cuadros = [...s.cuadros].sort((a, b) => a.t - b.t);
  const conManos = cuadros.filter((c) => c.manos.length > 0).length;
  if (conManos < MINIMO_CUADROS_CON_MANOS) return { ok: false, motivo: 'sin-manos', cuadrosConManos: conManos };
  const ref = referenciaDe(s);
  if (!ref) return { ok: false, motivo: 'sin-cuerpo', cuadrosConManos: conManos };
  const pares = asignarManos(cuadros, ref);
  // Tramo activo: del primer al último cuadro con alguna muñeca fuera de la posición de reposo.
  const activos = pares.flatMap((p, i) => (p.some((m) => m && !enReposo(m, ref)) ? [i] : []));
  if (activos.length < MINIMO_CUADROS_CON_MANOS) return { ok: false, motivo: 'sin-manos', cuadrosConManos: activos.length };
  const inicio = activos[0]!;
  const fin = activos[activos.length - 1]!;
  return {
    ok: true,
    vectores: remuestrear(
      cuadros.slice(inicio, fin + 1).map((c) => c.t),
      pares.slice(inicio, fin + 1).map(([d, o]) => [...valoresMano(d, ref, pesos), ...valoresMano(o, ref, pesos)]),
      pasos,
    ),
    cuadrosConManos: activos.length,
  };
}
