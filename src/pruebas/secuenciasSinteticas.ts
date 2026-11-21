import { PUNTOS_MANO, type CuadroPuntos, type Punto, type SecuenciaPuntos } from '../reconocimiento/experimental/puntos';

/** Secuencias de puntos SINTÉTICAS para las pruebas del reconocedor experimental (no son de nadie). */

/** Mano abierta con la muñeca en (x, y) y palma de `palma` píxeles. */
export function mano(x: number, y: number, palma = 40, abierta = 1): Punto[] {
  return Array.from({ length: PUNTOS_MANO }, (_, i): Punto => {
    if (i === 0) return [x, y];
    const dedo = Math.floor((i - 1) / 4);
    const articulacion = ((i - 1) % 4) + 1;
    return [x + (dedo - 2) * palma * 0.3, y - palma * (0.5 + 0.25 * articulacion * abierta)];
  });
}

/** Secuencia de 2 s a 15 cuadros/s; `trayectoria` da la muñeca en función de f ∈ [0, 1]. */
export function secuencia(
  trayectoria: (f: number) => [number, number],
  opciones: { ancho?: number; alto?: number; escala?: number; desplazamiento?: [number, number]; abierta?: number; sinManosAlInicio?: number } = {},
): SecuenciaPuntos {
  const { ancho = 640, alto = 480, escala = 1, desplazamiento = [0, 0], abierta = 1, sinManosAlInicio = 0 } = opciones;
  const p = (x: number, y: number): Punto => [desplazamiento[0] + x * escala, desplazamiento[1] + y * escala];
  const cuadros: CuadroPuntos[] = [];
  for (let k = 0; k < 30; k++) {
    const f = k / 29;
    const [x, y] = trayectoria(f);
    cuadros.push({
      t: k / 15,
      hombros: [p(220, 300), p(420, 300)],
      manos: k < sinManosAlInicio ? [] : [mano(x, y, 40, abierta).map(([a, b]) => p(a, b))],
    });
  }
  return { ancho, alto, cuadros };
}

export const circulo = (f: number): [number, number] => [260 + 40 * Math.cos(2 * Math.PI * f), 180 + 40 * Math.sin(2 * Math.PI * f)];
export const linea = (f: number): [number, number] => [200 + 60 * f, 360 - 200 * f];
export const quieta = (): [number, number] => [300, 420];
