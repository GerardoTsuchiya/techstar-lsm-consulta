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

describe('Catálogo con errores', () => {
  it('la app muestra los errores y no abre ningún modo', () => {
    render(<App erroresCatalogo={['Entrada PAC-S-01: falta el texto en español («texto») o está vacío.']} />);
    expect(screen.getByRole('heading', { name: 'El catálogo tiene errores' })).toBeTruthy();
    expect(screen.getByText(/Entrada PAC-S-01: falta el texto/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});
