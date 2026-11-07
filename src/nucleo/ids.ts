/** Identificadores de sesión, mensaje, envío y captura. */
export type GeneradorId = (prefijo: string) => string;

export const generarId: GeneradorId = (prefijo) => `${prefijo}-${crypto.randomUUID()}`;

/** Versión corta para mostrar en pantalla (no sirve como identificador). */
export function idCorto(id: string): string {
  const partes = id.split('-');
  return `${partes[0]}·${(partes[1] ?? '').slice(0, 4).toUpperCase()}`;
}
