import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { catalogoFicticio } from '../../catalogo/catalogoFicticio';
import { ModoDemostracion } from '../../modos/modos';
import { CamaraFalsa } from '../../pruebas/camaraFalsa';
import { secuencia, circulo } from '../../pruebas/secuenciasSinteticas';
import { PASOS, PESOS } from '../../reconocimiento/experimental/caracteristicas';
import type { ModeloReconocedor } from '../../reconocimiento/experimental/clasificador';
import type { ExtractorPuntos } from '../../reconocimiento/experimental/extractorMediaPipe';
import type { CuadroPuntos, Punto } from '../../reconocimiento/experimental/puntos';
import { ReconocedorExperimental } from '../../reconocimiento/experimental/reconocedorExperimental';
import type { FabricaReconocedor } from '../../reconocimiento/reconocedor';
import { reconocedorPorPolitica } from '../../reconocimiento/reconocedor';
import { CONEXIONES_MANO, dibujarPuntos, resumenPuntos } from './PuntosEnVivo';

/**
 * Puntos en vivo sobre la cámara (solo modo desarrollo, reconocedor experimental). jsdom no tiene
 * MediaPipe ni lienzo: el detector y el contexto 2D son falsos.
 */

const mano: Punto[] = Array.from({ length: 21 }, (_, i): Punto => [100 + i, 200 + i]);
const cuadro: CuadroPuntos = { t: 0, hombros: [[50, 300], [250, 300]], manos: [mano] };

const modelo: ModeloReconocedor = {
  version: 1,
  descripcion: 'prueba',
  pasos: PASOS,
  pesos: PESOS,
  banda: 5,
  umbralDistancia: 0.5,
  umbralMargen: 0.8,
  plantillas: [],
};

function ctxFalso() {
  const llamadas = { arc: 0, stroke: 0, clearRect: 0 };
  const ctx = {
    clearRect: () => void llamadas.clearRect++,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arc: () => void llamadas.arc++,
    fill: () => {},
    stroke: () => void llamadas.stroke++,
  } as unknown as CanvasRenderingContext2D;
  return { ctx, llamadas };
}

function experimental(extractor: ExtractorPuntos): FabricaReconocedor {
  return (pol, cat) => new ReconocedorExperimental(pol, cat, { cargarModelo: async () => modelo, extractor: async () => extractor });
}

async function abrirCaptura(crearReconocedor: FabricaReconocedor) {
  const user = userEvent.setup();
  render(<ModoDemostracion politica="desarrollo" crearCamara={() => new CamaraFalsa()} crearReconocedor={crearReconocedor} />);
  const paciente = () => within(screen.getByRole('region', { name: 'Vista del paciente' }));
  const medico = () => within(screen.getByRole('region', { name: 'Vista del personal médico' }));
  await user.click(medico().getByRole('button', { name: 'Iniciar consulta' }));
  await user.click(within(await paciente().findByRole('dialog', { name: 'Alcance de este apoyo' })).getByRole('button', { name: /Entendido/ }));
  await paciente().findByRole('button', { name: /Listo/ });
  return { user, paciente };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('dibujo de los puntos', () => {
  it('resume lo que se ve en el cuadro', () => {
    expect(resumenPuntos(null)).toBe('Buscando manos y hombros…');
    expect(resumenPuntos(cuadro)).toBe('Manos: 1 · Hombros: sí');
    expect(resumenPuntos({ t: 0, hombros: null, manos: [mano, mano] })).toBe('Manos: 2 · Hombros: no');
  });

  it('dibuja los 21 puntos de cada mano con sus uniones y los dos hombros', () => {
    const { ctx, llamadas } = ctxFalso();
    dibujarPuntos(ctx, 640, 480, { ...cuadro, manos: [mano, mano] });
    expect(llamadas.arc).toBe(2 * 21 + 2);
    // Cada unión se traza dos veces (contorno y color) y cada punto una (contorno).
    expect(llamadas.stroke).toBe(2 * (2 * CONEXIONES_MANO.length + 1) + 2 * 21 + 2);
  });

  it('sin cuadro solo limpia el lienzo', () => {
    const { ctx, llamadas } = ctxFalso();
    dibujarPuntos(ctx, 640, 480, null);
    expect(llamadas).toEqual({ arc: 0, stroke: 0, clearRect: 1 });
  });
});

describe('detector en vivo del reconocedor experimental', () => {
  it('usa el mismo extractor que el reconocimiento', async () => {
    const detectarCuadro = vi.fn(() => cuadro);
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => ({ extraer: async () => secuencia(circulo), detectarCuadro }),
    });
    const detector = await r.detectorEnVivo();
    const video = document.createElement('video');
    expect(detector?.(video)).toBe(cuadro);
    expect(detectarCuadro).toHaveBeenCalledWith(video);
  });

  it('no hay detector si el extractor no lo ofrece o el modelo no carga', async () => {
    const sinDetector = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => ({ extraer: async () => secuencia(circulo) }),
    });
    expect(await sinDetector.detectorEnVivo()).toBeNull();
    const roto = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: () => Promise.reject(new Error('sin modelo')),
      extractor: async () => ({ extraer: async () => secuencia(circulo), detectarCuadro: () => cuadro }),
    });
    expect(await roto.detectorEnVivo()).toBeNull();
  });
});

describe('pantalla de captura', () => {
  it('con el reconocedor experimental dibuja los puntos en vivo sobre la cámara', async () => {
    const { ctx, llamadas } = ctxFalso();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never);
    const detectarCuadro = vi.fn(() => cuadro);
    await abrirCaptura(experimental({ extraer: async () => secuencia(circulo), detectarCuadro }));

    expect(document.querySelector('[data-puntos-en-vivo="lienzo"]')).toBeTruthy();
    await vi.waitFor(() => expect(llamadas.arc).toBeGreaterThanOrEqual(21 + 2));
    expect(detectarCuadro).toHaveBeenCalled();
    // El resumen va DEBAJO de la cámara, nunca encima: taparía los puntos (p. ej. la línea de los hombros).
    const resumen = await screen.findByText('Manos: 1 · Hombros: sí', { exact: false });
    expect(resumen.closest('[data-puntos-en-vivo="resumen"]')).toBeTruthy();
    expect(resumen.closest('.captura__video')).toBeNull();
  });

  it('si no se puede preparar la detección lo dice debajo de la cámara', async () => {
    await abrirCaptura(experimental({ extraer: async () => secuencia(circulo) }));
    const aviso = await screen.findByText(/No se pudo preparar la detección de puntos/);
    expect(aviso.closest('.captura__video')).toBeNull();
  });

  it('al pulsar «Listo» deja de detectar en vivo', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctxFalso().ctx as never);
    const detectarCuadro = vi.fn(() => cuadro);
    const { user, paciente } = await abrirCaptura(experimental({ extraer: async () => secuencia(circulo), detectarCuadro }));
    await vi.waitFor(() => expect(detectarCuadro).toHaveBeenCalled());
    await user.click(paciente().getByRole('button', { name: /Listo/ }));
    const veces = detectarCuadro.mock.calls.length;
    await new Promise((r) => setTimeout(r, 150));
    expect(detectarCuadro.mock.calls.length).toBe(veces);
    expect(document.querySelector('[data-puntos-en-vivo]')).toBeNull();
  });

  it('con el simulador no hay puntos (no analiza la imagen)', async () => {
    const { paciente } = await abrirCaptura(reconocedorPorPolitica);
    expect(paciente().getByRole('button', { name: /Listo/ })).toBeTruthy();
    expect(document.querySelector('[data-puntos-en-vivo]')).toBeNull();
  });
});
