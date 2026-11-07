import { intensidadValida } from './mensajes';
import type { Seleccion } from './tipos';

/**
 * Turno del paciente: borrador local que NUNCA sale del equipo del paciente
 * hasta que se confirma (RF-04). Estados explícitos según TECHSTAR_MVP.md §5.
 *
 * Etapa A usa: seleccion → revision → enviando → seleccion.
 * Etapa C usará: capturando → procesando → revision | no-reconocido.
 */
export type EstadoTurno =
  | { fase: 'seleccion'; selecciones: Seleccion[] }
  | { fase: 'revision'; via: 'catalogo' | 'camara'; selecciones: Seleccion[]; envioId: string }
  | { fase: 'enviando'; via: 'catalogo' | 'camara'; selecciones: Seleccion[]; envioId: string }
  | { fase: 'capturando'; capturaId: string }
  | { fase: 'procesando'; capturaId: string }
  | { fase: 'no-reconocido'; capturaId: string };

export type AccionTurno =
  | { tipo: 'alternarSeleccion'; entradaId: string }
  | { tipo: 'fijarIntensidad'; entradaId: string; intensidad: number | undefined; envioId?: string }
  | { tipo: 'revisar'; envioId: string }
  | { tipo: 'modificar' }
  | { tipo: 'descartar' }
  | { tipo: 'confirmarIniciado' }
  | { tipo: 'confirmacionFallida' }
  | { tipo: 'confirmado' }
  // Etapa C (cámara). La lógica ya está probada; la interfaz aún no la usa.
  | { tipo: 'iniciarCaptura'; capturaId: string }
  | { tipo: 'cancelarCaptura' }
  | { tipo: 'capturaLista' }
  | { tipo: 'resultadoReconocimiento'; capturaId: string; entradaId: string | null; envioId: string }
  | { tipo: 'irAlCatalogo' };

export const turnoInicial: EstadoTurno = { fase: 'seleccion', selecciones: [] };

export function reducirTurno(estado: EstadoTurno, accion: AccionTurno): EstadoTurno {
  switch (accion.tipo) {
    case 'alternarSeleccion': {
      if (estado.fase !== 'seleccion') return estado;
      const ya = estado.selecciones.some((s) => s.entradaId === accion.entradaId);
      return {
        fase: 'seleccion',
        selecciones: ya
          ? estado.selecciones.filter((s) => s.entradaId !== accion.entradaId)
          : [...estado.selecciones, { entradaId: accion.entradaId }],
      };
    }
    case 'fijarIntensidad': {
      // Como en el prototipo, la intensidad se indica en la revisión (o antes, en la selección).
      // Mientras se envía no puede cambiar. Lo que se ve al confirmar es lo que se envía.
      if (estado.fase !== 'seleccion' && estado.fase !== 'revision') return estado;
      if (accion.intensidad !== undefined && !intensidadValida(accion.intensidad)) return estado;
      const selecciones = estado.selecciones.map((s) => {
        if (s.entradaId !== accion.entradaId) return s;
        // Quitar la intensidad la deja sin valor, no en cero (RF-19).
        return accion.intensidad === undefined ? { entradaId: s.entradaId } : { ...s, intensidad: accion.intensidad };
      });
      if (estado.fase === 'seleccion') return { fase: 'seleccion', selecciones };
      // En la revisión, un contenido distinto es otro envío: necesita un envioId nuevo.
      // Así un reintento nunca devuelve como «enviado» un contenido anterior.
      if (!accion.envioId) return estado;
      return { ...estado, selecciones, envioId: accion.envioId };
    }
    case 'revisar':
      if (estado.fase !== 'seleccion' || estado.selecciones.length === 0) return estado;
      return { fase: 'revision', via: 'catalogo', selecciones: estado.selecciones, envioId: accion.envioId };

    case 'modificar':
      // Regresa conservando la selección para corregirla (RF-13).
      if (estado.fase !== 'revision' || estado.via !== 'catalogo') return estado;
      return { fase: 'seleccion', selecciones: estado.selecciones };

    case 'descartar':
      // El borrador se elimina sin enviarse (RF-13).
      if (estado.fase !== 'revision') return estado;
      return turnoInicial;

    case 'confirmarIniciado':
      if (estado.fase !== 'revision') return estado;
      return { ...estado, fase: 'enviando' };

    case 'confirmacionFallida':
      // Mismo envioId: reintentar no puede duplicar (RF-07).
      if (estado.fase !== 'enviando') return estado;
      return { ...estado, fase: 'revision' };

    case 'confirmado':
      if (estado.fase !== 'enviando') return estado;
      return turnoInicial;

    case 'iniciarCaptura':
      if (estado.fase === 'seleccion' && estado.selecciones.length === 0) {
        return { fase: 'capturando', capturaId: accion.capturaId };
      }
      if (estado.fase === 'no-reconocido') return { fase: 'capturando', capturaId: accion.capturaId };
      return estado;

    case 'cancelarCaptura':
      // Detiene y descarta sin pedir reconocimiento; el catálogo sigue disponible (RF-17).
      if (estado.fase !== 'capturando') return estado;
      return turnoInicial;

    case 'capturaLista':
      if (estado.fase !== 'capturando') return estado;
      return { fase: 'procesando', capturaId: estado.capturaId };

    case 'resultadoReconocimiento':
      // Resultados tardíos o de otra captura se descartan.
      if (estado.fase !== 'procesando' || estado.capturaId !== accion.capturaId) return estado;
      if (accion.entradaId === null) return { fase: 'no-reconocido', capturaId: estado.capturaId };
      return {
        fase: 'revision',
        via: 'camara',
        selecciones: [{ entradaId: accion.entradaId }],
        envioId: accion.envioId,
      };

    case 'irAlCatalogo':
      if (estado.fase !== 'no-reconocido') return estado;
      return turnoInicial;
  }
}
