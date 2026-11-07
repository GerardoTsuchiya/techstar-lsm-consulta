import type { Comando, Evento, Resultado, Rol } from '../nucleo/tipos';

/**
 * Conexión de una vista con el coordinador de la sesión.
 * Las vistas solo conocen esta interfaz: no saben si el coordinador está
 * en la misma ventana, en otra ventana o (etapa B) en otra laptop.
 */
export interface ConexionCliente {
  readonly rol: Rol;
  enviar(comando: Comando): Promise<Resultado>;
  /** Recibe eventos. Al suscribirse llega el estado actual. */
  alEvento(fn: (evento: Evento) => void): () => void;
  desconectar(): void;
}
