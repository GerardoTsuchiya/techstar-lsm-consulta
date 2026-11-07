import type { CoordinadorSesion } from '../nucleo/coordinador';
import { generarId } from '../nucleo/ids';
import type { Comando, Evento, Resultado, Rol } from '../nucleo/tipos';
import type { ConexionCliente } from './tipos';

/**
 * Transporte entre dos ventanas del MISMO navegador en esta computadora.
 * Sirve para ensayar la separación médico/paciente antes de la etapa B,
 * donde se sustituirá por WebSocket en la red local con vinculación de dispositivos.
 * No ofrece seguridad: el rol lo declara la ventana (aceptable solo en loopback).
 */

type MensajeCanal =
  | { t: 'hola' }
  | { t: 'solicitud'; id: string; rol: Rol; comando: Comando }
  | { t: 'respuesta'; id: string; resultado: Resultado }
  | { t: 'evento'; evento: Evento };

export const CANAL_PREDETERMINADO = 'techstar-sesion';
const ESPERA_MAXIMA_MS = 3000;

/** Lado del coordinador (ventana del médico). Devuelve la función para dejar de servir. */
export function servirPorBroadcastChannel(
  coordinador: CoordinadorSesion,
  nombre = CANAL_PREDETERMINADO,
): () => void {
  const canal = new BroadcastChannel(nombre);
  const publicar = (m: MensajeCanal) => canal.postMessage(m);
  const baja = coordinador.suscribir((evento) => publicar({ t: 'evento', evento }));

  canal.onmessage = (e: MessageEvent<MensajeCanal>) => {
    const m = e.data;
    if (m.t === 'hola') {
      publicar({ t: 'evento', evento: { tipo: 'estado', instantanea: coordinador.instantanea() } });
    } else if (m.t === 'solicitud') {
      publicar({ t: 'respuesta', id: m.id, resultado: coordinador.procesar(m.rol, m.comando) });
    }
  };

  return () => {
    baja();
    canal.close();
  };
}

/** Lado de la vista remota (ventana del paciente). */
export function conectarPorBroadcastChannel(rol: Rol, nombre = CANAL_PREDETERMINADO): ConexionCliente {
  const canal = new BroadcastChannel(nombre);
  const pendientes = new Map<string, (r: Resultado) => void>();
  const oyentes = new Set<(e: Evento) => void>();

  canal.onmessage = (e: MessageEvent<MensajeCanal>) => {
    const m = e.data;
    if (m.t === 'respuesta') {
      pendientes.get(m.id)?.(m.resultado);
      pendientes.delete(m.id);
    } else if (m.t === 'evento') {
      for (const fn of oyentes) fn(m.evento);
    }
  };

  return {
    rol,
    enviar(comando) {
      const id = generarId('sol');
      return new Promise<Resultado>((resolver) => {
        const temporizador = setTimeout(() => {
          pendientes.delete(id);
          resolver({ ok: false, error: 'sin-conexion' });
        }, ESPERA_MAXIMA_MS);
        pendientes.set(id, (r) => {
          clearTimeout(temporizador);
          resolver(r);
        });
        canal.postMessage({ t: 'solicitud', id, rol, comando } satisfies MensajeCanal);
      });
    },
    alEvento(fn) {
      oyentes.add(fn);
      canal.postMessage({ t: 'hola' } satisfies MensajeCanal);
      return () => oyentes.delete(fn);
    },
    desconectar() {
      oyentes.clear();
      pendientes.clear();
      canal.close();
    },
  };
}
