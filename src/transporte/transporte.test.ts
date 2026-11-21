import { afterEach, describe, expect, it } from 'vitest';
import { leerConfiguracion } from '../App';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../nucleo/coordinador';
import type { Evento, InstantaneaSesion } from '../nucleo/tipos';
import { conectarPorBroadcastChannel, servirPorBroadcastChannel } from './broadcastChannel';
import { conectarLocal } from './local';

const limpiar: (() => void)[] = [];
afterEach(() => {
  while (limpiar.length) limpiar.pop()!();
});

function esperarEstado(eventos: Evento[], cumple: (i: InstantaneaSesion | null) => boolean, ms = 1500) {
  return new Promise<InstantaneaSesion | null>((resolver, rechazar) => {
    const inicio = Date.now();
    const revisar = () => {
      const e = [...eventos].reverse().find((x): x is Extract<Evento, { tipo: 'estado' }> => x.tipo === 'estado');
      if (e && cumple(e.instantanea)) return resolver(e.instantanea);
      if (Date.now() - inicio > ms) return rechazar(new Error('sin estado esperado'));
      setTimeout(revisar, 10);
    };
    revisar();
  });
}

describe('Transporte entre ventanas (BroadcastChannel)', () => {
  it('la vista remota recibe el estado y sus comandos llegan al coordinador', async () => {
    const canal = `prueba-${Math.random()}`;
    const coordinador = new CoordinadorSesion({ catalogo: catalogoFicticio, politica: 'desarrollo' });
    limpiar.push(servirPorBroadcastChannel(coordinador, canal));
    const medico = conectarLocal(coordinador, 'medico');
    const paciente = conectarPorBroadcastChannel('paciente', canal);
    limpiar.push(() => paciente.desconectar());

    const eventos: Evento[] = [];
    paciente.alEvento((e) => eventos.push(e));
    await medico.enviar({ tipo: 'iniciarSesion' });
    const inst = await esperarEstado(eventos, (i) => i !== null);

    const r = await paciente.enviar({
      tipo: 'confirmarMensajePaciente',
      sesionId: inst!.sesionId,
      envioId: 'e1',
      via: 'catalogo',
      selecciones: [{ entradaId: 'PAC-S-04' }],
      textosRevisados: ['Tengo fiebre.'],
    });
    expect(r.ok).toBe(true);
    expect(coordinador.instantanea()!.mensajes).toHaveLength(1);

    // El rol se valida en el coordinador también por este medio.
    const prohibido = await paciente.enviar({ tipo: 'iniciarSesion' });
    expect(prohibido).toEqual({ ok: false, error: 'rol-no-autorizado' });
  });

  it('sin coordinador responde «sin conexión» en lugar de fingir una entrega (RF-20)', async () => {
    const paciente = conectarPorBroadcastChannel('paciente', `vacio-${Math.random()}`);
    limpiar.push(() => paciente.desconectar());
    const r = await paciente.enviar({ tipo: 'acuseRecibo', sesionId: 's', mensajeId: 'm' });
    expect(r).toEqual({ ok: false, error: 'sin-conexion' });
  }, 6000);
});

describe('Configuración por dirección', () => {
  it('ante un valor desconocido usa la política estricta', () => {
    expect(leerConfiguracion('?modo=demo&recursos=desarrollo')).toEqual({ modo: 'demo', politica: 'desarrollo', reconocedor: 'simulado' });
    expect(leerConfiguracion('?modo=demo&recursos=otra')).toEqual({ modo: 'demo', politica: 'producto', reconocedor: 'simulado' });
    expect(leerConfiguracion('')).toEqual({ modo: null, politica: 'producto', reconocedor: 'simulado' });
    expect(leerConfiguracion('?modo=demo&recursos=desarrollo&reconocedor=experimental').reconocedor).toBe('experimental');
    expect(leerConfiguracion('?reconocedor=otro').reconocedor).toBe('simulado');
  });
});
