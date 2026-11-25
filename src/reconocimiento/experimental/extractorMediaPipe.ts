import type { HandLandmarker, PoseLandmarker } from '@mediapipe/tasks-vision';
import { cuadroDesdeMediaPipe, type CuadroPuntos, type SecuenciaPuntos } from './puntos.ts';

/**
 * Extracción de puntos con MediaPipe Tasks Vision (manos + pose lite), **sin internet**: el código
 * WebAssembly se copia de `node_modules` a `mediapipe/` al compilar y los modelos están en
 * `public/modelos/`. Corre en el equipo del paciente (D34).
 *
 * El video se **reproduce** (a `VELOCIDAD_EXTRACCION`) y se analizan los cuadros que alcanza. Así lo
 * hacen la app con el clip WebM de la cámara (MediaRecorder no permite saltar con precisión dentro
 * del clip) y la herramienta de extracción con los videos de las plantillas.
 */
export interface OpcionesExtraccion {
  /** Velocidad de reproducción. */
  velocidad?: number;
}

/** Velocidad con que se reproducen el clip de la cámara y los videos de las plantillas (la misma en ambos). */
export const VELOCIDAD_EXTRACCION = 2;

export interface ExtractorPuntos {
  extraer(fuente: Blob | string, senal: AbortSignal, opciones?: OpcionesExtraccion): Promise<SecuenciaPuntos>;
  /**
   * Puntos del cuadro que muestra ahora un `<video>` (la cámara en vivo), con los mismos modelos que
   * `extraer`. Solo para dibujarlos en pantalla en modo desarrollo: no decide nada ni se guarda.
   * `null` si el video aún no tiene imagen o el extractor está analizando un clip.
   */
  detectarCuadro?(video: HTMLVideoElement): CuadroPuntos | null;
}

/** Rutas relativas a la página (sirven en `npm run dev` y en Electron con `file://`). */
export interface RutasMediaPipe {
  wasm: string;
  modeloManos: string;
  modeloPose: string;
}

export function rutasPredeterminadas(base: string = document.baseURI): RutasMediaPipe {
  return {
    wasm: new URL('mediapipe', base).href,
    modeloManos: new URL('modelos/hand_landmarker.task', base).href,
    modeloPose: new URL('modelos/pose_landmarker_lite.task', base).href,
  };
}

const abortado = (senal: AbortSignal) => senal.reason ?? new DOMException('Cancelado', 'AbortError');

function esperarEvento(objetivo: HTMLMediaElement, evento: string, senal: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (senal.aborted) return rechazar(abortado(senal));
    const limpiar = () => {
      objetivo.removeEventListener(evento, ok);
      objetivo.removeEventListener('error', fallo);
      senal.removeEventListener('abort', cancelar);
    };
    const ok = () => (limpiar(), resolver());
    const fallo = () => (limpiar(), rechazar(new Error('No se pudo leer el video.')));
    const cancelar = () => (limpiar(), rechazar(abortado(senal)));
    objetivo.addEventListener(evento, ok, { once: true });
    objetivo.addEventListener('error', fallo, { once: true });
    senal.addEventListener('abort', cancelar, { once: true });
  });
}

class ExtractorMediaPipe implements ExtractorPuntos {
  private cola: Promise<unknown> = Promise.resolve();
  /** Clips en análisis. Mientras haya uno, la vista en vivo no usa los detectores. */
  private enCurso = 0;
  constructor(
    private readonly manos: HandLandmarker,
    private readonly pose: PoseLandmarker,
    /** Última marca de tiempo entregada a los detectores (deben crecer siempre). */
    private marca: number,
  ) {}

  /** Un video a la vez: los detectores exigen marcas de tiempo crecientes. */
  extraer(fuente: Blob | string, senal: AbortSignal, opciones: OpcionesExtraccion = {}) {
    this.enCurso++;
    const tarea = this.cola.then(() => this.extraerUno(fuente, senal, opciones));
    this.cola = tarea.catch(() => undefined).finally(() => this.enCurso--);
    return tarea;
  }

  detectarCuadro(video: HTMLVideoElement): CuadroPuntos | null {
    if (this.enCurso > 0 || video.readyState < 2 || video.videoWidth === 0) return null;
    return this.detectar(video);
  }

  private detectar(video: HTMLVideoElement): CuadroPuntos {
    this.marca = Math.max(this.marca + 1, Math.floor(performance.now()));
    const m = this.manos.detectForVideo(video, this.marca);
    const p = this.pose.detectForVideo(video, this.marca);
    return cuadroDesdeMediaPipe(video.currentTime, video.videoWidth, video.videoHeight, p.landmarks, m.landmarks);
  }

  private async extraerUno(fuente: Blob | string, senal: AbortSignal, opciones: OpcionesExtraccion): Promise<SecuenciaPuntos> {
    if (senal.aborted) throw abortado(senal);
    const url = typeof fuente === 'string' ? fuente : URL.createObjectURL(fuente);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // Fuera de la vista: no se muestra a nadie (la imagen no sale de la memoria).
    video.style.cssText = 'position:fixed;left:-4000px;top:0;width:320px;height:240px;pointer-events:none';
    video.setAttribute('aria-hidden', 'true');
    document.body.appendChild(video);
    try {
      video.src = url;
      await esperarEvento(video, 'loadeddata', senal);
      const cuadros = await this.porReproduccion(video, senal, opciones.velocidad ?? VELOCIDAD_EXTRACCION);
      return { ancho: video.videoWidth, alto: video.videoHeight, cuadros };
    } finally {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      if (typeof fuente !== 'string') URL.revokeObjectURL(url);
    }
  }

  private porReproduccion(video: HTMLVideoElement, senal: AbortSignal, velocidad: number): Promise<CuadroPuntos[]> {
    const cuadros: CuadroPuntos[] = [];
    // Ventana visible (la app): setTimeout, que deja al navegador avanzar el video entre cuadros.
    // Ventana oculta (herramienta en segundo plano): MessageChannel, porque ahí setTimeout se limita
    // a una vez por segundo o menos. requestAnimationFrame no sirve: se detiene si no se pinta.
    const canal = new MessageChannel();
    return new Promise((resolver, rechazar) => {
      let ultimo = -1;
      let terminado = false;
      const programar = () => (document.hidden ? canal.port2.postMessage(null) : setTimeout(paso, 4));
      const terminar = (error?: unknown) => {
        if (terminado) return;
        terminado = true;
        canal.port1.close();
        senal.removeEventListener('abort', alCancelar);
        video.removeEventListener('ended', alTerminar);
        video.pause();
        if (error) rechazar(error);
        else resolver(cuadros);
      };
      const alCancelar = () => terminar(abortado(senal));
      const alTerminar = () => terminar();
      const paso = () => {
        if (terminado) return;
        try {
          if (video.readyState >= 2 && video.currentTime !== ultimo) {
            ultimo = video.currentTime;
            cuadros.push(this.detectar(video));
          }
        } catch (e) {
          terminar(e);
          return;
        }
        if (video.ended) terminar();
        else programar();
      };
      canal.port1.onmessage = paso;
      senal.addEventListener('abort', alCancelar, { once: true });
      video.addEventListener('ended', alTerminar, { once: true });
      video.playbackRate = velocidad;
      video.play().then(programar, terminar);
    });
  }
}

let compartido: Promise<ExtractorPuntos> | null = null;

/**
 * Crea (una sola vez por ventana) el extractor. Los modelos ocupan memoria pero no guardan nada de
 * ningún clip, así que se reutilizan entre sesiones.
 */
export function extractorMediaPipe(rutas: RutasMediaPipe = rutasPredeterminadas()): Promise<ExtractorPuntos> {
  compartido ??= crear(rutas).catch((e: unknown) => {
    compartido = null;
    throw e;
  });
  return compartido;
}

async function crear(rutas: RutasMediaPipe): Promise<ExtractorPuntos> {
  const { FilesetResolver, HandLandmarker, PoseLandmarker } = await import('@mediapipe/tasks-vision');
  const archivos = await FilesetResolver.forVisionTasks(rutas.wasm);
  const conDelegado = async <T>(fabrica: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> => {
    try {
      return await fabrica('GPU');
    } catch {
      return fabrica('CPU');
    }
  };
  const manos = await conDelegado((delegate) =>
    HandLandmarker.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: rutas.modeloManos, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
    }),
  );
  const pose = await conDelegado((delegate) =>
    PoseLandmarker.createFromOptions(archivos, {
      baseOptions: { modelAssetPath: rutas.modeloPose, delegate },
      runningMode: 'VIDEO',
      numPoses: 1,
    }),
  );
  // Calentamiento: la primera inferencia (sobre todo con GPU) tarda segundos en compilar; se hace aquí,
  // al preparar la sesión, para que no ocurra mientras se reproduce el primer clip.
  const lienzo = document.createElement('canvas');
  lienzo.width = 64;
  lienzo.height = 64;
  lienzo.getContext('2d')?.fillRect(0, 0, 64, 64);
  const marca = Math.floor(performance.now());
  manos.detectForVideo(lienzo, marca);
  pose.detectForVideo(lienzo, marca);
  return new ExtractorMediaPipe(manos, pose, marca);
}
