import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearCamaraNavegador, estadoDeError, RESTRICCIONES_CAMARA } from './camaraNavegador';

/**
 * Pruebas del adaptador real con getUserMedia y MediaRecorder simulados (jsdom no tiene cámara).
 * La prueba con la cámara de la laptop está registrada en Docs/ESTADO_ACTUAL.md.
 */

class PistaFalsa {
  detenida = false;
  onended: (() => void) | null = null;
  stop() {
    this.detenida = true;
  }
}

class FlujoFalso {
  pistas = [new PistaFalsa()];
  getTracks() {
    return this.pistas;
  }
  getVideoTracks() {
    return this.pistas;
  }
}

class GrabadoraFalsa {
  static ultima: GrabadoraFalsa | null = null;
  static isTypeSupported = (t: string) => t === 'video/webm';
  state: 'inactive' | 'recording' = 'inactive';
  mimeType = 'video/webm';
  ondataavailable: ((ev: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(
    public flujo: FlujoFalso,
    public opciones?: { mimeType?: string },
  ) {
    GrabadoraFalsa.ultima = this;
  }
  start() {
    this.state = 'recording';
  }
  emitir(texto: string) {
    this.ondataavailable?.({ data: new Blob([texto]) });
  }
  stop() {
    this.state = 'inactive';
    queueMicrotask(() => {
      this.ondataavailable?.({ data: new Blob(['fin']) });
      this.onstop?.();
    });
  }
}

const errorConNombre = (name: string) => Object.assign(new Error(name), { name });

function preparar(getUserMedia: (r: MediaStreamConstraints) => Promise<unknown>) {
  const pedir = vi.fn(getUserMedia);
  let t = 0;
  const camara = crearCamaraNavegador({
    medios: { getUserMedia: pedir as unknown as MediaDevices['getUserMedia'] },
    Grabadora: GrabadoraFalsa as unknown as typeof MediaRecorder,
    duracionMaximaMs: 15_000,
    ahora: () => t,
  });
  const estados: string[] = [];
  camara.alCambiar((e) => estados.push(e));
  return { camara, pedir, estados, avanzar: (ms: number) => (t += ms) };
}

beforeEach(() => {
  GrabadoraFalsa.ultima = null;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Cámara del navegador (adaptador real)', () => {
  it('pide solo video, indica «activa», muestra la imagen y «Listo» entrega el clip y apaga la cámara', async () => {
    const flujo = new FlujoFalso();
    const { camara, pedir, estados, avanzar } = preparar(async () => flujo);
    const video = { srcObject: null as unknown, play: vi.fn(async () => {}) } as unknown as HTMLVideoElement;
    camara.mostrarEn(video);

    expect(await camara.iniciar('cap-1')).toBe('activa');
    expect(pedir).toHaveBeenCalledWith(RESTRICCIONES_CAMARA);
    expect(RESTRICCIONES_CAMARA.audio).toBe(false);
    expect(estados).toEqual(['solicitando', 'activa']);
    expect(video.srcObject).toBe(flujo);

    GrabadoraFalsa.ultima!.emitir('a');
    avanzar(3200);
    const clip = await camara.listo();
    expect(clip?.capturaId).toBe('cap-1');
    expect(clip?.duracionMs).toBe(3200);
    expect(await clip!.datos.text()).toBe('afin');
    expect(flujo.pistas[0]!.detenida).toBe(true);
    expect(camara.estado).toBe('apagada');
    expect(video.srcObject).toBeNull();
  });

  it('«Cancelar» detiene la adquisición y descarta el clip sin entregarlo (RF-17)', async () => {
    const flujo = new FlujoFalso();
    const { camara } = preparar(async () => flujo);
    await camara.iniciar('cap-1');
    GrabadoraFalsa.ultima!.emitir('seña');
    const g = GrabadoraFalsa.ultima!;
    camara.cancelar();
    expect(flujo.pistas[0]!.detenida).toBe(true);
    expect(g.state).toBe('inactive');
    expect(g.ondataavailable).toBeNull();
    expect(camara.estado).toBe('apagada');
    expect(await camara.listo()).toBeNull();
  });

  it('cancelar mientras se termina el clip no entrega nada', async () => {
    const { camara } = preparar(async () => new FlujoFalso());
    await camara.iniciar('cap-1');
    const pendiente = camara.listo();
    camara.cancelar();
    expect(await pendiente).toBeNull();
  });

  it('permiso negado, sin cámara u ocupada: no se enciende nada', async () => {
    for (const [nombre, esperado] of [
      ['NotAllowedError', 'denegada'],
      ['NotFoundError', 'no-disponible'],
      ['NotReadableError', 'ocupada'],
      ['RaroError', 'error'],
    ] as const) {
      const { camara } = preparar(async () => {
        throw errorConNombre(nombre);
      });
      expect(await camara.iniciar('cap')).toBe(esperado);
      expect(GrabadoraFalsa.ultima).toBeNull();
    }
    expect(estadoDeError(null)).toBe('error');
  });

  it('sin mediaDevices (p. ej. página sin contexto seguro) informa «no disponible»', async () => {
    const camara = crearCamaraNavegador({ medios: undefined, Grabadora: GrabadoraFalsa as unknown as typeof MediaRecorder });
    expect(await camara.iniciar('cap')).toBe('no-disponible');
  });

  it('si se cancela o se cierra la sesión mientras se pide el permiso, la cámara se apaga en cuanto llega', async () => {
    const flujo = new FlujoFalso();
    let conceder: (f: FlujoFalso) => void = () => {};
    const { camara } = preparar(() => new Promise((r) => (conceder = r)));
    const inicio = camara.iniciar('cap-1');
    expect(camara.estado).toBe('solicitando');
    camara.liberar();
    conceder(flujo);
    expect(await inicio).toBe('apagada');
    expect(flujo.pistas[0]!.detenida).toBe(true);
    expect(GrabadoraFalsa.ultima).toBeNull();
  });

  it('si la cámara se desconecta durante la captura pasa a «error» y se libera', async () => {
    const flujo = new FlujoFalso();
    const { camara } = preparar(async () => flujo);
    await camara.iniciar('cap-1');
    flujo.pistas[0]!.onended?.();
    expect(camara.estado).toBe('error');
    expect(flujo.pistas[0]!.detenida).toBe(true);
  });

  it('al llegar a la duración máxima deja de grabar y espera «Listo»', async () => {
    vi.useFakeTimers();
    const flujo = new FlujoFalso();
    const { camara, avanzar } = preparar(async () => flujo);
    await camara.iniciar('cap-1');
    avanzar(15_000);
    vi.advanceTimersByTime(15_000);
    expect(GrabadoraFalsa.ultima!.state).toBe('inactive');
    expect(camara.estado).toBe('activa'); // la imagen sigue hasta «Listo» o «Cancelar»
    avanzar(4000);
    const clip = await camara.listo();
    expect(clip?.duracionMs).toBe(15_000);
    expect(flujo.pistas[0]!.detenida).toBe(true);
  });

  it('una nueva captura descarta la anterior', async () => {
    const primero = new FlujoFalso();
    const segundo = new FlujoFalso();
    const flujos = [primero, segundo];
    const { camara } = preparar(async () => flujos.shift());
    await camara.iniciar('cap-1');
    await camara.iniciar('cap-2');
    expect(primero.pistas[0]!.detenida).toBe(true);
    expect(segundo.pistas[0]!.detenida).toBe(false);
    expect((await camara.listo())?.capturaId).toBe('cap-2');
  });
});
