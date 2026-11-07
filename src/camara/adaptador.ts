/**
 * Adaptador de cámara (etapa C). La vista del paciente dependerá de esta interfaz,
 * no de getUserMedia directamente, para poder cambiar a la cámara de la tableta
 * Android (etapa E, Capacitor) sin tocar la interfaz.
 *
 * Reglas que deberá cumplir la implementación real:
 * - Indicar cuándo la cámara está activa (RF-17).
 * - `listo()` finaliza el clip y lo entrega para reconocimiento.
 * - `cancelar()` detiene la adquisición y descarta el clip SIN procesarlo (RF-17).
 * - Los clips viven solo en memoria y se eliminan al cerrar la sesión (RF-18).
 */
export type EstadoCamara = 'apagada' | 'activa' | 'denegada' | 'no-disponible';

export interface ClipTemporal {
  capturaId: string;
  /** Datos en memoria; nunca se escriben a disco ni se usan para entrenamiento. */
  datos: Blob;
}

export interface AdaptadorCamara {
  readonly estado: EstadoCamara;
  iniciar(capturaId: string): Promise<EstadoCamara>;
  listo(): Promise<ClipTemporal | null>;
  cancelar(): void;
  liberar(): void;
}

/** Implementación de la etapa A: no hay cámara todavía. */
export const camaraNoDisponible: AdaptadorCamara = {
  estado: 'no-disponible',
  iniciar: async () => 'no-disponible',
  listo: async () => null,
  cancelar: () => {},
  liberar: () => {},
};
