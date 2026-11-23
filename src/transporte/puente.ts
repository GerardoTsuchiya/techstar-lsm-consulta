import type { Comando, Evento, PoliticaRecursos, Resultado } from '../nucleo/tipos';
import type { AnuncioRecibido } from './busqueda';
import type { MotivoRechazo } from './protocoloRed';

/**
 * Lo único que la app de escritorio (Electron) expone a las vistas, mediante `contextBridge`
 * (`window.techstar`). Las vistas no tienen acceso a Node: solo a estas funciones.
 * En el navegador (`npm run dev`) `window.techstar` no existe.
 */

export interface InfoEquipo {
  /** p. ej. «Windows_NT 10.0.19045 (Windows 10 Pro)» o «Darwin 24.1.0 (macOS)». */
  sistema: string;
  arquitectura: string;
  electron: string;
  chrome: string;
  node: string;
}

export interface EstadoVinculacion {
  escuchando: boolean;
  /** Mensaje si no se pudo abrir el puerto. */
  error: string | null;
  puerto: number;
  soloLocal: boolean;
  /** Direcciones de respaldo, si el equipo del paciente no encuentra al médico (D56). */
  direcciones: string[];
  /** Código vigente. Tras vincular solo sirve a la misma laptop (p. ej. si recarga su ventana). */
  codigo: string | null;
  vinculado: boolean;
  conectado: boolean;
  /** Identificador corto del equipo vinculado. */
  dispositivo: string | null;
  rechazados: number;
  ultimoRechazo: MotivoRechazo | null;
}

export interface PuenteMedico {
  enviar(comando: Comando): Promise<Resultado>;
  alEvento(fn: (evento: Evento) => void): () => void;
  estadoActual(): Promise<Evento>;
  vinculacion(): Promise<EstadoVinculacion>;
  alVinculacion(fn: (estado: EstadoVinculacion) => void): () => void;
  /** Suelta la laptop vinculada y genera un código nuevo. */
  desvincular(): Promise<EstadoVinculacion>;
}

/** Solo en el modo paciente de la app de escritorio (D56). */
export interface PuentePaciente {
  /** Busca la computadora del médico en la red local durante unos segundos. */
  buscarMedicos(): Promise<AnuncioRecibido[]>;
}

export interface PuenteTechStar {
  modo: 'medico' | 'paciente' | 'demo';
  politica: PoliticaRecursos;
  equipo: InfoEquipo;
  /** Identificador de este equipo mientras la app esté abierta (no se guarda en disco). */
  dispositivoId: string;
  /** Solo en el modo médico: acceso al coordinador del proceso principal. */
  medico?: PuenteMedico;
  /** Solo en el modo paciente: búsqueda del médico en la red local. */
  paciente?: PuentePaciente;
}

declare global {
  interface Window {
    techstar?: PuenteTechStar;
  }
}

export function puente(): PuenteTechStar | undefined {
  return typeof window === 'undefined' ? undefined : window.techstar;
}

export const CANALES_IPC = {
  enviar: 'techstar:enviar',
  estado: 'techstar:estado',
  evento: 'techstar:evento',
  vinculacion: 'techstar:vinculacion',
  cambioVinculacion: 'techstar:cambio-vinculacion',
  desvincular: 'techstar:desvincular',
  buscarMedicos: 'techstar:buscar-medicos',
} as const;
