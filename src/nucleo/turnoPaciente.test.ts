import { describe, expect, it } from 'vitest';
import { reducirTurno, turnoInicial, type AccionTurno, type EstadoTurno } from './turnoPaciente';

const aplicar = (acciones: AccionTurno[], desde: EstadoTurno = turnoInicial) => acciones.reduce(reducirTurno, desde);

describe('Turno del paciente', () => {
  it('selecciona varios síntomas y alterna la selección (RF-19)', () => {
    const e = aplicar([
      { tipo: 'alternarSeleccion', entradaId: 'A' },
      { tipo: 'alternarSeleccion', entradaId: 'B' },
      { tipo: 'alternarSeleccion', entradaId: 'A' },
    ]);
    expect(e).toEqual({ fase: 'seleccion', selecciones: [{ entradaId: 'B' }] });
  });

  it('la intensidad es opcional, sin valor por defecto, y solo admite 1–10', () => {
    let e = aplicar([{ tipo: 'alternarSeleccion', entradaId: 'A' }]);
    expect(e.fase === 'seleccion' && e.selecciones[0]).toEqual({ entradaId: 'A' });
    e = reducirTurno(e, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 11 });
    expect(e.fase === 'seleccion' && e.selecciones[0]).toEqual({ entradaId: 'A' });
    e = reducirTurno(e, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 4 });
    expect(e.fase === 'seleccion' && e.selecciones[0]).toEqual({ entradaId: 'A', intensidad: 4 });
    e = reducirTurno(e, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: undefined });
    expect(e.fase === 'seleccion' && e.selecciones[0]).toEqual({ entradaId: 'A' });
  });

  it('la intensidad puede indicarse en la revisión con un envioId nuevo; no mientras se envía', () => {
    const revision = aplicar([{ tipo: 'alternarSeleccion', entradaId: 'A' }, { tipo: 'revisar', envioId: 'e1' }]);
    // Sin envioId nuevo no cambia: un reintento no puede mezclar contenidos.
    expect(reducirTurno(revision, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 8 })).toBe(revision);
    const con = reducirTurno(revision, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 8, envioId: 'e2' });
    expect(con).toEqual({ fase: 'revision', via: 'catalogo', selecciones: [{ entradaId: 'A', intensidad: 8 }], envioId: 'e2' });
    const enviando = reducirTurno(con, { tipo: 'confirmarIniciado' });
    expect(reducirTurno(enviando, { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 2, envioId: 'e3' })).toBe(enviando);
  });

  it('no pasa a revisión sin selecciones', () => {
    expect(reducirTurno(turnoInicial, { tipo: 'revisar', envioId: 'e' })).toBe(turnoInicial);
  });

  it('«Modificar» regresa conservando la selección; «Descartar» la elimina (RF-13)', () => {
    const revision = aplicar([
      { tipo: 'alternarSeleccion', entradaId: 'A' },
      { tipo: 'fijarIntensidad', entradaId: 'A', intensidad: 6 },
      { tipo: 'revisar', envioId: 'e1' },
    ]);
    expect(revision.fase).toBe('revision');
    expect(reducirTurno(revision, { tipo: 'modificar' })).toEqual({
      fase: 'seleccion',
      selecciones: [{ entradaId: 'A', intensidad: 6 }],
    });
    expect(reducirTurno(revision, { tipo: 'descartar' })).toEqual(turnoInicial);
  });

  it('seleccionar no envía: solo la fase «enviando» lleva a confirmado', () => {
    const sel = aplicar([{ tipo: 'alternarSeleccion', entradaId: 'A' }]);
    expect(reducirTurno(sel, { tipo: 'confirmado' })).toBe(sel);
    expect(reducirTurno(sel, { tipo: 'confirmarIniciado' })).toBe(sel);
  });

  it('un fallo de envío vuelve a revisión con el MISMO envioId (reintento sin duplicar)', () => {
    const enviando = aplicar([
      { tipo: 'alternarSeleccion', entradaId: 'A' },
      { tipo: 'revisar', envioId: 'e1' },
      { tipo: 'confirmarIniciado' },
    ]);
    expect(enviando.fase).toBe('enviando');
    // Un segundo toque mientras se envía no cambia nada.
    expect(reducirTurno(enviando, { tipo: 'confirmarIniciado' })).toBe(enviando);
    const otraVez = reducirTurno(enviando, { tipo: 'confirmacionFallida' });
    expect(otraVez.fase === 'revision' && otraVez.envioId).toBe('e1');
    expect(reducirTurno(enviando, { tipo: 'confirmado' })).toEqual(turnoInicial);
  });

  describe('captura (preparado para la etapa C)', () => {
    it('cancelar descarta sin pasar por procesamiento (RF-17)', () => {
      const e = aplicar([{ tipo: 'iniciarCaptura', capturaId: 'c1' }, { tipo: 'cancelarCaptura' }]);
      expect(e).toEqual(turnoInicial);
      // Un resultado tardío de la captura cancelada se ignora.
      expect(reducirTurno(e, { tipo: 'resultadoReconocimiento', capturaId: 'c1', entradaId: 'A', envioId: 'x' })).toEqual(
        turnoInicial,
      );
    });

    it('«Listo» pide reconocimiento; un resultado reconocido queda pendiente de revisión (RF-01)', () => {
      const e = aplicar([
        { tipo: 'iniciarCaptura', capturaId: 'c1' },
        { tipo: 'capturaLista' },
        { tipo: 'resultadoReconocimiento', capturaId: 'c1', entradaId: 'A', envioId: 'e9' },
      ]);
      expect(e).toEqual({ fase: 'revision', via: 'camara', selecciones: [{ entradaId: 'A' }], envioId: 'e9' });
    });

    it('expresión no reconocida ofrece reintento o catálogo (RF-05)', () => {
      const e = aplicar([
        { tipo: 'iniciarCaptura', capturaId: 'c1' },
        { tipo: 'capturaLista' },
        { tipo: 'resultadoReconocimiento', capturaId: 'c1', entradaId: null, envioId: 'x' },
      ]);
      expect(e.fase).toBe('no-reconocido');
      expect(reducirTurno(e, { tipo: 'iniciarCaptura', capturaId: 'c2' })).toEqual({ fase: 'capturando', capturaId: 'c2' });
      expect(reducirTurno(e, { tipo: 'irAlCatalogo' })).toEqual(turnoInicial);
    });

    it('descarta resultados de otra captura', () => {
      const e = aplicar([{ tipo: 'iniciarCaptura', capturaId: 'c2' }, { tipo: 'capturaLista' }]);
      expect(reducirTurno(e, { tipo: 'resultadoReconocimiento', capturaId: 'c1', entradaId: 'A', envioId: 'x' })).toBe(e);
    });
  });
});
