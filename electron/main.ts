import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent, session } from 'electron';
import { catalogoFicticio } from '../src/catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../src/nucleo/coordinador';
import type { Evento } from '../src/nucleo/tipos';
import { esComando } from '../src/transporte/protocoloRed';
import { CANALES_IPC, type EstadoVinculacion, type InfoEquipo, type PuenteTechStar } from '../src/transporte/puente';
import { leerArgumentos } from './argumentos';
import { iniciarServidorRed, type ServidorRed } from './servidor/servidorRed';

/**
 * Proceso principal de la app de escritorio (etapa B).
 *   --modo=medico    aloja el coordinador y el servidor WebSocket de la red local
 *   --modo=paciente  vista del paciente; se conecta por WebSocket a la laptop del médico
 *   --modo=demo      las dos vistas en una pantalla, sin red (respaldo)
 * Las vistas corren aisladas de Node: contextIsolation, sandbox y sin nodeIntegration.
 */

const args = leerArgumentos(process.argv);
const PARTICION = 'techstar'; // sin «persist:»: caché y almacenamiento solo en memoria (RF-18)

// Un directorio de datos por modo: médico y paciente pueden abrirse a la vez en una computadora.
app.setPath('userData', path.join(app.getPath('appData'), 'techstar-lsm-consulta', args.modo));

function infoEquipo(): InfoEquipo {
  return {
    sistema: `${os.type()} ${os.release()} (${os.version()})`,
    arquitectura: os.arch(),
    electron: process.versions.electron ?? '',
    chrome: process.versions.chrome ?? '',
    node: process.versions.node,
  };
}

let ventana: BrowserWindow | null = null;
let servidor: ServidorRed | null = null;
let errorServidor: string | null = null;

/** Solo la ventana propia, con la página empaquetada, puede hablar con el coordinador. */
function remitenteValido(e: IpcMainInvokeEvent): boolean {
  return e.sender === ventana?.webContents && (e.senderFrame?.url ?? '').startsWith('file://');
}

function estadoVinculacion(): EstadoVinculacion {
  if (servidor) return servidor.estado();
  return {
    escuchando: false,
    error: errorServidor,
    puerto: args.puerto,
    soloLocal: args.soloLocal,
    direcciones: [],
    codigo: null,
    vinculado: false,
    conectado: false,
    dispositivo: null,
    rechazados: 0,
    ultimoRechazo: null,
  };
}

async function prepararMedico() {
  // El coordinador vive solo en la memoria de este proceso: al cerrar la app desaparece (RF-18).
  const c = new CoordinadorSesion({ catalogo: catalogoFicticio, politica: args.politica });
  try {
    servidor = await iniciarServidorRed({
      coordinador: c,
      host: args.soloLocal ? '127.0.0.1' : '0.0.0.0',
      puerto: args.puerto,
    });
    servidor.alCambio((estado) => ventana?.webContents.send(CANALES_IPC.cambioVinculacion, estado));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    errorServidor =
      err.code === 'EADDRINUSE'
        ? `El puerto ${args.puerto} ya está en uso. ¿Hay otra ventana del médico abierta?`
        : `No se pudo abrir la conexión de red (${err.code ?? err.message}).`;
  }

  c.suscribir((evento: Evento) => ventana?.webContents.send(CANALES_IPC.evento, evento));

  ipcMain.handle(CANALES_IPC.enviar, (e, comando: unknown) => {
    if (!remitenteValido(e)) return { ok: false, error: 'rol-no-autorizado' };
    if (!esComando(comando)) return { ok: false, error: 'comando-invalido' };
    return c.procesar('medico', comando);
  });
  ipcMain.handle(CANALES_IPC.estado, (e) => {
    if (!remitenteValido(e)) return null;
    return { tipo: 'estado', instantanea: c.instantanea() } satisfies Evento;
  });
  ipcMain.handle(CANALES_IPC.vinculacion, (e) => (remitenteValido(e) ? estadoVinculacion() : null));
  ipcMain.handle(CANALES_IPC.desvincular, async (e) => {
    if (!remitenteValido(e) || !servidor) return estadoVinculacion();
    return servidor.desvincular();
  });
}

function crearVentana() {
  const config: Omit<PuenteTechStar, 'medico'> = {
    modo: args.modo,
    politica: args.politica,
    equipo: infoEquipo(),
    dispositivoId: randomUUID(),
  };
  const titulos = { medico: 'Médico', paciente: 'Paciente', demo: 'Demostración en una pantalla' };

  ventana = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: `LSM Consulta · ${titulos[args.modo]}`,
    backgroundColor: '#FCF9F2',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      partition: PARTICION,
      spellcheck: false,
      additionalArguments: [`--techstar-config=${encodeURIComponent(JSON.stringify(config))}`],
    },
  });
  ventana.on('page-title-updated', (e) => e.preventDefault());

  // Sin navegación a otras páginas ni ventanas nuevas.
  ventana.webContents.on('will-navigate', (e) => e.preventDefault());
  ventana.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  const modoVista = { medico: 'medico-red', paciente: 'paciente-red', demo: 'demo' }[args.modo];
  void ventana.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
    query: { modo: modoVista, recursos: args.politica },
  });
  ventana.on('closed', () => {
    ventana = null;
  });
}

app.on('web-contents-created', (_e, contenido) => {
  contenido.on('will-attach-webview', (e) => e.preventDefault());
});

void app.whenReady().then(async () => {
  // Ningún permiso (cámara, micrófono, notificaciones…) hasta la etapa C.
  for (const s of [session.defaultSession, session.fromPartition(PARTICION)]) {
    s.setPermissionRequestHandler((_wc, _permiso, responder) => responder(false));
    s.setPermissionCheckHandler(() => false);
  }
  if (args.modo === 'medico') await prepararMedico();
  crearVentana();
});

app.on('window-all-closed', () => {
  void servidor?.cerrar();
  app.quit();
});
