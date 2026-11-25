import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FabricaReconocedor } from './reconocimiento/reconocedor';
import type { TipoReconocedor } from './reconocimiento/tipoReconocedor';

/**
 * El modo paciente por red (`electron:paciente` con el experimental, `electron:paciente-simulado`) recibe el
 * reconocedor elegido en la línea de órdenes, igual que la demostración. Se sustituyen la pantalla y la fábrica para ver qué le llega.
 */

const fabricas = new Map<TipoReconocedor, FabricaReconocedor>();
const recibido = vi.fn();

vi.mock('./reconocimiento/fabrica', async (original) => ({
  ...(await original<typeof import('./reconocimiento/fabrica')>()),
  fabricaDeReconocedor: (tipo: TipoReconocedor) => {
    const f: FabricaReconocedor = () => null;
    fabricas.set(tipo, f);
    return f;
  },
}));
vi.mock('./modos/modosRed', () => ({
  ModoMedicoRed: () => null,
  ModoPacienteRed: (props: { crearReconocedor?: FabricaReconocedor }) => {
    recibido(props.crearReconocedor);
    return null;
  },
}));

const { App } = await import('./App');

function abrirCon(busqueda: string) {
  window.history.replaceState(null, '', `/${busqueda}`);
  render(<App erroresCatalogo={[]} />);
}

afterEach(() => {
  fabricas.clear();
  recibido.mockClear();
  window.history.replaceState(null, '', '/');
});

describe('Modo paciente por red', () => {
  it('con --reconocedor=experimental usa el reconocedor experimental', () => {
    abrirCon('?modo=paciente-red&reconocedor=experimental');
    expect(recibido).toHaveBeenCalledWith(fabricas.get('experimental'));
    expect(fabricas.get('experimental')).toBeTruthy();
  });

  it('sin la opción usa el simulador, como antes', () => {
    abrirCon('?modo=paciente-red');
    expect(fabricas.get('simulado')).toBeTruthy();
    expect(recibido).toHaveBeenCalledWith(fabricas.get('simulado'));
    expect(fabricas.has('experimental')).toBe(false);
  });
});
