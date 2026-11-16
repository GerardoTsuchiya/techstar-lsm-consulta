import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useAcuses, useSesion } from '../cliente/useSesion';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../nucleo/coordinador';
import type { Comando, Evento, InstantaneaSesion, Resultado } from '../nucleo/tipos';
import { conectarPorIpc } from '../transporte/ipcElectron';
import type { PuenteMedico } from '../transporte/puente';
import type { ConexionCliente } from '../transporte/tipos';
import { ModoPacienteRed } from './modosRed';

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
