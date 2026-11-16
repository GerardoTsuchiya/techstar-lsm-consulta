import { describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import type { ClipTemporal } from '../camara/adaptador';
import { entradasDelPaciente, reconocedorPorPolitica } from './reconocedor';
import { esSimulado, ReconocedorSimulado } from './reconocedorSimulado';

const clip = (capturaId: string): ClipTemporal => ({ capturaId, datos: new Blob(['x']), duracionMs: 1000 });

describe('Reconocedor', () => {
  it('el simulador nunca está disponible en el flujo de producto', () => {
    expect(reconocedorPorPolitica('producto', catalogoFicticio)).toBeNull();
    expect(() => new ReconocedorSimulado('producto', [])).toThrow(/solo puede usarse en modo desarrollo/);
    const r = reconocedorPorPolitica('desarrollo', catalogoFicticio);
    expect(esSimulado(r)).toBe(true);
    expect(r?.simulado).toBe(true);
    expect(r?.nombre).toMatch(/no reconoce LSM/);
  });

  it('el vocabulario del simulador son solo las entradas del paciente', () => {
    const r = reconocedorPorPolitica('desarrollo', catalogoFicticio)!;
    expect(r.vocabulario).toEqual(entradasDelPaciente(catalogoFicticio));
    expect(r.vocabulario).toContain('PAC-S-01');
    expect(r.vocabulario.some((id) => id.startsWith('MED-'))).toBe(false);
  });

  it('espera la decisión del operador para la captura en curso', async () => {
    const r = new ReconocedorSimulado('desarrollo', ['PAC-S-04']);
    const avisos: (string | null)[] = [];
    r.alPendiente((id) => avisos.push(id));
    const promesa = r.reconocer(clip('cap-1'), new AbortController().signal);
    expect(r.capturaPendiente).toBe('cap-1');
    expect(r.elegir('cap-otra', { tipo: 'desconocido' })).toBe(false);
    expect(r.elegir('cap-1', { tipo: 'reconocido', entradaId: 'MED-P-01' })).toBe(false); // fuera del vocabulario
    expect(r.elegir('cap-1', { tipo: 'reconocido', entradaId: 'PAC-S-04' })).toBe(true);
    expect(await promesa).toEqual({ tipo: 'reconocido', entradaId: 'PAC-S-04' });
    expect(r.capturaPendiente).toBeNull();
    expect(avisos).toEqual(['cap-1', null]);
  });

  it('al cancelar deja de esperar y una decisión tardía no tiene efecto', async () => {
    const r = new ReconocedorSimulado('desarrollo', ['PAC-S-04']);
    const control = new AbortController();
    const promesa = r.reconocer(clip('cap-1'), control.signal);
    control.abort();
    await expect(promesa).rejects.toBeDefined();
    expect(r.capturaPendiente).toBeNull();
    expect(r.elegir('cap-1', { tipo: 'desconocido' })).toBe(false);
  });
});
