import type { Comando, Evento, Resultado, Rol } from '../nucleo/tipos';
import type { Trama } from './canalSeguro';

/**
 * Protocolo entre la laptop del paciente (cliente) y la del médico (servidor) por la red local.
 *
 * Vinculación (en claro solo lo imprescindible, nunca contenido de la consulta):
 *   servidor → { t: 'reto', v, sal, nonce }
 *   cliente  → { t: 'hola', nonce, sobre: Trama({ rol, dispositivoId }) }
 *   servidor → Trama({ t: 'bienvenida' }) y Trama({ t: 'evento', … estado actual })
 *   o bien   → { t: 'rechazo', motivo } y cierra la conexión.
 * Después, todo viaja dentro de tramas cifradas (MensajeSeguro).
 */

export const VERSION_PROTOCOLO = 1;
export const RUTA_WEBSOCKET = '/techstar';
export const PUERTO_PREDETERMINADO = 47100;

export type MotivoRechazo =
  | 'codigo-incorrecto'
  | 'rol-no-permitido'
  | 'pareja-ocupada'
  | 'desvinculado'
  | 'version-incompatible'
  | 'saludo-invalido';

export type MensajeClaro =
  | { t: 'reto'; v: number; sal: string; nonce: string }
  | { t: 'hola'; nonce: string; sobre: Trama }
  | { t: 'rechazo'; motivo: MotivoRechazo };

/** Lo que va dentro del sobre del saludo. */
export interface Credencial {
  v: number;
  rol: Rol;
  dispositivoId: string;
}

export type MensajeSeguro =
  | { t: 'bienvenida' }
  | { t: 'solicitud'; id: string; comando: Comando }
  | { t: 'respuesta'; id: string; resultado: Resultado }
  | { t: 'evento'; evento: Evento }
  | { t: 'latido' }
  /** Fin de la vinculación ya autenticada (p. ej. el médico desvinculó). */
  | { t: 'rechazo'; motivo: MotivoRechazo };

/** Códigos de cierre del WebSocket (rango 4000–4999, de la aplicación). */
export const CIERRE: Record<MotivoRechazo, number> = {
  'codigo-incorrecto': 4401,
  'rol-no-permitido': 4403,
  'pareja-ocupada': 4409,
  desvinculado: 4410,
  'version-incompatible': 4426,
  'saludo-invalido': 4400,
};

export const MOTIVOS_RECHAZO: Record<MotivoRechazo, string> = {
  'codigo-incorrecto': 'El código de vinculación no es correcto.',
  'rol-no-permitido': 'Por la red solo puede conectarse la pantalla del paciente.',
  'pareja-ocupada': 'La computadora del médico ya está vinculada con otro equipo.',
  desvinculado: 'La computadora del médico terminó la vinculación. Pide el código nuevo.',
  'version-incompatible': 'Las dos laptops tienen versiones distintas de la aplicación.',
  'saludo-invalido': 'La conexión no se pudo establecer.',
};

export function esMotivoRechazo(x: unknown): x is MotivoRechazo {
  return typeof x === 'string' && x in CIERRE;
}

// ---------------------------------------------------------------- validación de lo recibido

const esTexto = (x: unknown, max = 200): x is string => typeof x === 'string' && x.length > 0 && x.length <= max;
const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Comprueba la forma de un comando que llega por la red antes de entregarlo al coordinador.
 * El coordinador aplica después sus propias reglas (rol, sesión, recurso, contenido, envío único).
 */
export function esComando(x: unknown): x is Comando {
  if (!esObjeto(x)) return false;
  switch (x.tipo) {
    case 'iniciarSesion':
      return true;
    case 'confirmarMensajePaciente':
      return (
        esTexto(x.sesionId) &&
        esTexto(x.envioId) &&
        (x.via === 'catalogo' || x.via === 'camara') &&
        Array.isArray(x.selecciones) &&
        x.selecciones.length <= 50 &&
        x.selecciones.every(
          (s) =>
            esObjeto(s) &&
            esTexto(s.entradaId) &&
            (s.intensidad === undefined || typeof s.intensidad === 'number'),
        ) &&
        Array.isArray(x.textosRevisados) &&
        x.textosRevisados.length <= 50 &&
        x.textosRevisados.every((t) => esTexto(t, 2000))
      );
    case 'enviarEntradaMedico':
      return esTexto(x.sesionId) && esTexto(x.envioId) && esTexto(x.entradaId);
    case 'solicitarAclaracion':
      return esTexto(x.sesionId) && esTexto(x.envioId) && esTexto(x.mensajeId);
    case 'acuseRecibo':
      return esTexto(x.sesionId) && esTexto(x.mensajeId);
    case 'cerrarSesion':
      return esTexto(x.sesionId);
    default:
      return false;
  }
}

export function esCredencial(x: unknown): x is Credencial {
  return (
    esObjeto(x) &&
    typeof x.v === 'number' &&
    (x.rol === 'paciente' || x.rol === 'medico') &&
    esTexto(x.dispositivoId, 100) &&
    x.dispositivoId.length >= 8
  );
}

export function leerJson(datos: unknown): unknown {
  if (typeof datos !== 'string' || datos.length > 256 * 1024) return null;
  try {
    return JSON.parse(datos) as unknown;
  } catch {
    return null;
  }
}

/** Arma la dirección del WebSocket a partir de lo que teclea el personal: «192.168.1.20» o «192.168.1.20:47100». */
export function urlDeDireccion(entrada: string): string | null {
  const limpio = entrada.trim().replace(/^wss?:\/\//, '').replace(/\/.*$/, '');
  const m = /^([a-zA-Z0-9.-]+|\[[0-9a-fA-F:]+\])(?::(\d{1,5}))?$/.exec(limpio);
  if (!m) return null;
  const puerto = m[2] ? Number(m[2]) : PUERTO_PREDETERMINADO;
  if (puerto < 1 || puerto > 65535) return null;
  return `ws://${m[1]}:${puerto}${RUTA_WEBSOCKET}`;
}
