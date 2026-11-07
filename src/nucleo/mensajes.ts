import { buscarEntrada } from './recursos';
import type { Catalogo, ItemMensajePaciente, Seleccion } from './tipos';

export const INTENSIDAD_MIN = 1;
export const INTENSIDAD_MAX = 10;

export function intensidadValida(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= INTENSIDAD_MIN && n <= INTENSIDAD_MAX;
}

/** Texto en español de un elemento, igual en la revisión del paciente y en la vista del médico. */
export function textoDeItem(item: Pick<ItemMensajePaciente, 'texto' | 'intensidad'>): string {
  return item.intensidad === undefined
    ? item.texto
    : `${item.texto} Intensidad del dolor: ${item.intensidad} de 10.`;
}

/**
 * Construye los elementos del mensaje a partir de las selecciones.
 * La intensidad solo se copia si fue elegida: nunca se asigna un valor por defecto (RF-19).
 */
export function componerItems(catalogo: Catalogo, selecciones: readonly Seleccion[]): ItemMensajePaciente[] {
  return selecciones.map((s) => {
    const entrada = buscarEntrada(catalogo, s.entradaId);
    const item: ItemMensajePaciente = { entradaId: s.entradaId, texto: entrada?.texto ?? '' };
    if (s.intensidad !== undefined) item.intensidad = s.intensidad;
    return item;
  });
}

export function textosRevisados(catalogo: Catalogo, selecciones: readonly Seleccion[]): string[] {
  return componerItems(catalogo, selecciones).map(textoDeItem);
}
