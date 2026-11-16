import { contextBridge, ipcRenderer } from 'electron';
import type { Comando, Evento, Resultado } from '../src/nucleo/tipos';
import { CANALES_IPC, type EstadoVinculacion, type PuenteTechStar } from '../src/transporte/puente';

/**
 * Puente aislado entre la vista y el proceso principal (contextIsolation + sandbox).
 * La vista no recibe `ipcRenderer` ni nada de Node: solo las funciones de `PuenteTechStar`.
 */

const PREFIJO = '--techstar-config=';
const crudo = process.argv.find((a) => a.startsWith(PREFIJO))?.slice(PREFIJO.length) ?? '';
const config = JSON.parse(decodeURIComponent(crudo)) as Omit<PuenteTechStar, 'medico'>;

function suscribir<T>(canal: string, fn: (dato: T) => void): () => void {
  const oyente = (_e: Electron.IpcRendererEvent, dato: T) => fn(dato);
  ipcRenderer.on(canal, oyente);
  return () => {
    ipcRenderer.removeListener(canal, oyente);
  };
}

const puente: PuenteTechStar = {
  ...config,
  ...(config.modo === 'medico'
    ? {
        medico: {
          enviar: (comando: Comando) => ipcRenderer.invoke(CANALES_IPC.enviar, comando) as Promise<Resultado>,
          alEvento: (fn: (e: Evento) => void) => suscribir(CANALES_IPC.evento, fn),
          estadoActual: () => ipcRenderer.invoke(CANALES_IPC.estado) as Promise<Evento>,
          vinculacion: () => ipcRenderer.invoke(CANALES_IPC.vinculacion) as Promise<EstadoVinculacion>,
          alVinculacion: (fn: (e: EstadoVinculacion) => void) => suscribir(CANALES_IPC.cambioVinculacion, fn),
          desvincular: () => ipcRenderer.invoke(CANALES_IPC.desvincular) as Promise<EstadoVinculacion>,
        },
      }
    : {}),
};

contextBridge.exposeInMainWorld('techstar', puente);
