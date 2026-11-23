import os from 'node:os';
import { WebSocket, WebSocketServer } from 'ws';
import type { CoordinadorSesion } from '../../src/nucleo/coordinador';
import type { Comando, Resultado } from '../../src/nucleo/tipos';
import { calcularHuella } from '../../src/transporte/busqueda';
import {
  aBase64,
  bytesAleatorios,
  CanalSeguro,
  deBase64,
  derivarClaveMaestra,
  esTrama,
  generarCodigo,
  ITERACIONES_PBKDF2,
  normalizarCodigo,
} from '../../src/transporte/canalSeguro';
import type { EstadoVinculacion } from '../../src/transporte/puente';
import {
  CIERRE,
  esComando,
  esCredencial,
  leerJson,
  type MensajeSeguro,
  type MotivoRechazo,
  PUERTO_PREDETERMINADO,
  RUTA_WEBSOCKET,
  VERSION_PROTOCOLO,
} from '../../src/transporte/protocoloRed';

/**
 * Servidor WebSocket de la laptop del médico (etapa B). Envuelve el `CoordinadorSesion`
 * existente sin cambiar sus reglas: solo autentica a la laptop del paciente, fija su rol
 * («paciente») y le pasa comandos y eventos cifrados.
 *
 * - Vinculación: el médico muestra un código; quien no lo conoce no puede descifrar (rechazo).
 * - Una sola pareja: la primera laptop que se vincula queda registrada; otra se rechaza
 *   aunque conozca el código, hasta que el médico pulse «Desvincular» (código nuevo).
 * - Reconexión: la misma laptop puede volver a entrar; recibe la instantánea actual.
 * - No registra contenido de la consulta en ningún lado.
 */

export interface OpcionesServidorRed {
  coordinador: CoordinadorSesion;
  /** '0.0.0.0' para la red local; '127.0.0.1' para probar en una sola computadora. */
  host?: string;
  /** 0 = puerto libre cualquiera (pruebas). */
  puerto?: number;
  iteraciones?: number;
  latidoMs?: number;
  esperaSaludoMs?: number;
  maxSaludosPendientes?: number;
  /** Solo pruebas: código fijo. */
  codigo?: string;
  /** Solo pruebas: simula que la red cae después de aplicar un comando y antes de responder. */
  cortarAntesDeResponder?: (comando: Comando) => boolean;
}

export interface ServidorRed {
  readonly puerto: number;
  estado(): EstadoVinculacion;
  alCambio(fn: (estado: EstadoVinculacion) => void): () => void;
  desvincular(): Promise<EstadoVinculacion>;
  /** Lo que el médico responde a una búsqueda (D56): puerto, sal y huella de la vinculación vigente. */
  datosAnuncio(): Promise<{ puerto: number; sal: string; huella: string }>;
  cerrar(): Promise<void>;
  /** Solo pruebas: corta la conexión del paciente como si cayera la red. */
  cortarConexiones(): void;
  /** Solo pruebas: deja de mandar latidos (red muda sin cierre). */
  silenciar(silencio: boolean): void;
}

interface Vinculacion {
  codigo: string;
  sal: Uint8Array<ArrayBuffer>;
  maestra: Promise<CryptoKey>;
}

/** Direcciones IPv4 de la red local de esta computadora, con el nombre del adaptador. */
export function direccionesLocales(): { ip: string; red: string }[] {
  const res: { ip: string; red: string }[] = [];
  for (const [red, lista] of Object.entries(os.networkInterfaces())) {
    for (const d of lista ?? []) if (d.family === 'IPv4' && !d.internal) res.push({ ip: d.address, red });
  }
  return res;
}

export async function iniciarServidorRed(opciones: OpcionesServidorRed): Promise<ServidorRed> {
  const { coordinador } = opciones;
  const host = opciones.host ?? '0.0.0.0';
  const iteraciones = opciones.iteraciones ?? ITERACIONES_PBKDF2;
  const latidoMs = opciones.latidoMs ?? 2000;
  const esperaSaludoMs = opciones.esperaSaludoMs ?? 5000;
  const maxSaludos = opciones.maxSaludosPendientes ?? 8;

  const nuevaVinculacion = (codigo = generarCodigo()): Vinculacion => {
    const sal = bytesAleatorios(16);
    return { codigo, sal, maestra: derivarClaveMaestra(normalizarCodigo(codigo) ?? codigo, sal, iteraciones) };
  };

  let vinculacion = nuevaVinculacion(opciones.codigo);
  let dispositivo: string | null = null;
  let activa: { ws: WebSocket; canal: CanalSeguro; ultimoPong: number } | null = null;
  let saludosPendientes = 0;
  let rechazados = 0;
  let ultimoRechazo: MotivoRechazo | null = null;
  let silenciado = false;
  const oyentes = new Set<(e: EstadoVinculacion) => void>();

  const wss = new WebSocketServer({ host, port: opciones.puerto ?? PUERTO_PREDETERMINADO, path: RUTA_WEBSOCKET, maxPayload: 256 * 1024 });
  await new Promise<void>((resolver, rechazar) => {
    wss.once('listening', resolver);
    wss.once('error', rechazar);
  });
  const direccion = wss.address();
  const puerto = typeof direccion === 'object' && direccion ? direccion.port : (opciones.puerto ?? PUERTO_PREDETERMINADO);
  const soloLocal = host === '127.0.0.1' || host === 'localhost' || host === '::1';

  function estado(): EstadoVinculacion {
    // «192.168.1.20:47100 (Wi-Fi)»: el nombre ayuda a descartar adaptadores virtuales (WSL, VPN…).
    const ips = host === '0.0.0.0' ? direccionesLocales() : [{ ip: host, red: '' }];
    return {
      escuchando: true,
      error: null,
      puerto,
      soloLocal,
      direcciones: ips.map(({ ip, red }) => `${ip}:${puerto}${red ? ` (${red})` : ''}`),
      codigo: vinculacion.codigo,
      vinculado: dispositivo !== null,
      conectado: activa !== null,
      dispositivo: dispositivo ? dispositivo.slice(0, 6).toUpperCase() : null,
      rechazados,
      ultimoRechazo,
    };
  }

  function notificar() {
    const e = estado();
    for (const fn of [...oyentes]) fn(e);
  }

  function enviarSeguro(ws: WebSocket, canal: CanalSeguro, mensaje: MensajeSeguro) {
    void canal.cifrar(mensaje).then((trama) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(trama));
    });
  }

  // Cada cambio del coordinador llega a la laptop del paciente, solo si está autenticada.
  const bajaCoordinador = coordinador.suscribir((evento) => {
    if (activa) enviarSeguro(activa.ws, activa.canal, { t: 'evento', evento });
  });

  // Latidos: el paciente detecta una red muda; el ping detecta un paciente que desapareció.
  const latidos = setInterval(() => {
    if (!activa || silenciado) return;
    if (Date.now() - activa.ultimoPong > latidoMs * 3) {
      activa.ws.terminate();
      return;
    }
    activa.ws.ping();
    enviarSeguro(activa.ws, activa.canal, { t: 'latido' });
  }, latidoMs);

  wss.on('connection', (ws) => {
    if (saludosPendientes >= maxSaludos) {
      ws.close(1013);
      return;
    }
    saludosPendientes++;
    let fase: 'saludo' | 'activa' | 'cerrada' = 'saludo';
    let canal: CanalSeguro | null = null;
    let cadena: Promise<void> = Promise.resolve();
    const vinc = vinculacion;
    const nonceServidor = bytesAleatorios(16);

    const salirDelSaludo = () => {
      if (fase === 'saludo') saludosPendientes--;
    };
    const temporizador = setTimeout(() => rechazar('saludo-invalido'), esperaSaludoMs);

    function rechazar(motivo: MotivoRechazo) {
      if (fase === 'cerrada') return;
      clearTimeout(temporizador);
      salirDelSaludo();
      fase = 'cerrada';
      if (motivo !== 'saludo-invalido') {
        rechazados++;
        ultimoRechazo = motivo;
      }
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ t: 'rechazo', motivo }));
        ws.close(CIERRE[motivo]);
      }
      notificar();
    }

    async function procesar(datos: string | null) {
      if (fase === 'cerrada') return;
      const m = leerJson(datos) as Record<string, unknown> | null;

      if (fase === 'saludo') {
        if (!m || m.t !== 'hola' || typeof m.nonce !== 'string' || !esTrama(m.sobre)) return rechazar('saludo-invalido');
        let nonceCliente: Uint8Array;
        try {
          nonceCliente = deBase64(m.nonce);
        } catch {
          return rechazar('saludo-invalido');
        }
        if (nonceCliente.length !== 16) return rechazar('saludo-invalido');
        canal = await CanalSeguro.crear(await vinc.maestra, nonceServidor, nonceCliente, 'medico');
        let credencial: unknown;
        try {
          credencial = await canal.descifrar(m.sobre);
        } catch {
          return rechazar('codigo-incorrecto');
        }
        if (!esCredencial(credencial)) return rechazar('saludo-invalido');
        if (credencial.v !== VERSION_PROTOCOLO) return rechazar('version-incompatible');
        // Por la red solo entra la vista del paciente; el médico usa IPC en su propia laptop.
        if (credencial.rol !== 'paciente') return rechazar('rol-no-permitido');
        if (vinc !== vinculacion) return rechazar('desvinculado');
        if (dispositivo !== null && dispositivo !== credencial.dispositivoId) return rechazar('pareja-ocupada');
        if (fase !== 'saludo') return;

        clearTimeout(temporizador);
        salirDelSaludo();
        fase = 'activa';
        dispositivo = credencial.dispositivoId;
        // Una reconexión de la misma laptop sustituye a la conexión anterior (quizá medio caída).
        if (activa) activa.ws.terminate();
        activa = { ws, canal, ultimoPong: Date.now() };
        enviarSeguro(ws, canal, { t: 'bienvenida' });
        enviarSeguro(ws, canal, { t: 'evento', evento: { tipo: 'estado', instantanea: coordinador.instantanea() } });
        notificar();
        return;
      }

      let s: unknown;
      try {
        s = await canal!.descifrar(m);
      } catch {
        ws.terminate(); // trama alterada o repetida
        return;
      }
      const msj = s as Record<string, unknown> | null;
      if (msj?.t !== 'solicitud' || typeof msj.id !== 'string' || msj.id.length > 100) return;
      let resultado: Resultado;
      if (!esComando(msj.comando)) {
        resultado = { ok: false, error: 'comando-invalido' };
      } else {
        try {
          // El rol lo fija el servidor: «paciente». El coordinador valida rol, sesión y envío único.
          resultado = coordinador.procesar('paciente', msj.comando);
        } catch {
          resultado = { ok: false, error: 'comando-invalido' };
        }
        if (opciones.cortarAntesDeResponder?.(msj.comando)) {
          ws.terminate();
          return;
        }
      }
      enviarSeguro(ws, canal!, { t: 'respuesta', id: msj.id, resultado });
    }

    ws.on('message', (datos, binario) => {
      const texto = binario ? null : datos.toString();
      cadena = cadena.then(() => procesar(texto)).catch(() => ws.terminate());
    });
    ws.on('pong', () => {
      if (activa?.ws === ws) activa.ultimoPong = Date.now();
    });
    ws.on('close', () => {
      clearTimeout(temporizador);
      salirDelSaludo();
      fase = 'cerrada';
      if (activa?.ws === ws) {
        activa = null;
        notificar();
      }
    });
    ws.on('error', () => {
      /* sigue `close` */
    });

    ws.send(
      JSON.stringify({ t: 'reto', v: VERSION_PROTOCOLO, sal: aBase64(vinc.sal), nonce: aBase64(nonceServidor) }),
    );
  });

  return {
    puerto,
    estado,
    alCambio(fn) {
      oyentes.add(fn);
      return () => oyentes.delete(fn);
    },
    async desvincular() {
      const anterior = activa;
      activa = null;
      dispositivo = null;
      vinculacion = nuevaVinculacion();
      if (anterior) {
        const { ws, canal } = anterior;
        await canal.cifrar({ t: 'rechazo', motivo: 'desvinculado' } satisfies MensajeSeguro).then((trama) => {
          if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(trama));
        });
        ws.close(CIERRE.desvinculado);
      }
      notificar();
      return estado();
    },
    async datosAnuncio() {
      const vinc = vinculacion;
      return { puerto, sal: aBase64(vinc.sal), huella: await calcularHuella(await vinc.maestra, vinc.sal) };
    },
    async cerrar() {
      clearInterval(latidos);
      bajaCoordinador();
      oyentes.clear();
      for (const c of wss.clients) c.terminate();
      await new Promise<void>((resolver) => wss.close(() => resolver()));
    },
    cortarConexiones() {
      for (const c of wss.clients) c.terminate();
    },
    silenciar(valor) {
      silenciado = valor;
    },
  };
}
