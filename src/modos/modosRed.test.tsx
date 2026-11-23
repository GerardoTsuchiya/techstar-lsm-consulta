import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAcuses, useSesion } from '../cliente/useSesion';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../nucleo/coordinador';
import type { Comando, Evento, InstantaneaSesion, Resultado } from '../nucleo/tipos';
import { type AnuncioRecibido, elegirMedico } from '../transporte/busqueda';
import { conectarPorIpc } from '../transporte/ipcElectron';
import type { PuenteMedico } from '../transporte/puente';
import type { ConexionCliente } from '../transporte/tipos';
import { conectarPorWebSocket } from '../transporte/websocket';
import { ModoPacienteRed } from './modosRed';

vi.mock('../transporte/busqueda', async (original) => ({
  ...(await original<typeof import('../transporte/busqueda')>()),
  elegirMedico: vi.fn(),
}));
// La pantalla no abre una conexión real: se comprueba a qué dirección intenta conectarse.
vi.mock('../transporte/websocket', async (original) => ({
  ...(await original<typeof import('../transporte/websocket')>()),
  conectarPorWebSocket: vi.fn(() => ({
    rol: 'paciente',
    enviar: async () => ({ ok: false, error: 'sin-conexion' }),
    alEvento: () => () => undefined,
    desconectar: () => undefined,
    estado: () => ({ fase: 'conectando', reconexiones: 0 }),
    alEstado: () => () => undefined,
  })),
}));

const ANUNCIO: AnuncioRecibido = {
  t: 'anuncio',
  app: 'lsm-consulta',
  v: 1,
  puerto: 47100,
  sal: 'c2Fs',
  huella: 'aHVlbGxh',
  ip: '192.168.1.20',
};

function conPuentePaciente(buscarMedicos: () => Promise<AnuncioRecibido[]>) {
  window.techstar = {
    modo: 'paciente',
    politica: 'desarrollo',
    equipo: { sistema: 'Prueba', arquitectura: 'x64', electron: '', chrome: '', node: '' },
    dispositivoId: 'equipo-paciente',
    paciente: { buscarMedicos: vi.fn(buscarMedicos) },
  };
}

describe('Modo paciente por red', () => {
  it('pide dirección y código válidos antes de intentar conectar', async () => {
    const usuario = userEvent.setup();
    render(<ModoPacienteRed />);
    await usuario.type(screen.getByLabelText('Dirección de la laptop del médico'), 'no es dirección');
    await usuario.click(screen.getByRole('button', { name: /Vincular/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/dirección/);

    await usuario.clear(screen.getByLabelText('Dirección de la laptop del médico'));
    await usuario.type(screen.getByLabelText('Dirección de la laptop del médico'), '192.168.1.20');
    await usuario.type(screen.getByLabelText('Código de vinculación'), 'abc');
    await usuario.click(screen.getByRole('button', { name: /Vincular/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/10 letras o números/);
    expect((screen.getByLabelText('Código de vinculación') as HTMLInputElement).value).toBe('ABC');
  });
});

describe('Modo paciente en la app de escritorio: vinculación solo con código (D56)', () => {
  beforeEach(() => vi.mocked(elegirMedico).mockReset());
  afterEach(() => {
    delete window.techstar;
  });

  it('busca solo, pide únicamente el código y se conecta al médico que coincide', async () => {
    conPuentePaciente(async () => [ANUNCIO]);
    vi.mocked(elegirMedico).mockResolvedValue({ tipo: 'encontrado', anuncio: ANUNCIO, url: 'ws://192.168.1.20:47100/techstar' });
    const usuario = userEvent.setup();
    render(<ModoPacienteRed />);

    expect(screen.queryByLabelText('Dirección de la laptop del médico')).toBeNull();
    expect(await screen.findByText('Computadora del médico encontrada en esta red')).toBeTruthy();
    await usuario.type(screen.getByLabelText('Código de vinculación'), 'abcde12345');
    await usuario.click(screen.getByRole('button', { name: /Vincular/ }));

    expect(vi.mocked(elegirMedico)).toHaveBeenCalledWith('ABCDE12345', [ANUNCIO]);
    expect(vi.mocked(conectarPorWebSocket)).toHaveBeenCalledWith(
      expect.objectContaining({ url: 'ws://192.168.1.20:47100/techstar', codigo: 'ABCDE12345', dispositivoId: 'equipo-paciente' }),
    );
    expect(await screen.findByText(/Conectando con/)).toBeTruthy();
    expect(screen.getByText('192.168.1.20:47100')).toBeTruthy();
  });

  it('si nadie responde, lo explica y ofrece buscar de nuevo o escribir la dirección', async () => {
    conPuentePaciente(async () => []);
    vi.mocked(elegirMedico).mockResolvedValue({ tipo: 'nadie' });
    const usuario = userEvent.setup();
    render(<ModoPacienteRed />);

    await usuario.type(screen.getByLabelText('Código de vinculación'), 'ABCDE-12345');
    await usuario.click(screen.getByRole('button', { name: /Vincular/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/No encontramos la computadora del médico/);
    expect(screen.getByRole('button', { name: 'Buscar de nuevo' })).toBeTruthy();

    await usuario.click(screen.getByRole('button', { name: 'Escribir la dirección' }));
    expect(screen.getByLabelText('Dirección de la laptop del médico')).toBeTruthy();
  });

  it('si hay médicos pero ninguno con ese código, pide revisar el código', async () => {
    conPuentePaciente(async () => [ANUNCIO]);
    vi.mocked(elegirMedico).mockResolvedValue({ tipo: 'sin-coincidencia' });
    const usuario = userEvent.setup();
    render(<ModoPacienteRed />);

    await usuario.type(screen.getByLabelText('Código de vinculación'), 'ABCDE-12345');
    await usuario.click(screen.getByRole('button', { name: /Vincular/ }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/ninguna tiene este código/);
  });

  it('el enlace «Conectar escribiendo la dirección» abre el formulario de respaldo', async () => {
    conPuentePaciente(async () => []);
    const usuario = userEvent.setup();
    render(<ModoPacienteRed />);
    await usuario.click(screen.getByRole('button', { name: 'Conectar escribiendo la dirección' }));
    expect(screen.getByLabelText('Dirección de la laptop del médico')).toBeTruthy();
    await waitFor(() => expect(window.techstar?.paciente?.buscarMedicos).toHaveBeenCalled());
  });
});

describe('Transporte IPC del médico (app de escritorio)', () => {
  it('entrega el estado al suscribirse y los comandos llegan como «médico»', async () => {
    const coordinador = new CoordinadorSesion({ catalogo: catalogoFicticio, politica: 'desarrollo' });
    const puente: PuenteMedico = {
      enviar: async (c) => coordinador.procesar('medico', c),
      alEvento: (fn) => coordinador.suscribir(fn),
      estadoActual: async () => ({ tipo: 'estado', instantanea: coordinador.instantanea() }),
      vinculacion: vi.fn(),
      alVinculacion: vi.fn(),
      desvincular: vi.fn(),
    };
    const conexion = conectarPorIpc(puente);
    const eventos: Evento[] = [];
    conexion.alEvento((e) => eventos.push(e));
    await vi.waitFor(() => expect(eventos).toHaveLength(1));
    expect(await conexion.enviar({ tipo: 'iniciarSesion' })).toMatchObject({ ok: true });
    expect(eventos.at(-1)).toMatchObject({ tipo: 'estado', instantanea: { mensajes: [] } });

    const caido = conectarPorIpc({ ...puente, enviar: () => Promise.reject(new Error('ventana cerrada')) });
    expect(await caido.enviar({ tipo: 'iniciarSesion' })).toEqual({ ok: false, error: 'sin-conexion' });
  });
});

describe('Acuses tras una caída de red (RF-20)', () => {
  it('si el acuse no llegó por falta de conexión, se repite con la siguiente instantánea', async () => {
    const respuestas: Resultado[] = [{ ok: false, error: 'sin-conexion' }, { ok: true }];
    const enviar = vi.fn(async (_c: Comando) => respuestas.shift()!);
    const instantanea = (): InstantaneaSesion => ({
      sesionId: 'ses-1',
      catalogoVersion: 'v',
      politica: 'desarrollo',
      aclaraciones: [],
      mensajes: [{ id: 'msg-1', sesionId: 'ses-1', origen: 'medico', entradaId: 'MED-P-01', texto: 't', recursoId: 'r', enviadoEn: 1 }],
    });
    const { rerender } = renderHook(({ i }) => useAcuses(i, 'paciente', enviar), { initialProps: { i: instantanea() } });
    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(1));
    // Al reconectar llega otra instantánea con el mensaje aún sin acuse.
    await new Promise((r) => setTimeout(r, 0));
    rerender({ i: instantanea() });
    await vi.waitFor(() => expect(enviar).toHaveBeenCalledTimes(2));
    rerender({ i: instantanea() });
    await new Promise((r) => setTimeout(r, 20));
    expect(enviar).toHaveBeenCalledTimes(2); // ya acusado: no se repite
  });
});

describe('Cierre perdido durante una caída de red', () => {
  it('si al reconectar ya no hay consulta, la vista la da por finalizada (RF-18)', () => {
    let emitir: (e: Evento) => void = () => {};
    const conexion: ConexionCliente = {
      rol: 'paciente',
      enviar: async () => ({ ok: true }),
      alEvento: (fn) => {
        emitir = fn;
        return () => {};
      },
      desconectar: () => {},
    };
    const { result } = renderHook(() => useSesion(conexion));
    act(() => emitir({ tipo: 'estado', instantanea: null }));
    expect(result.current.ultimaCerrada).toBeNull(); // al arrancar no había consulta
    act(() =>
      emitir({ tipo: 'estado', instantanea: { sesionId: 'ses-1', catalogoVersion: 'v', politica: 'desarrollo', mensajes: [], aclaraciones: [] } }),
    );
    // Se perdió el evento «sesionCerrada»; llega directamente la instantánea vacía.
    act(() => emitir({ tipo: 'estado', instantanea: null }));
    expect(result.current.instantanea).toBeNull();
    expect(result.current.ultimaCerrada).toBe('ses-1');
  });
});
