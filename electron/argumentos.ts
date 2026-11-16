import type { PoliticaRecursos } from '../src/nucleo/tipos';
import { PUERTO_PREDETERMINADO } from '../src/transporte/protocoloRed';

export type ModoApp = 'medico' | 'paciente' | 'demo';

export interface Argumentos {
  modo: ModoApp;
  politica: PoliticaRecursos;
  puerto: number;
  /** Escuchar solo en 127.0.0.1 (pruebas con dos procesos en una computadora). */
  soloLocal: boolean;
}

/**
 * Lee la línea de órdenes: `--modo=medico|paciente|demo --recursos=desarrollo|producto
 * --puerto=47100 --solo-local`. Ante un valor desconocido elige la opción segura.
 */
export function leerArgumentos(argv: readonly string[]): Argumentos {
  const valor = (nombre: string) => {
    const prefijo = `--${nombre}=`;
    return argv.find((a) => a.startsWith(prefijo))?.slice(prefijo.length);
  };
  const modo = valor('modo');
  const puerto = Number(valor('puerto') ?? PUERTO_PREDETERMINADO);
  return {
    modo: modo === 'medico' || modo === 'paciente' ? modo : 'demo',
    politica: valor('recursos') === 'desarrollo' ? 'desarrollo' : 'producto',
    puerto: Number.isInteger(puerto) && puerto > 0 && puerto < 65536 ? puerto : PUERTO_PREDETERMINADO,
    soloLocal: argv.includes('--solo-local'),
  };
}
