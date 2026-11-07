import type {
  Catalogo,
  ClaveSistema,
  Disponibilidad,
  EntradaCatalogo,
  PoliticaRecursos,
} from './tipos';

/**
 * Decide si un recurso puede presentarse y si la entrada puede enviarse.
 * Regla del encargo: en el flujo de producto solo pasan recursos validados.
 * Nunca se sustituye un recurso faltante por otro (RI-01, RF-02).
 */
export function resolverRecurso(
  catalogo: Catalogo,
  recursoId: string | undefined,
  politica: PoliticaRecursos,
): Disponibilidad {
  if (!recursoId) return { estado: 'bloqueado', motivo: 'sin-recurso' };
  const recurso = catalogo.recursos.find((r) => r.id === recursoId);
  if (!recurso) return { estado: 'bloqueado', motivo: 'sin-recurso' };
  if (recurso.estado === 'validado') return { estado: 'validado', recurso };
  if (politica === 'desarrollo') return { estado: 'prueba', recurso };
  return { estado: 'bloqueado', motivo: 'recurso-no-validado', recurso };
}

export function recursoDeEntrada(
  catalogo: Catalogo,
  entrada: EntradaCatalogo,
  politica: PoliticaRecursos,
): Disponibilidad {
  return resolverRecurso(catalogo, entrada.recursoId, politica);
}

export function recursoDeSistema(
  catalogo: Catalogo,
  clave: ClaveSistema,
  politica: PoliticaRecursos,
): Disponibilidad {
  return resolverRecurso(catalogo, catalogo.recursosSistema[clave], politica);
}

export function sePuedeEnviar(d: Disponibilidad): boolean {
  return d.estado !== 'bloqueado';
}

export function buscarEntrada(catalogo: Catalogo, id: string): EntradaCatalogo | undefined {
  return catalogo.entradas.find((e) => e.id === id);
}
