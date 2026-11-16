import type { CodigoError } from '../../nucleo/tipos';

export const MENSAJES_ERROR: Record<CodigoError, string> = {
  'sin-sesion': 'No hay una consulta activa.',
  'sesion-abierta': 'Ya hay una consulta activa.',
  'sesion-incorrecta': 'El mensaje pertenece a otra consulta y no se entregó.',
  'sesion-cerrada': 'La consulta ya terminó. El mensaje no se entregó.',
  'rol-no-autorizado': 'Esta pantalla no puede realizar esa acción.',
  'seleccion-vacia': 'Elige al menos una opción.',
  'seleccion-repetida': 'Hay una opción repetida.',
  'entrada-desconocida': 'La opción no existe en el catálogo.',
  'tipo-no-permitido': 'Esa opción no corresponde a esta pantalla.',
  'recurso-no-disponible': 'Falta el recurso en LSM validado. No se puede enviar.',
  'intensidad-invalida': 'La intensidad debe ser un número del 1 al 10.',
  'contenido-no-coincide': 'El contenido cambió desde la revisión. Revísalo de nuevo.',
  'mensaje-no-encontrado': 'No se encontró el mensaje.',
  'sin-conexion': 'Sin conexión con la computadora del médico. Intenta de nuevo.',
  'comando-invalido': 'La computadora del médico no reconoció la solicitud.',
};

/** Título corto de una entrada, como en las tarjetas del prototipo («Dolor de cabeza»). */
export function tituloDe(entrada: { termino: string }): string {
  const t = entrada.termino;
  return t.charAt(0).toLocaleUpperCase('es-MX') + t.slice(1);
}

export function horaCorta(ms: number): string {
  return new Date(ms).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}
