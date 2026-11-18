import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from '../../App';
import type { Recurso } from '../../nucleo/tipos';
import { RecursoLSM } from './RecursoLSM';

const validado: Recurso = {
  id: 'REC-PAC-S-01',
  tipo: 'video',
  estado: 'validado',
  descripcion: 'Seña de «Tengo dolor de cabeza.»',
  archivo: 'PAC-S-01.mp4',
  src: 'recursos/PAC-S-01.mp4',
  procedencia: 'Prueba',
  condicionesUso: 'Prueba',
  revisionLinguistica: 'Prueba',
  aprobacion: { quien: 'Prueba', fecha: '2026-11-20' },
  estadoReproduccion: 'Prueba',
};

describe('Recurso validado cuyo archivo falta o está dañado (RNF-03)', () => {
  it('reproduce el archivo local registrado', () => {
    render(<RecursoLSM disponibilidad={{ estado: 'validado', recurso: validado }} etiqueta="Tengo dolor de cabeza." />);
    expect(screen.getByLabelText('Video en LSM: Tengo dolor de cabeza.').getAttribute('src')).toBe('recursos/PAC-S-01.mp4');
  });

  it('si el video no carga, lo informa y no muestra otro recurso en su lugar', () => {
    const { container } = render(
      <RecursoLSM disponibilidad={{ estado: 'validado', recurso: validado }} etiqueta="Tengo dolor de cabeza." tamano="grande" />,
    );
    fireEvent.error(screen.getByLabelText('Video en LSM: Tengo dolor de cabeza.'));
    expect(screen.getByRole('img', { name: 'No se pudo cargar el recurso en LSM (falta o está dañado): Tengo dolor de cabeza.' })).toBeTruthy();
    expect(screen.getByText('Recurso dañado o faltante')).toBeTruthy();
    expect(container.querySelector('video, img')).toBeNull();
    expect(container.querySelector('[data-recurso]')).toBeNull();
  });
});

describe('Video de prueba: LSM de una fuente externa, sin validar (modo desarrollo)', () => {
  const deFuente: Recurso = { ...validado, id: 'REC-PRUEBA-PAC-S-01', estado: 'prueba', aprobacion: undefined };

  it('reproduce el archivo local y lo marca «sin validar»', () => {
    const { container } = render(
      <RecursoLSM disponibilidad={{ estado: 'prueba', recurso: deFuente }} etiqueta="Tengo dolor de cabeza." tamano="grande" />,
    );
    const video = screen.getByLabelText('Video en LSM sin validar: Tengo dolor de cabeza.');
    expect(video.getAttribute('src')).toBe('recursos/PAC-S-01.mp4');
    expect(screen.getByText('Prueba · LSM sin validar')).toBeTruthy();
    expect(container.querySelector('[data-recurso="REC-PRUEBA-PAC-S-01"]')).toBeTruthy();
    expect(container.querySelector('.recurso__silueta')).toBeNull();
  });

  it('si el video no carga, lo informa y no muestra otro recurso en su lugar', () => {
    const { container } = render(
      <RecursoLSM disponibilidad={{ estado: 'prueba', recurso: deFuente }} etiqueta="Tengo dolor de cabeza." tamano="grande" />,
    );
    fireEvent.error(screen.getByLabelText('Video en LSM sin validar: Tengo dolor de cabeza.'));
    expect(screen.getByText('Recurso dañado o faltante')).toBeTruthy();
    expect(container.querySelector('video, img')).toBeNull();
  });

  it('dentro de un botón (tarjeta) se reproduce en bucle, sin controles que capturen el clic', () => {
    render(
      <button type="button">
        <RecursoLSM disponibilidad={{ estado: 'prueba', recurso: deFuente }} etiqueta="Tengo dolor de cabeza." tamano="ancho" enBoton />
      </button>,
    );
    const video = screen.getByLabelText('Video en LSM sin validar: Tengo dolor de cabeza.') as HTMLVideoElement;
    expect(video.hasAttribute('controls')).toBe(false);
    expect(video.autoplay).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.muted).toBe(true);
  });

  it('un marcador de prueba sin archivo sigue mostrando la silueta', () => {
    const marcador: Recurso = { ...deFuente, tipo: 'marcador-prueba', archivo: undefined, src: undefined };
    const { container } = render(
      <RecursoLSM disponibilidad={{ estado: 'prueba', recurso: marcador }} etiqueta="Tengo dolor de cabeza." tamano="grande" />,
    );
    expect(container.querySelector('.recurso__silueta')).toBeTruthy();
    expect(screen.getByText('Prueba · no es LSM')).toBeTruthy();
    expect(container.querySelector('video')).toBeNull();
  });
});

describe('Catálogo con errores', () => {
  it('la app muestra los errores y no abre ningún modo', () => {
    render(<App erroresCatalogo={['Entrada PAC-S-01: falta el texto en español («texto») o está vacío.']} />);
    expect(screen.getByRole('heading', { name: 'El catálogo tiene errores' })).toBeTruthy();
    expect(screen.getByText(/Entrada PAC-S-01: falta el texto/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
