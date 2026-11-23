import type { Catalogo, Mensaje } from './tipos';

/**
 * Preguntas que se ofrecen al médico sin que tenga que buscar (D55). Solo son sugerencias:
 * elegir una abre la misma revisión antes de enviar (RF-02) y respeta la política de recursos.
 */
export interface Sugerencia {
  entradaId: string;
  /** Síntomas del paciente que la recomiendan: por mensaje, del más reciente al más antiguo; dentro de un mensaje, en su orden. Vacío en las generales. */
  porSintomas: string[];
}

export interface Sugerencias {
  porSintomas: Sugerencia[];
  generales: Sugerencia[];
}

/**
 * Junta las `recomendadas` de los síntomas que el paciente confirmó en la sesión, empezando por el
 * mensaje más reciente, sin repetir; quita las preguntas que el médico ya envió. Las generales son
 * `preguntasGenerales` menos las ya enviadas y las que ya aparecen por un síntoma.
 */
export function sugerencias(catalogo: Catalogo, mensajes: readonly Mensaje[]): Sugerencias {
  const porId = new Map(catalogo.entradas.map((e) => [e.id, e]));
  const enviadas = new Set(mensajes.flatMap((m) => (m.origen === 'medico' ? [m.entradaId] : [])));
  const acumuladas = new Map<string, Sugerencia>();

  for (const m of [...mensajes].reverse()) {
    if (m.origen !== 'paciente') continue;
    for (const item of m.items) {
      for (const preguntaId of porId.get(item.entradaId)?.recomendadas ?? []) {
        if (enviadas.has(preguntaId)) continue;
        const previa = acumuladas.get(preguntaId);
        if (!previa) acumuladas.set(preguntaId, { entradaId: preguntaId, porSintomas: [item.entradaId] });
        else if (!previa.porSintomas.includes(item.entradaId)) previa.porSintomas.push(item.entradaId);
      }
    }
  }

  return {
    porSintomas: [...acumuladas.values()],
    generales: catalogo.preguntasGenerales
      .filter((id) => !enviadas.has(id) && !acumuladas.has(id))
      .map((entradaId) => ({ entradaId, porSintomas: [] })),
  };
}
