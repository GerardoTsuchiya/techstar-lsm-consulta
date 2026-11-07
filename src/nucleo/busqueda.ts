import type { EntradaCatalogo, TipoEntrada } from './tipos';

/**
 * Normaliza para comparar sin distinguir mayúsculas ni tildes (RF-14).
 * Se conserva la «ñ» porque cambia la palabra (año ≠ ano).
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/ñ/g, 'ñ')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca entradas cuyo término contiene el texto buscado.
 * Devuelve `null` si la búsqueda está vacía: no se ejecuta la consulta (RF-14).
 * Un arreglo vacío significa «Sin resultados».
 */
export function buscarPorTermino(
  entradas: readonly EntradaCatalogo[],
  consulta: string,
  tipos: readonly TipoEntrada[],
): EntradaCatalogo[] | null {
  const q = normalizar(consulta);
  if (q === '') return null;
  return entradas.filter((e) => tipos.includes(e.tipo) && normalizar(e.termino).includes(q));
}
