/**
 * Puntos del cuerpo extraídos de un video con MediaPipe (reconocedor experimental, etapa C).
 *
 * Solo se conservan los puntos que usa el clasificador: los dos hombros (pose) y los 21 puntos de
 * cada mano, en **píxeles** del video. No se guarda la imagen. En la consulta estos puntos viven
 * solo en memoria mientras se interpreta el turno (RF-18); nunca se usan para entrenar.
 */
export type Punto = readonly [x: number, y: number];

export interface CuadroPuntos {
  /** Tiempo del cuadro dentro del video, en segundos. */
  t: number;
  /** Hombros de la pose (puntos 11 y 12 de MediaPipe) o `null` si no se detectó el cuerpo. */
  hombros: readonly [Punto, Punto] | null;
  /** De 0 a 2 manos, cada una con 21 puntos (0 = muñeca, 9 = nudillo del dedo medio). */
  manos: readonly (readonly Punto[])[];
}

export interface SecuenciaPuntos {
  ancho: number;
  alto: number;
  cuadros: CuadroPuntos[];
}

/** Punto normalizado de MediaPipe (0 a 1 en cada eje). */
export interface PuntoNormalizado {
  x: number;
  y: number;
}

export const PUNTOS_MANO = 21;
const HOMBRO_IZQ = 11;
const HOMBRO_DER = 12;

/** Convierte un resultado de MediaPipe (coordenadas 0–1) a un cuadro en píxeles. */
export function cuadroDesdeMediaPipe(
  t: number,
  ancho: number,
  alto: number,
  poses: readonly (readonly PuntoNormalizado[])[],
  manos: readonly (readonly PuntoNormalizado[])[],
): CuadroPuntos {
  const px = (p: PuntoNormalizado): Punto => [p.x * ancho, p.y * alto];
  const pose = poses[0];
  const izq = pose?.[HOMBRO_IZQ];
  const der = pose?.[HOMBRO_DER];
  return {
    t,
    hombros: izq && der ? [px(izq), px(der)] : null,
    manos: manos.filter((m) => m.length === PUNTOS_MANO).slice(0, 2).map((m) => m.map(px)),
  };
}

/**
 * Imagen en espejo (x → ancho − x). Se agregan plantillas en espejo para aceptar a quien seña con
 * la otra mano dominante o una cámara que voltea la imagen.
 */
export function espejar(s: SecuenciaPuntos): SecuenciaPuntos {
  const e = (p: Punto): Punto => [s.ancho - p[0], p[1]];
  return {
    ancho: s.ancho,
    alto: s.alto,
    cuadros: s.cuadros.map((c) => ({
      t: c.t,
      hombros: c.hombros ? [e(c.hombros[1]), e(c.hombros[0])] : null,
      manos: c.manos.map((m) => m.map(e)),
    })),
  };
}

/** Redondea a décimas de píxel y milésimas de segundo (archivos más chicos, sin perder nada útil). */
export function redondear(s: SecuenciaPuntos): SecuenciaPuntos {
  const r = (v: number, d: number) => Math.round(v * d) / d;
  const p = (q: Punto): Punto => [r(q[0], 10), r(q[1], 10)];
  return {
    ancho: s.ancho,
    alto: s.alto,
    cuadros: s.cuadros.map((c) => ({
      t: r(c.t, 1000),
      hombros: c.hombros ? [p(c.hombros[0]), p(c.hombros[1])] : null,
      manos: c.manos.map((m) => m.map(p)),
    })),
  };
}

/** Comprueba la forma de una secuencia leída de un archivo. */
export function esSecuenciaPuntos(v: unknown): v is SecuenciaPuntos {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<SecuenciaPuntos>;
  const punto = (p: unknown) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === 'number' && Number.isFinite(n));
  return (
    typeof s.ancho === 'number' &&
    typeof s.alto === 'number' &&
    Array.isArray(s.cuadros) &&
    s.cuadros.every(
      (c: Partial<CuadroPuntos>) =>
        typeof c.t === 'number' &&
        (c.hombros === null || (Array.isArray(c.hombros) && c.hombros.length === 2 && c.hombros.every(punto))) &&
        Array.isArray(c.manos) &&
        c.manos.length <= 2 &&
        c.manos.every((m) => Array.isArray(m) && m.length === PUNTOS_MANO && m.every(punto)),
    )
  );
}
