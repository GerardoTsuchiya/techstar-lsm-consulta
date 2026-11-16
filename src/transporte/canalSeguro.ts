/**
 * Canal cifrado y autenticado entre la laptop del paciente y la del médico (etapa B).
 *
 * El código de vinculación que muestra el médico es el secreto compartido:
 *   código ──PBKDF2──► clave maestra ──HKDF(nonces de la conexión)──► una clave AES-GCM por sentido.
 * Cada trama lleva un contador: una trama alterada, repetida o fuera de orden se rechaza.
 * Un equipo que no conoce el código no puede descifrar ni producir tramas válidas.
 *
 * Solo usa WebCrypto (`crypto.subtle`), disponible igual en el navegador, en Electron
 * (renderer y proceso principal) y en Node: el mismo código sirve a los dos extremos.
 */

/** Alfabeto Crockford base32: sin I, L, O ni U para evitar confusiones al teclear. */
const ALFABETO = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const LARGO_CODIGO = 10; // 50 bits

/** Iteraciones de PBKDF2. Fijas en el código: un servidor falso no puede abaratarlas. */
export const ITERACIONES_PBKDF2 = 210_000;

const texto = new TextEncoder();
const lector = new TextDecoder();

/** Genera un código de vinculación nuevo, p. ej. «7KQ2M-9XD4T». */
export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(LARGO_CODIGO));
  const crudo = Array.from(bytes, (b) => ALFABETO[b & 31]).join('');
  return `${crudo.slice(0, 5)}-${crudo.slice(5)}`;
}

/**
 * Normaliza lo que teclea una persona: ignora espacios, guiones y mayúsculas,
 * y acepta O→0, I/L→1. Devuelve null si no es un código válido.
 */
export function normalizarCodigo(entrada: string): string | null {
  const limpio = entrada
    .toUpperCase()
    .replace(/[\s-]/g, '')
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1');
  if (limpio.length !== LARGO_CODIGO) return null;
  for (const c of limpio) if (!ALFABETO.includes(c)) return null;
  return limpio;
}

// ---------------------------------------------------------------- base64

export function aBase64(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function deBase64(b64: string): Uint8Array<ArrayBuffer> {
  const s = atob(b64);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export function bytesAleatorios(n: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(n));
}

// ---------------------------------------------------------------- claves

/** Deriva la clave maestra del código. Es lenta a propósito: se calcula una vez por código. */
export async function derivarClaveMaestra(
  codigoNormalizado: string,
  sal: Uint8Array<ArrayBuffer>,
  iteraciones = ITERACIONES_PBKDF2,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', texto.encode(codigoNormalizado), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, base, 256);
  return crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
}

export type Sentido = 'paciente-a-medico' | 'medico-a-paciente';

async function claveDeSentido(maestra: CryptoKey, sal: Uint8Array<ArrayBuffer>, sentido: Sentido) {
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: sal, info: texto.encode(`techstar-v1 ${sentido}`) },
    maestra,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Una trama cifrada: contador y contenido en base64. */
export interface Trama {
  n: number;
  c: string;
}

export function esTrama(x: unknown): x is Trama {
  return (
    typeof x === 'object' &&
    x !== null &&
    Number.isSafeInteger((x as Trama).n) &&
    (x as Trama).n >= 0 &&
    typeof (x as Trama).c === 'string'
  );
}

export class ErrorCanal extends Error {}

/** Vector de inicialización de 12 bytes a partir del contador (único por clave). */
function ivDe(n: number): Uint8Array<ArrayBuffer> {
  const iv = new Uint8Array(12);
  new DataView(iv.buffer).setBigUint64(4, BigInt(n));
  return iv;
}

/**
 * Canal de una conexión. Cifra y descifra en orden estricto: las operaciones se encadenan
 * para que las tramas salgan y se procesen en el mismo orden en que se pidieron.
 */
export class CanalSeguro {
  private envio = 0;
  private recepcion = 0;
  private colaEnvio: Promise<unknown> = Promise.resolve();
  private colaRecepcion: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly claveEnvio: CryptoKey,
    private readonly claveRecepcion: CryptoKey,
    private readonly sentidoEnvio: Sentido,
    private readonly sentidoRecepcion: Sentido,
  ) {}

  /** Crea el canal de un extremo para una conexión concreta (nonces de ambos lados). */
  static async crear(
    maestra: CryptoKey,
    nonceServidor: Uint8Array,
    nonceCliente: Uint8Array,
    extremo: 'paciente' | 'medico',
  ): Promise<CanalSeguro> {
    const sal = new Uint8Array(nonceServidor.length + nonceCliente.length);
    sal.set(nonceServidor, 0);
    sal.set(nonceCliente, nonceServidor.length);
    const pam = await claveDeSentido(maestra, sal, 'paciente-a-medico');
    const map = await claveDeSentido(maestra, sal, 'medico-a-paciente');
    return extremo === 'paciente'
      ? new CanalSeguro(pam, map, 'paciente-a-medico', 'medico-a-paciente')
      : new CanalSeguro(map, pam, 'medico-a-paciente', 'paciente-a-medico');
  }

  cifrar(objeto: unknown): Promise<Trama> {
    const n = this.envio++;
    const tarea = this.colaEnvio.then(async () => {
      const datos = texto.encode(JSON.stringify(objeto));
      const cifrado = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: ivDe(n), additionalData: texto.encode(this.sentidoEnvio) },
        this.claveEnvio,
        datos,
      );
      return { n, c: aBase64(new Uint8Array(cifrado)) } satisfies Trama;
    });
    this.colaEnvio = tarea.catch(() => undefined);
    return tarea;
  }

  /** Rechaza (ErrorCanal) si la trama está alterada, repetida o fuera de orden. */
  descifrar(trama: unknown): Promise<unknown> {
    const tarea = this.colaRecepcion.then(async () => {
      if (!esTrama(trama)) throw new ErrorCanal('trama-invalida');
      if (trama.n !== this.recepcion) throw new ErrorCanal('trama-fuera-de-orden');
      let claro: ArrayBuffer;
      try {
        claro = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: ivDe(trama.n), additionalData: texto.encode(this.sentidoRecepcion) },
          this.claveRecepcion,
          deBase64(trama.c),
        );
      } catch {
        throw new ErrorCanal('no-autenticada');
      }
      this.recepcion++;
      return JSON.parse(lector.decode(claro)) as unknown;
    });
    this.colaRecepcion = tarea.catch(() => undefined);
    return tarea;
  }
}
