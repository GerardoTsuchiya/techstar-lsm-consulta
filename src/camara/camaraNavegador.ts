import type { AdaptadorCamara, ClipTemporal, EstadoCamara } from './adaptador';

/**
 * Cámara real de la laptop del paciente (etapa C), con las API web estándar:
 * `navigator.mediaDevices.getUserMedia` (solo video, nunca micrófono) y `MediaRecorder`.
 * Funciona igual en el navegador (`npm run dev`) y en la vista aislada de Electron, donde el
 * proceso principal concede solo el permiso de video a su propia ventana (electron/main.ts).
 *
 * Ciclo de vida (RF-17, RF-18):
 * - La cámara se enciende al iniciar una captura y se apaga con «Listo», «Cancelar» o `liberar()`.
 *   Entre capturas está apagada: no queda encendida esperando.
 * - El clip se arma en memoria (trozos `Blob`). No se escribe a disco, no usa almacenamiento del
 *   navegador y se descarta al cancelar o liberar. Tras entregarlo con «Listo» no se guarda copia.
 */

export const DURACION_MAXIMA_MS = 15_000;

/** Solo video, cámara frontal y resolución moderada: basta para la seña y limita el tamaño del clip. */
export const RESTRICCIONES_CAMARA: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 30, max: 30 },
  },
};

const TIPOS_PREFERIDOS = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

/** Traduce el error de getUserMedia a un estado que la interfaz puede explicar. */
export function estadoDeError(error: unknown): EstadoCamara {
  const nombre = typeof error === 'object' && error !== null ? (error as { name?: unknown }).name : undefined;
  switch (nombre) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'denegada';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return 'no-disponible';
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return 'ocupada';
    default:
      return 'error';
  }
}

export interface OpcionesCamaraNavegador {
  /** Por omisión `navigator.mediaDevices`. `undefined` = el entorno no ofrece cámara. */
  medios?: Pick<MediaDevices, 'getUserMedia'>;
  /** Por omisión `MediaRecorder`. */
  Grabadora?: typeof MediaRecorder;
  duracionMaximaMs?: number;
  ahora?: () => number;
}

export function crearCamaraNavegador(opciones: OpcionesCamaraNavegador = {}): AdaptadorCamara {
  const medios = 'medios' in opciones ? opciones.medios : globalThis.navigator?.mediaDevices;
  const Grabadora = 'Grabadora' in opciones ? opciones.Grabadora : globalThis.MediaRecorder;
  const duracionMaximaMs = opciones.duracionMaximaMs ?? DURACION_MAXIMA_MS;
  const ahora = opciones.ahora ?? (() => performance.now());

  let estado: EstadoCamara = 'apagada';
  let flujo: MediaStream | null = null;
  let grabadora: MediaRecorder | null = null;
  let detenida: Promise<void> | null = null;
  let trozos: Blob[] = [];
  let capturaId: string | null = null;
  let inicio = 0;
  let fin: number | null = null;
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  /** Cambia en cada apagado: invalida lo que estuviera en curso (permiso pendiente, «Listo» a medias). */
  let generacion = 0;
  const videos = new Set<HTMLVideoElement>();
  const oyentes = new Set<(e: EstadoCamara) => void>();

  function fijar(nuevo: EstadoCamara) {
    if (estado === nuevo) return;
    estado = nuevo;
    for (const fn of [...oyentes]) fn(nuevo);
  }

  function mostrar(video: HTMLVideoElement) {
    video.srcObject = flujo;
    if (flujo) void video.play?.()?.catch?.(() => {});
  }

  function detener(g: MediaRecorder): Promise<void> {
    if (!detenida) {
      detenida = new Promise<void>((resolver) => {
        // Si el navegador no avisa del fin, no se deja a la persona esperando.
        const reserva = setTimeout(resolver, 2000);
        g.onstop = () => {
          clearTimeout(reserva);
          resolver();
        };
        if (g.state !== 'inactive') g.stop();
        else {
          clearTimeout(reserva);
          resolver();
        }
      });
    }
    return detenida;
  }

  /** Apaga la cámara y descarta el clip. */
  function apagar(siguiente: EstadoCamara = 'apagada') {
    generacion++;
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    if (grabadora) {
      grabadora.ondataavailable = null;
      grabadora.onstop = null;
      if (grabadora.state !== 'inactive') {
        try {
          grabadora.stop();
        } catch {
          /* ya detenida */
        }
      }
    }
    grabadora = null;
    detenida = null;
    for (const pista of flujo?.getTracks() ?? []) {
      pista.onended = null;
      pista.stop();
    }
    flujo = null;
    trozos = [];
    capturaId = null;
    fin = null;
    for (const v of videos) v.srcObject = null;
    fijar(siguiente);
  }

  return {
    get estado() {
      return estado;
    },
    duracionMaximaMs,

    alCambiar(fn) {
      oyentes.add(fn);
      return () => {
        oyentes.delete(fn);
      };
    },

    async iniciar(id) {
      apagar(); // una captura anterior se descarta
      if (!medios?.getUserMedia || !Grabadora) {
        fijar('no-disponible');
        return estado;
      }
      const mia = generacion;
      fijar('solicitando');

      let nuevo: MediaStream;
      try {
        nuevo = await medios.getUserMedia(RESTRICCIONES_CAMARA);
      } catch (e) {
        if (mia === generacion) fijar(estadoDeError(e));
        return estado;
      }
      if (mia !== generacion) {
        // Se canceló o se cerró la sesión mientras se pedía el permiso: se apaga en seguida.
        for (const p of nuevo.getTracks()) p.stop();
        return estado;
      }

      flujo = nuevo;
      capturaId = id;
      trozos = [];
      for (const pista of nuevo.getVideoTracks()) {
        // Cámara desconectada o permiso retirado durante la captura.
        pista.onended = () => {
          if (flujo === nuevo) apagar('error');
        };
      }

      try {
        const tipo = TIPOS_PREFERIDOS.find((t) => Grabadora.isTypeSupported?.(t));
        const g = new Grabadora(nuevo, tipo ? { mimeType: tipo } : undefined);
        g.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) trozos.push(ev.data);
        };
        g.start(1000);
        grabadora = g;
      } catch {
        apagar('error');
        return estado;
      }

      inicio = ahora();
      fin = null;
      temporizador = setTimeout(() => {
        if (grabadora && mia === generacion) {
          fin = ahora();
          void detener(grabadora);
        }
      }, duracionMaximaMs);
      for (const v of videos) mostrar(v);
      fijar('activa');
      return estado;
    },

    mostrarEn(video) {
      videos.add(video);
      mostrar(video);
      return () => {
        videos.delete(video);
        video.srcObject = null;
      };
    },

    async listo() {
      const g = grabadora;
      const id = capturaId;
      if (estado !== 'activa' || !g || !id) return null;
      const mia = generacion;
      if (fin === null) fin = ahora();
      const final = fin;
      await detener(g);
      if (mia !== generacion) return null; // se canceló mientras terminaba
      const clip: ClipTemporal = {
        capturaId: id,
        datos: new Blob(trozos, { type: g.mimeType || 'video/webm' }),
        duracionMs: Math.max(0, Math.round(final - inicio)),
      };
      trozos = [];
      apagar();
      return clip;
    },

    cancelar() {
      apagar();
    },

    liberar() {
      apagar();
    },
  };
}
