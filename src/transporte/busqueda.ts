import { aBase64, deBase64, derivarClaveMaestra, ITERACIONES_PBKDF2, normalizarCodigo } from './canalSeguro';
import { MOTIVOS_RECHAZO, urlDeDireccion, VERSION_PROTOCOLO } from './protocoloRed';

/**
 * Búsqueda de la computadora del médico en la red local (D56). Sin Node ni Electron: lo usan el proceso
 * principal (sockets UDP) y la ventana del paciente (elegir con el código).
 *
 *   paciente → difusión UDP :47100  { t: 'busqueda', app, v }
 *   médico   → solo al remitente    { t: 'anuncio', app, v, puerto, sal, huella }
 *
 * La huella sale de la clave maestra del código (PBKDF2 + HKDF): no revela el código y cambia con cada código
 * nuevo. Nunca viaja nada de la consulta. La autenticación sigue siendo la del WebSocket cifrado.
 */

export const APP_BUSQUEDA = 'lsm-consulta';
/** Mismo número que el WebSocket (TCP); UDP es otro protocolo y no chocan. */
export const PUERTO_BUSQUEDA = 47100;
export const DURACION_BUSQUEDA_MS = 5000;
export const INTERVALO_BUSQUEDA_MS = 1000;
/** Mientras la pantalla de conexión está abierta, se vuelve a buscar con esta pausa. */
export const PAUSA_REBUSQUEDA_MS = 10_000;
export const MAX_BYTES_BUSQUEDA = 512;

export interface Busqueda {
  t: 'busqueda';
  app: typeof APP_BUSQUEDA;
  v: number;
}

export interface Anuncio {
  t: 'anuncio';
  app: typeof APP_BUSQUEDA;
  v: number;
  puerto: number;
  /** Sal de la vinculación vigente (base64). */
  sal: string;
  /** HKDF de la clave maestra del código (base64, 16 bytes). */
  huella: string;
}

/** Anuncio con la dirección desde la que llegó. */
export interface AnuncioRecibido extends Anuncio {
  ip: string;
}

export type ResultadoEleccion =
  | { tipo: 'encontrado'; anuncio: AnuncioRecibido; url: string }
  | { tipo: 'nadie' }
  | { tipo: 'sin-coincidencia' }
  | { tipo: 'version' };

/** Textos para el personal cuando no se encontró al médico. */
export const MENSAJES_BUSQUEDA: Record<Exclude<ResultadoEleccion['tipo'], 'encontrado'>, string> = {
  nadie:
    'No encontramos la computadora del médico en esta red. Revisa que las dos estén en el mismo Wi-Fi y que la del médico tenga la app abierta.',
  'sin-coincidencia': 'Hay computadoras de médico en esta red, pero ninguna tiene este código. Revisa el código.',
  version: MOTIVOS_RECHAZO['version-incompatible'],
};

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const tieneClaves = (x: Record<string, unknown>, claves: string[]) =>
  Object.keys(x).length === claves.length && claves.every((c) => c in x);
const esTextoCorto = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64;

export function mensajeBusqueda(): Busqueda {
  return { t: 'busqueda', app: APP_BUSQUEDA, v: VERSION_PROTOCOLO };
}

export function esBusqueda(x: unknown): x is Busqueda {
  return (
    esObjeto(x) &&
    tieneClaves(x, ['t', 'app', 'v']) &&
    x.t === 'busqueda' &&
    x.app === APP_BUSQUEDA &&
    Number.isInteger(x.v)
  );
}

export function esAnuncio(x: unknown): x is Anuncio {
  return (
    esObjeto(x) &&
    tieneClaves(x, ['t', 'app', 'v', 'puerto', 'sal', 'huella']) &&
    x.t === 'anuncio' &&
    x.app === APP_BUSQUEDA &&
    Number.isInteger(x.v) &&
    Number.isInteger(x.puerto) &&
    (x.puerto as number) >= 1 &&
    (x.puerto as number) <= 65535 &&
    esTextoCorto(x.sal) &&
    esTextoCorto(x.huella)
  );
}

const INFO_HUELLA = new TextEncoder().encode('techstar-v1 anuncio');

/** Huella del anuncio: 16 bytes de HKDF-SHA-256 sobre la clave maestra, con la sal de la vinculación. */
export async function calcularHuella(maestra: CryptoKey, sal: Uint8Array<ArrayBuffer>): Promise<string> {
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sal, info: INFO_HUELLA }, maestra, 128);
  return aBase64(new Uint8Array(bits));
}

/**
 * Elige el anuncio cuyo código coincide con el tecleado. Una derivación PBKDF2 por sal distinta.
 * Las iteraciones son fijas en el código (solo las pruebas las bajan): un anuncio falso no puede abaratarlas.
 */
export async function elegirMedico(
  codigo: string,
  anuncios: readonly AnuncioRecibido[],
  iteraciones = ITERACIONES_PBKDF2,
): Promise<ResultadoEleccion> {
  if (anuncios.length === 0) return { tipo: 'nadie' };
  const compatibles = anuncios.filter((a) => a.v === VERSION_PROTOCOLO);
  if (compatibles.length === 0) return { tipo: 'version' };
  const cod = normalizarCodigo(codigo);
  if (!cod) return { tipo: 'sin-coincidencia' };

  const huellas = new Map<string, string | null>();
  for (const a of compatibles) {
    if (!huellas.has(a.sal)) {
      let huella: string | null = null;
      try {
        const sal = deBase64(a.sal);
        huella = await calcularHuella(await derivarClaveMaestra(cod, sal, iteraciones), sal);
      } catch {
        huella = null; // sal mal formada: ese anuncio no puede coincidir
      }
      huellas.set(a.sal, huella);
    }
    if (huellas.get(a.sal) === a.huella) {
      const url = urlDeDireccion(`${a.ip}:${a.puerto}`);
      if (url) return { tipo: 'encontrado', anuncio: a, url };
    }
  }
  return { tipo: 'sin-coincidencia' };
}
