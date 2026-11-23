import dgram from 'node:dgram';
import {
  type Anuncio,
  APP_BUSQUEDA,
  esBusqueda,
  MAX_BYTES_BUSQUEDA,
  PUERTO_BUSQUEDA,
} from '../../src/transporte/busqueda';
import { leerJson, VERSION_PROTOCOLO } from '../../src/transporte/protocoloRed';

/**
 * Respuesta del médico a la búsqueda del equipo del paciente (D56). Contesta solo al remitente, con el puerto del
 * WebSocket, la sal y la huella de la vinculación vigente. Nunca envía el código ni nada de la consulta.
 * Ignora lo que no sea una búsqueda y limita las respuestas por segundo para no servir de amplificador.
 */

export interface OpcionesRespuestaBusqueda {
  /** '0.0.0.0' para la red local; '127.0.0.1' con --solo-local. */
  host: string;
  /** 0 = puerto libre cualquiera (pruebas). */
  puerto?: number;
  datos: () => Promise<{ puerto: number; sal: string; huella: string }>;
  maxPorSegundo?: number;
}

export interface RespuestaBusqueda {
  readonly puerto: number;
  cerrar(): Promise<void>;
}

export async function iniciarRespuestaBusqueda(opciones: OpcionesRespuestaBusqueda): Promise<RespuestaBusqueda> {
  const maxPorSegundo = opciones.maxPorSegundo ?? 20;
  const socket = dgram.createSocket('udp4');
  let ventanaDesde = 0;
  let enVentana = 0;

  socket.on('message', (datos, remitente) => {
    if (datos.length > MAX_BYTES_BUSQUEDA) return;
    if (!esBusqueda(leerJson(datos.toString('utf8')))) return;
    const ahora = Date.now();
    if (ahora - ventanaDesde >= 1000) {
      ventanaDesde = ahora;
      enVentana = 0;
    }
    if (enVentana >= maxPorSegundo) return;
    enVentana++;
    void opciones.datos().then((d) => {
      const anuncio: Anuncio = { t: 'anuncio', app: APP_BUSQUEDA, v: VERSION_PROTOCOLO, ...d };
      socket.send(JSON.stringify(anuncio), remitente.port, remitente.address, () => undefined);
    });
  });
  socket.on('error', () => {
    /* un error de envío no detiene al médico; la dirección tecleada sigue disponible */
  });

  await new Promise<void>((resolver, rechazar) => {
    socket.once('error', rechazar);
    socket.bind(opciones.puerto ?? PUERTO_BUSQUEDA, opciones.host, () => {
      socket.off('error', rechazar);
      resolver();
    });
  });

  return {
    puerto: socket.address().port,
    cerrar: () => new Promise<void>((r) => socket.close(() => r())),
  };
}
