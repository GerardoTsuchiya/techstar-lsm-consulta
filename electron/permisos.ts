import type { ModoApp } from './argumentos';

/**
 * Permisos de la vista (etapa C). Solo se concede la **cámara con video, sin micrófono**, a la
 * ventana propia con la página empaquetada (`file://`), y solo en los modos que muestran la vista
 * del paciente (paciente y demostración). El modo médico no usa cámara. Todo lo demás se niega
 * (micrófono, pantalla, ubicación, notificaciones…). En Windows y macOS decide además el
 * permiso de cámara del sistema operativo.
 */
export interface SolicitudPermiso {
  modo: ModoApp;
  permiso: string;
  /** La solicitud viene de la ventana de la app (no de otro contenido). */
  ventanaPropia: boolean;
  /** Dirección de la página que lo pide. */
  url: string;
  /** Tipos pedidos: `mediaTypes` (solicitud) o `[mediaType]` (comprobación). */
  tiposMedia: readonly string[] | undefined;
}

const MODOS_CON_CAMARA: ReadonlySet<ModoApp> = new Set<ModoApp>(['paciente', 'demo']);

export function permisoConcedido(s: SolicitudPermiso): boolean {
  return (
    MODOS_CON_CAMARA.has(s.modo) &&
    s.permiso === 'media' &&
    s.ventanaPropia &&
    s.url.startsWith('file://') &&
    Array.isArray(s.tiposMedia) &&
    s.tiposMedia.length > 0 &&
    s.tiposMedia.every((t) => t === 'video')
  );
}
