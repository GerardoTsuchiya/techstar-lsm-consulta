/**
 * Qué reconocedor usa el modo desarrollo: el simulador (una persona elige el resultado) o el
 * experimental (MediaPipe + DTW, no validado). En el flujo de producto no hay ninguno (D33).
 * Sin dependencias: también lo lee el proceso principal de Electron.
 */
export type TipoReconocedor = 'simulado' | 'experimental';

/** Ante un valor desconocido, el simulador (no presenta nada como reconocimiento real). */
export function leerTipoReconocedor(valor: string | null | undefined): TipoReconocedor {
  return valor === 'experimental' ? 'experimental' : 'simulado';
}
