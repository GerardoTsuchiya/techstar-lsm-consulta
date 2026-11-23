import dgram from 'node:dgram';
import os from 'node:os';
import {
  type AnuncioRecibido,
  DURACION_BUSQUEDA_MS,
  esAnuncio,
  INTERVALO_BUSQUEDA_MS,
  MAX_BYTES_BUSQUEDA,
  mensajeBusqueda,
  PUERTO_BUSQUEDA,
} from '../src/transporte/busqueda';
import { leerJson } from '../src/transporte/protocoloRed';

/**
 * Búsqueda del equipo del paciente (D56): envía la pregunta por difusión y junta los anuncios que llegan.
 * No abre ningún puerto fijo: Windows deja pasar la respuesta a una difusión que envió este equipo.
 */

const aEntero = (ip: string) => ip.split('.').reduce((n, p) => (n << 8) + Number(p), 0) >>> 0;
const aTexto = (n: number) => [24, 16, 8, 0].map((d) => (n >>> d) & 255).join('.');

/** Difusión de cada red IPv4 activa, más la general (255.255.255.255) y la local (127.0.0.1). */
export function destinosDeDifusion(interfaces = os.networkInterfaces()): string[] {
  const destinos: string[] = [];
  for (const lista of Object.values(interfaces)) {
    for (const d of lista ?? []) {
      if (d.family !== 'IPv4' || d.internal || !d.netmask) continue;
      const mascara = aEntero(d.netmask);
      destinos.push(aTexto((aEntero(d.address) & mascara) | (~mascara >>> 0)));
    }
  }
  destinos.push('255.255.255.255', '127.0.0.1');
  return [...new Set(destinos)];
}

export interface OpcionesBuscar {
  duracionMs?: number;
  intervaloMs?: number;
  /** Solo pruebas: puerto del médico. */
  puerto?: number;
  /** Solo pruebas: a dónde preguntar. */
  destinos?: string[];
}

/** Máximo de anuncios distintos que se juntan: un equipo que inunde con anuncios falsos no agranda la lista sin límite. */
const MAX_ANUNCIOS = 32;

/**
 * Pregunta durante `duracionMs` y devuelve un anuncio por `ip:puerto` (el más reciente). Las direcciones son IPv4
 * (los sockets son udp4).
 */
export function buscarMedicos(opciones: OpcionesBuscar = {}): Promise<AnuncioRecibido[]> {
  const duracionMs = opciones.duracionMs ?? DURACION_BUSQUEDA_MS;
  const intervaloMs = opciones.intervaloMs ?? INTERVALO_BUSQUEDA_MS;
  const puerto = opciones.puerto ?? PUERTO_BUSQUEDA;
  const destinos = opciones.destinos ?? destinosDeDifusion();
  const pregunta = Buffer.from(JSON.stringify(mensajeBusqueda()), 'utf8');
  const encontrados = new Map<string, AnuncioRecibido>();

  return new Promise((resolver) => {
    const socket = dgram.createSocket('udp4');
    let intervalo: NodeJS.Timeout | undefined;
    const terminar = () => {
      clearInterval(intervalo);
      socket.close();
      resolver([...encontrados.values()]);
    };

    socket.on('message', (datos, remitente) => {
      if (datos.length > MAX_BYTES_BUSQUEDA) return;
      const m = leerJson(datos.toString('utf8'));
      if (!esAnuncio(m)) return;
      const clave = `${remitente.address}:${m.puerto}`;
      if (!encontrados.has(clave) && encontrados.size >= MAX_ANUNCIOS) return;
      encontrados.set(clave, { ...m, ip: remitente.address });
    });
    socket.on('error', () => terminar());

    socket.bind(0, () => {
      socket.setBroadcast(true);
      const preguntar = () => {
        // Un destino inalcanzable (adaptador sin red) no detiene la búsqueda en los demás.
        for (const d of destinos) socket.send(pregunta, puerto, d, () => undefined);
      };
      preguntar();
      intervalo = setInterval(preguntar, intervaloMs);
      setTimeout(terminar, duracionMs);
    });
  });
}
