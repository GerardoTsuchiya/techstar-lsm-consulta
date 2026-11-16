import type { AdaptadorCamara, ClipTemporal, EstadoCamara } from '../camara/adaptador';

/**
 * Cámara FALSA para las pruebas automáticas (jsdom no tiene cámara). Registra cada llamada
 * para comprobar que la vista enciende, termina, cancela y libera como se espera.
 * No se usa en la aplicación.
 */
export class CamaraFalsa implements AdaptadorCamara {
  estado: EstadoCamara = 'apagada';
  readonly duracionMaximaMs = 15_000;
  /** Qué responde `iniciar` (p. ej. 'denegada' para simular el permiso negado). */
  respuestaInicio: EstadoCamara = 'activa';
  readonly llamadas: string[] = [];
  readonly clipsEntregados: ClipTemporal[] = [];
  private capturaId: string | null = null;
  private readonly oyentes = new Set<(e: EstadoCamara) => void>();

  alCambiar(fn: (e: EstadoCamara) => void) {
    this.oyentes.add(fn);
    return () => {
      this.oyentes.delete(fn);
    };
  }

  async iniciar(capturaId: string) {
    this.llamadas.push('iniciar');
    this.fijar('solicitando');
    await Promise.resolve();
    if (this.estado !== 'solicitando') return this.estado; // se canceló mientras tanto
    this.capturaId = this.respuestaInicio === 'activa' ? capturaId : null;
    this.fijar(this.respuestaInicio);
    return this.estado;
  }

  mostrarEn() {
    this.llamadas.push('mostrarEn');
    return () => {};
  }

  async listo() {
    this.llamadas.push('listo');
    if (this.estado !== 'activa' || !this.capturaId) return null;
    const clip: ClipTemporal = { capturaId: this.capturaId, datos: new Blob(['clip-de-prueba']), duracionMs: 2000 };
    this.clipsEntregados.push(clip);
    this.capturaId = null;
    this.fijar('apagada');
    return clip;
  }

  cancelar() {
    this.llamadas.push('cancelar');
    this.capturaId = null;
    this.fijar('apagada');
  }

  liberar() {
    this.llamadas.push('liberar');
    this.capturaId = null;
    this.fijar('apagada');
  }

  /** Simula que la cámara se desconecta durante la captura. */
  desconectar() {
    this.capturaId = null;
    this.fijar('error');
  }

  get encendida() {
    return this.estado === 'activa' || this.estado === 'solicitando';
  }

  private fijar(e: EstadoCamara) {
    this.estado = e;
    for (const fn of [...this.oyentes]) fn(e);
  }
}
