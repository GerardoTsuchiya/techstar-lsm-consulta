import type { ClipTemporal } from '../camara/adaptador';
import type { Catalogo, PoliticaRecursos } from '../nucleo/tipos';
import { ReconocedorSimulado } from './reconocedorSimulado';

/**
 * Contrato del reconocedor de LSM (etapa C). La vista del paciente solo conoce esta interfaz:
 * el modelo real (pendiente: vocabulario acordado y muestras autorizadas, TECHSTAR_MVP.md §6)
 * se conectará aquí sin cambiar la interfaz ni las reglas de sesión.
 *
 * Reglas para cualquier implementación:
 * - Solo produce un **candidato**: la persona lo revisa y decide si lo confirma (RF-01, RF-03).
 * - Ante una expresión fuera de su vocabulario responde `desconocido`; nunca adivina la entrada
 *   más parecida (RF-05).
 * - El clip es solo para interpretar este turno: no lo guarda, no lo envía a otro equipo sin un
 *   canal aprobado y no lo usa para entrenamiento ni telemetría (TECHSTAR_MVP.md §5).
 * - Respeta `senal`: si se cancela o se cierra la sesión, deja de procesar y no devuelve nada útil.
 */
export type ResultadoReconocimiento =
  | { tipo: 'reconocido'; entradaId: string }
  | { tipo: 'desconocido' };

export interface Reconocedor {
  /** Nombre que se muestra en modo desarrollo y se registra en la documentación. */
  readonly nombre: string;
  /**
   * `true` = NO reconoce LSM. Lo decide una persona para probar la interfaz.
   * Solo puede existir con la política `desarrollo` y la pantalla lo marca siempre.
   */
  readonly simulado: boolean;
  /** Entradas que el reconocedor cubre de verdad (puede ser menos que el catálogo, §6.3). */
  readonly vocabulario: readonly string[];
  reconocer(clip: ClipTemporal, senal: AbortSignal): Promise<ResultadoReconocimiento>;
}

/** Entradas que el paciente puede expresar (las mismas que su catálogo). */
export function entradasDelPaciente(catalogo: Catalogo): string[] {
  return catalogo.entradas.filter((e) => e.tipo === 'sintoma' || e.tipo === 'respuesta-paciente').map((e) => e.id);
}

export type FabricaReconocedor = (politica: PoliticaRecursos, catalogo: Catalogo) => Reconocedor | null;

/**
 * Reconocedor que corresponde a la política de la sesión.
 * - `desarrollo`: el simulador (NO es reconocimiento real), marcado en pantalla.
 * - `producto`: el modelo real. Todavía no existe, así que devuelve `null` y la captura queda
 *   deshabilitada con su explicación. El simulador **nunca** está disponible en el flujo de producto.
 */
export const reconocedorPorPolitica: FabricaReconocedor = (politica, catalogo) =>
  politica === 'desarrollo' ? new ReconocedorSimulado(politica, entradasDelPaciente(catalogo)) : null;
