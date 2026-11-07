import type { CoordinadorSesion } from '../nucleo/coordinador';
import type { Rol } from '../nucleo/tipos';
import type { ConexionCliente } from './tipos';

/**
 * Transporte en memoria: coordinador y vista en la misma ventana.
 * Lo usan el modo «demostración en una pantalla» y la propia vista del médico.
 */
export function conectarLocal(coordinador: CoordinadorSesion, rol: Rol): ConexionCliente {
  const bajas = new Set<() => void>();
  return {
    rol,
    enviar: async (comando) => coordinador.procesar(rol, comando),
    alEvento(fn) {
      const baja = coordinador.suscribir(fn);
      bajas.add(baja);
      fn({ tipo: 'estado', instantanea: coordinador.instantanea() });
      return () => {
        baja();
        bajas.delete(baja);
      };
    },
    desconectar() {
      for (const baja of bajas) baja();
      bajas.clear();
    },
  };
}
