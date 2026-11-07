import { describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { buscarPorTermino, normalizar } from './busqueda';
import { recursoDeEntrada, resolverRecurso } from './recursos';
import type { TipoEntrada } from './tipos';

const MEDICO: TipoEntrada[] = ['pregunta-medico', 'respuesta-medico'];
const ids = (r: { id: string }[] | null) => r?.map((e) => e.id);

describe('Búsqueda en el catálogo (RF-14)', () => {
  it('ignora mayúsculas y tildes', () => {
    expect(ids(buscarPorTermino(catalogoFicticio.entradas, 'VOMITO', MEDICO))).toEqual(['MED-P-06']);
    expect(ids(buscarPorTermino(catalogoFicticio.entradas, 'Cuando', MEDICO))).toEqual(['MED-P-01']);
    expect(ids(buscarPorTermino(catalogoFicticio.entradas, 'intérprete', MEDICO))).toEqual(['MED-R-03']);
  });

  it('busca por parte del término', () => {
    expect(ids(buscarPorTermino(catalogoFicticio.entradas, 'medica', MEDICO))).toEqual(['MED-P-03', 'MED-P-04']);
  });

  it('una búsqueda vacía no se ejecuta; sin coincidencias devuelve lista vacía', () => {
    expect(buscarPorTermino(catalogoFicticio.entradas, '   ', MEDICO)).toBeNull();
    expect(buscarPorTermino(catalogoFicticio.entradas, 'cirugía', MEDICO)).toEqual([]);
  });

  it('solo busca en los tipos pedidos', () => {
    // «fiebre» existe como síntoma del paciente y como pregunta del médico.
    expect(ids(buscarPorTermino(catalogoFicticio.entradas, 'fiebre', MEDICO))).toEqual(['MED-P-05']);
  });

  it('conserva la ñ', () => {
    expect(normalizar('AÑO Árbol')).toBe('año arbol');
  });
});

describe('Política de recursos (RI-01)', () => {
  const entrada = (id: string) => catalogoFicticio.entradas.find((e) => e.id === id)!;

  it('sin recurso: bloqueado en ambos modos', () => {
    expect(recursoDeEntrada(catalogoFicticio, entrada('MED-P-06'), 'desarrollo')).toEqual({ estado: 'bloqueado', motivo: 'sin-recurso' });
    expect(recursoDeEntrada(catalogoFicticio, entrada('MED-P-06'), 'producto')).toEqual({ estado: 'bloqueado', motivo: 'sin-recurso' });
  });

  it('recurso de prueba: visible como prueba en desarrollo, bloqueado en producto', () => {
    expect(recursoDeEntrada(catalogoFicticio, entrada('MED-P-01'), 'desarrollo').estado).toBe('prueba');
    const p = recursoDeEntrada(catalogoFicticio, entrada('MED-P-01'), 'producto');
    expect(p.estado === 'bloqueado' && p.motivo).toBe('recurso-no-validado');
  });

  it('un identificador inexistente no se sustituye por otro recurso', () => {
    expect(resolverRecurso(catalogoFicticio, 'REC-NO-EXISTE', 'desarrollo')).toEqual({ estado: 'bloqueado', motivo: 'sin-recurso' });
  });

  it('todas las asociaciones del catálogo apuntan a recursos existentes', () => {
    const existentes = new Set(catalogoFicticio.recursos.map((r) => r.id));
    for (const e of catalogoFicticio.entradas) if (e.recursoId) expect(existentes.has(e.recursoId)).toBe(true);
    for (const id of Object.values(catalogoFicticio.recursosSistema)) expect(existentes.has(id!)).toBe(true);
  });

  it('ningún recurso del catálogo ficticio figura como validado', () => {
    expect(catalogoFicticio.recursos.every((r) => r.estado === 'prueba')).toBe(true);
  });
});
