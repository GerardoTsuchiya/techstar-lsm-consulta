import { generarId } from '../nucleo/ids';
import type { Comando, Evento, Resultado, Rol } from '../nucleo/tipos';
import {
  aBase64,
  bytesAleatorios,
  CanalSeguro,
  deBase64,
  derivarClaveMaestra,
  esTrama,
  ITERACIONES_PBKDF2,
  normalizarCodigo,
} from './canalSeguro';
import { esMotivoRechazo, leerJson, type MensajeSeguro, type MotivoRechazo, VERSION_PROTOCOLO } from './protocoloRed';
import type { ConexionCliente } from './tipos';

/**
 * Transporte por WebSocket en la red local (etapa B): la vista del paciente, en su laptop,
 * se conecta al coordinador que vive en la laptop del médico.
 *
 * - Vinculación con el código que muestra el médico; todo el tráfico va cifrado (canalSeguro.ts).
 * - Si la red cae, reintenta solo. Al reconectar, el coordinador vuelve a enviar la instantánea.
 * - Una solicitud sin respuesta se reenvía tal cual tras reconectar: el coordinador la aplica una
 *   sola vez porque conserva el mismo `envioId` (sin duplicados).
 * - Si no hay respuesta dentro de `esperaMaximaMs`, responde «sin conexión»: nunca finge una entrega
 *   (RF-20). «Recibido» solo lo marca el coordinador con el acuse del destinatario.
 * Todo vive en memoria; `desconectar()` lo borra.
 */

export type FaseRed = 'conectando' | 'conectado' | 'reconectando' | 'rechazado' | 'cerrado';

export interface EstadoRed {
  fase: FaseRed;
  /** Por qué la computadora del médico rechazó la conexión (no se reintenta). */
  motivo?: MotivoRechazo;
  /** Reconexiones logradas desde que se abrió la conexión. */
  reconexiones: number;
}

export interface OpcionesWebSocket {
  /** ws://IP:puerto/techstar (ver `urlDeDireccion`). */
  url: string;
  /** Código de vinculación tal como lo tecleó el personal. */
  codigo: string;
  /** Identifica a este equipo ante el coordinador (una sola pareja de dispositivos). */
  dispositivoId: string;
  rol?: Rol;
  WebSocketImpl?: typeof WebSocket;
  iteraciones?: number;
  /** Tiempo máximo para responder una solicitud, incluidas las reconexiones. */
  esperaMaximaMs?: number;
  /** Sin noticias del médico durante este tiempo se considera caída la red. */
  silencioMaximoMs?: number;
  /** Pausas entre reintentos; la última se repite. */
  pausasReintentoMs?: readonly number[];
}

export interface ConexionRed extends ConexionCliente {
  estado(): EstadoRed;
  alEstado(fn: (estado: EstadoRed) => void): () => void;
}

interface Pendiente {
  id: string;
  comando: Comando;
  resolver: (r: Resultado) => void;
  temporizador: ReturnType<typeof setTimeout>;
}

export function conectarPorWebSocket(opciones: OpcionesWebSocket): ConexionRed {
  const rol = opciones.rol ?? 'paciente';
  const WS = opciones.WebSocketImpl ?? globalThis.WebSocket;
  const codigo = normalizarCodigo(opciones.codigo) ?? opciones.codigo;
  const iteraciones = opciones.iteraciones ?? ITERACIONES_PBKDF2;
  const esperaMaximaMs = opciones.esperaMaximaMs ?? 10_000;
  const silencioMaximoMs = opciones.silencioMaximoMs ?? 6_000;
  const pausas = opciones.pausasReintentoMs ?? [250, 500, 1000, 2000, 3000];

  let estado: EstadoRed = { fase: 'conectando', reconexiones: 0 };
  let yaConectado = false;
  let terminado = false;
  let intento = 0;
  /** Conexión vigente y su canal, solo cuando ya está autenticada. */
  let socket: WebSocket | null = null;
  let activa: { ws: WebSocket; canal: CanalSeguro } | null = null;
  let reintento: ReturnType<typeof setTimeout> | undefined;
  let silencio: ReturnType<typeof setTimeout> | undefined;
  /** Último estado recibido, para entregarlo a quien se suscriba después. */
  let ultimoEstado: Evento | null = null;

  const oyentes = new Set<(e: Evento) => void>();
  const oyentesEstado = new Set<(e: EstadoRed) => void>();
  const pendientes = new Map<string, Pendiente>();
  const maestras = new Map<string, Promise<CryptoKey>>();

  function fijarEstado(nuevo: EstadoRed) {
    estado = nuevo;
    for (const fn of [...oyentesEstado]) fn(estado);
  }

  function resolverPendientes(resultado: Resultado) {
    for (const p of pendientes.values()) {
      clearTimeout(p.temporizador);
      p.resolver(resultado);
    }
    pendientes.clear();
  }

  function obtenerMaestra(sal: Uint8Array<ArrayBuffer>) {
    const clave = aBase64(sal);
    let m = maestras.get(clave);
    if (!m) {
      m = derivarClaveMaestra(codigo, sal, iteraciones);
      maestras.set(clave, m);
    }
    return m;
  }

  function transmitir(p: Pendiente) {
    if (!activa) return; // se enviará al reconectar
    const { ws, canal } = activa;
    void canal
      .cifrar({ t: 'solicitud', id: p.id, comando: p.comando } satisfies MensajeSeguro)
      .then((trama) => {
        if (ws.readyState === WS.OPEN) ws.send(JSON.stringify(trama));
      });
  }

  function vigilar(ws: WebSocket) {
    clearTimeout(silencio);
    silencio = setTimeout(() => abandonar(ws), silencioMaximoMs);
  }

  /** Deja una conexión (cerrada o muda) y programa el reintento. */
  function abandonar(ws: WebSocket) {
    if (socket !== ws) return;
    socket = null;
    activa = null;
    clearTimeout(silencio);
    try {
      ws.close();
    } catch {
      /* ya cerrada */
    }
    if (terminado || estado.fase === 'rechazado') return;
    fijarEstado({ ...estado, fase: yaConectado ? 'reconectando' : 'conectando' });
    const pausa = pausas[Math.min(intento, pausas.length - 1)] ?? 1000;
    intento++;
    clearTimeout(reintento);
    reintento = setTimeout(abrir, pausa);
  }

  function rechazar(ws: WebSocket, motivo: MotivoRechazo) {
    fijarEstado({ ...estado, fase: 'rechazado', motivo });
    resolverPendientes({ ok: false, error: 'sin-conexion' });
    abandonar(ws);
  }

  function abrir() {
    if (terminado) return;
    let ws: WebSocket;
    try {
      ws = new WS(opciones.url);
    } catch {
      // Dirección imposible de abrir: se trata como red caída y se reintenta.
      const falso = {} as WebSocket;
      socket = falso;
      abandonar(falso);
      return;
    }
    socket = ws;
    let canal: CanalSeguro | null = null;
    let autenticado = false;
    let cadena: Promise<void> = Promise.resolve();
    vigilar(ws);

    async function procesar(datos: unknown) {
      if (socket !== ws) return;
      vigilar(ws);
      const m = leerJson(datos) as Record<string, unknown> | null;

      if (!autenticado) {
        if (m?.t === 'rechazo') return rechazar(ws, esMotivoRechazo(m.motivo) ? m.motivo : 'saludo-invalido');
        if (m?.t === 'reto' && !canal) {
          if (m.v !== VERSION_PROTOCOLO) return rechazar(ws, 'version-incompatible');
          const sal = deBase64(String(m.sal));
          const nonceServidor = deBase64(String(m.nonce));
          const nonceCliente = bytesAleatorios(16);
          const nuevo = await CanalSeguro.crear(await obtenerMaestra(sal), nonceServidor, nonceCliente, 'paciente');
          const sobre = await nuevo.cifrar({ v: VERSION_PROTOCOLO, rol, dispositivoId: opciones.dispositivoId });
          if (socket !== ws) return;
          canal = nuevo;
          ws.send(JSON.stringify({ t: 'hola', nonce: aBase64(nonceCliente), sobre }));
          return;
        }
        if (canal && esTrama(m)) {
          let s: unknown;
          try {
            s = await canal.descifrar(m);
          } catch {
            // La otra computadora no conoce el código: no es la del médico vinculada.
            return rechazar(ws, 'codigo-incorrecto');
          }
          if ((s as MensajeSeguro).t !== 'bienvenida' || socket !== ws) return;
          autenticado = true;
          activa = { ws, canal };
          intento = 0;
          fijarEstado({ fase: 'conectado', reconexiones: estado.reconexiones + (yaConectado ? 1 : 0) });
          yaConectado = true;
          // Lo que quedó sin respuesta se reenvía igual: el `envioId` evita duplicados.
          for (const p of pendientes.values()) transmitir(p);
          return;
        }
        throw new Error('saludo-invalido');
      }

      const s = (await canal!.descifrar(m)) as MensajeSeguro;
      if (s.t === 'respuesta') {
        const p = pendientes.get(s.id);
        if (p) {
          clearTimeout(p.temporizador);
          pendientes.delete(s.id);
          p.resolver(s.resultado);
        }
      } else if (s.t === 'evento') {
        if (s.evento.tipo === 'estado') ultimoEstado = s.evento;
        for (const fn of [...oyentes]) fn(s.evento);
      } else if (s.t === 'rechazo') {
        rechazar(ws, s.motivo);
      }
    }

    ws.onmessage = (e: MessageEvent) => {
      cadena = cadena.then(() => procesar(e.data)).catch(() => abandonar(ws));
    };
    ws.onclose = () => abandonar(ws);
    ws.onerror = () => {
      /* llega también `close` */
    };
  }

  abrir();

  return {
    rol,
    enviar(comando) {
      if (terminado || estado.fase === 'rechazado') return Promise.resolve({ ok: false, error: 'sin-conexion' });
      return new Promise<Resultado>((resolver) => {
        const id = generarId('sol');
        const temporizador = setTimeout(() => {
          pendientes.delete(id);
          resolver({ ok: false, error: 'sin-conexion' });
        }, esperaMaximaMs);
        const p: Pendiente = { id, comando, resolver, temporizador };
        pendientes.set(id, p);
        transmitir(p);
      });
    },
    alEvento(fn) {
      oyentes.add(fn);
      if (ultimoEstado) fn(structuredClone(ultimoEstado));
      return () => oyentes.delete(fn);
    },
    estado: () => estado,
    alEstado(fn) {
      oyentesEstado.add(fn);
      fn(estado);
      return () => oyentesEstado.delete(fn);
    },
    desconectar() {
      terminado = true;
      clearTimeout(reintento);
      clearTimeout(silencio);
      resolverPendientes({ ok: false, error: 'sin-conexion' });
      oyentes.clear();
      ultimoEstado = null;
      maestras.clear();
      const ws = socket;
      socket = null;
      activa = null;
      try {
        ws?.close();
      } catch {
        /* ya cerrada */
      }
      fijarEstado({ ...estado, fase: 'cerrado' });
      oyentesEstado.clear();
    },
  };
}
