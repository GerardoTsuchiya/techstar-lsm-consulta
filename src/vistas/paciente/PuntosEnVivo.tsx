import { useEffect, useRef, useState, type RefObject } from 'react';
import type { DetectorEnVivo, ReconocedorExperimental } from '../../reconocimiento/experimental/reconocedorExperimental';
import type { CuadroPuntos, Punto } from '../../reconocimiento/experimental/puntos';

/**
 * ⚠ Solo modo desarrollo, con el reconocedor EXPERIMENTAL. Dibuja sobre la cámara en vivo los puntos que
 * analiza el reconocedor (21 por mano y los dos hombros), para que quien dirige la prueba vea qué se toma en
 * cuenta. Los puntos se calculan en el equipo, se dibujan y se descartan: no se guardan ni deciden nada (la
 * decisión sale del clip completo al pulsar «Listo»).
 */

/** Uniones de los 21 puntos de una mano (numeración de MediaPipe: 0 = muñeca, 4 = punta del pulgar…). */
export const CONEXIONES_MANO: readonly (readonly [number, number])[] = [
  [0, 1], [1, 2], [2, 3], [3, 4], // pulgar
  [0, 5], [5, 6], [6, 7], [7, 8], // índice
  [5, 9], [9, 10], [10, 11], [11, 12], // medio
  [9, 13], [13, 14], [14, 15], [15, 16], // anular
  [13, 17], [17, 18], [18, 19], [19, 20], // meñique
  [0, 17], // base de la palma
];

/** Colores fijos (el lienzo no lee variables CSS): uno por mano y otro para los hombros. */
const COLOR_MANOS = ['#5ee6a8', '#ffc857'] as const;
const COLOR_HOMBROS = '#8ecdf7';
const CONTORNO = 'rgba(10, 14, 11, 0.65)';

/** Unas 20 detecciones por segundo: se ve fluido y deja tiempo libre a la grabación del clip. */
const INTERVALO_MS = 50;

/** Dibuja un cuadro de puntos en un lienzo del mismo tamaño que el video (coordenadas en píxeles). */
export function dibujarPuntos(ctx: CanvasRenderingContext2D, ancho: number, alto: number, cuadro: CuadroPuntos | null) {
  ctx.clearRect(0, 0, ancho, alto);
  if (!cuadro) return;
  const grosor = Math.max(2, ancho / 180);
  const radio = Math.max(2, ancho / 170);

  const segmento = (a: Punto, b: Punto, color: string) => {
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = grosor + 2;
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = grosor;
    ctx.stroke();
  };
  const punto = (p: Punto, color: string, r = radio) => {
    ctx.beginPath();
    ctx.arc(p[0], p[1], r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = CONTORNO;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  if (cuadro.hombros) {
    const [izq, der] = cuadro.hombros;
    segmento(izq, der, COLOR_HOMBROS);
    punto(izq, COLOR_HOMBROS, radio * 1.6);
    punto(der, COLOR_HOMBROS, radio * 1.6);
  }
  cuadro.manos.forEach((mano, i) => {
    const color = i === 0 ? COLOR_MANOS[0] : COLOR_MANOS[1];
    for (const [a, b] of CONEXIONES_MANO) {
      const pa = mano[a];
      const pb = mano[b];
      if (pa && pb) segmento(pa, pb, color);
    }
    mano.forEach((p, j) => punto(p, color, j === 0 ? radio * 1.4 : radio));
  });
}

/** Texto de lo que se ve en el cuadro, p. ej. «Manos: 2 · Hombros: sí». */
export function resumenPuntos(cuadro: CuadroPuntos | null): string {
  if (!cuadro) return 'Buscando manos y hombros…';
  return `Manos: ${cuadro.manos.length} · Hombros: ${cuadro.hombros ? 'sí' : 'no'}`;
}

/**
 * Detecta en vivo y dibuja en `lienzo` (encima del video). Devuelve el resumen de lo que se ve, para mostrarlo
 * FUERA de la imagen (un texto encima tapaba los puntos, p. ej. la línea de los hombros).
 */
export function usePuntosEnVivo(
  video: RefObject<HTMLVideoElement | null>,
  reconocedor: ReconocedorExperimental | null,
  activa: boolean,
): { lienzo: RefObject<HTMLCanvasElement | null>; resumen: string } {
  const lienzo = useRef<HTMLCanvasElement>(null);
  const [detector, setDetector] = useState<DetectorEnVivo | null | 'cargando'>('cargando');
  const [resumen, setResumen] = useState(() => resumenPuntos(null));

  useEffect(() => {
    if (!reconocedor) return;
    let vigente = true;
    void reconocedor.detectorEnVivo().then((d) => {
      if (vigente) setDetector(() => d);
    });
    return () => {
      vigente = false;
    };
  }, [reconocedor]);

  useEffect(() => {
    if (!activa || typeof detector !== 'function') return;
    let id = 0;
    let ultimo = -Infinity;
    let ultimoTiempo = -1;
    let ctx: CanvasRenderingContext2D | null = null;
    const paso = (ahora: number) => {
      id = requestAnimationFrame(paso);
      const v = video.current;
      const c = lienzo.current;
      if (!v || !c || ahora - ultimo < INTERVALO_MS || v.currentTime === ultimoTiempo) return;
      ultimo = ahora;
      ultimoTiempo = v.currentTime;
      let cuadro: CuadroPuntos | null;
      try {
        cuadro = detector(v);
      } catch {
        cuadro = null;
      }
      if (c.width !== v.videoWidth || c.height !== v.videoHeight) {
        c.width = v.videoWidth;
        c.height = v.videoHeight;
      }
      ctx ??= c.getContext('2d');
      if (ctx) dibujarPuntos(ctx, c.width, c.height, cuadro);
      // React no vuelve a pintar si el texto no cambió.
      setResumen(resumenPuntos(cuadro));
    };
    id = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(id);
      ctx?.clearRect(0, 0, lienzo.current?.width ?? 0, lienzo.current?.height ?? 0);
      setResumen(resumenPuntos(null));
    };
  }, [activa, detector, video]);

  if (detector === null) return { lienzo, resumen: 'No se pudo preparar la detección de puntos.' };
  if (detector === 'cargando') return { lienzo, resumen: 'Preparando la detección…' };
  return { lienzo, resumen };
}

/** Lienzo de los puntos, encima del `<video>` de la captura. Sin textos encima: no tapan los puntos. */
export function LienzoPuntos({ lienzo }: { lienzo: RefObject<HTMLCanvasElement | null> }) {
  return <canvas ref={lienzo} className="puntos-vivo__lienzo" aria-hidden="true" data-puntos-en-vivo="lienzo" />;
}

/** Resumen de lo detectado, DEBAJO de la cámara: así se sabe al momento si no ve las manos (p. ej. por poca luz). */
export function ResumenPuntos({ resumen }: { resumen: string }) {
  return (
    <p className="puntos-vivo__resumen" data-puntos-en-vivo="resumen">
      <span className="puntos-vivo__titulo">Puntos que analiza el reconocedor:</span> {resumen}
    </p>
  );
}
