import type { Resultado } from '../nucleo/tipos';
import type { PuenteMedico } from './puente';
import type { ConexionCliente } from './tipos';

/**
 * Transporte de la vista del médico en la app de escritorio: el coordinador vive en el
 * proceso principal de Electron y se alcanza por IPC a través del puente aislado (preload).
 * El rol «médico» lo fija el proceso principal, no esta ventana.
 */
export function conectarPorIpc(medico: PuenteMedico): ConexionCliente {
  const bajas = new Set<() => void>();
  return {
    rol: 'medico',
    enviar: (comando) =>
      medico.enviar(comando).catch((): Resultado => ({ ok: false, error: 'sin-conexion' })),
    alEvento(fn) {
      const baja = medico.alEvento(fn);
      bajas.add(baja);
      void medico.estadoActual().then(fn);
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
