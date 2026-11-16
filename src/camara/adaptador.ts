/**
 * Adaptador de cámara (etapa C). La vista del paciente depende de esta interfaz y nunca llama
 * a getUserMedia directamente. Así se podrá cambiar a la cámara de la tableta Android
 * (etapa E, Capacitor) sin tocar la interfaz.
 *
 * Reglas que cumple toda implementación:
 * - Indica cuándo la cámara está activa (RF-17) y avisa cada cambio de estado.
 * - `listo()` finaliza el clip, apaga la cámara y entrega el clip para reconocimiento.
 * - `cancelar()` detiene la adquisición, apaga la cámara y descarta el clip SIN entregarlo (RF-17).
 * - `liberar()` apaga la cámara y descarta todo; se llama al cerrar la sesión y al salir (RF-18).
 * - Los clips viven solo en memoria: nunca se escriben a disco, ni se envían a otro equipo,
 *   ni se usan para entrenamiento o telemetría (TECHSTAR_MVP.md §5).
 */
export type EstadoCamara =
  /** Sin usar la cámara (estado inicial y después de «Listo», «Cancelar» o liberar). */
  | 'apagada'
  /** Pidiendo permiso o encendiendo la cámara. */
  | 'solicitando'
  /** La cámara está encendida y grabando el clip. */
  | 'activa'
  /** La persona o el sistema negaron el permiso. */
  | 'denegada'
  /** No hay cámara en este equipo o este entorno no permite usarla. */
  | 'no-disponible'
  /** Otra aplicación está usando la cámara. */
  | 'ocupada'
  /** La cámara dejó de responder o se desconectó. */
  | 'error';

export interface ClipTemporal {
  capturaId: string;
  /** Datos en memoria; nunca se escriben a disco ni se usan para entrenamiento. */
  datos: Blob;
  duracionMs: number;
}

export interface AdaptadorCamara {
  readonly estado: EstadoCamara;
  /** Duración máxima de un clip. Al llegar, la grabación se detiene y se espera «Listo» o «Cancelar». */
  readonly duracionMaximaMs: number;
  /** Avisa cada cambio de estado. Devuelve cómo dejar de escuchar. */
  alCambiar(fn: (estado: EstadoCamara) => void): () => void;
  /** Enciende la cámara y empieza un clip asociado a `capturaId`. */
  iniciar(capturaId: string): Promise<EstadoCamara>;
  /**
   * Muestra la imagen en vivo en un `<video>` de la vista sin entregarle la cámara.
   * Devuelve cómo desconectarla.
   */
  mostrarEn(video: HTMLVideoElement): () => void;
  /** Termina el clip y apaga la cámara. `null` si no había clip o se canceló mientras tanto. */
  listo(): Promise<ClipTemporal | null>;
  cancelar(): void;
  liberar(): void;
}

/** Cuando el entorno no ofrece cámara (p. ej. las pruebas automáticas). */
export function camaraNoDisponible(): AdaptadorCamara {
  return {
    estado: 'no-disponible',
    duracionMaximaMs: 0,
    alCambiar: () => () => {},
    iniciar: async () => 'no-disponible',
    mostrarEn: () => () => {},
    listo: async () => null,
    cancelar: () => {},
    liberar: () => {},
  };
}

/** El estado indica un problema que impide capturar. */
export function esFalloCamara(estado: EstadoCamara): estado is 'denegada' | 'no-disponible' | 'ocupada' | 'error' {
  return estado === 'denegada' || estado === 'no-disponible' || estado === 'ocupada' || estado === 'error';
}
