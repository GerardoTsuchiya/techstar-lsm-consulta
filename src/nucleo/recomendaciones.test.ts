import { describe, expect, it } from 'vitest';
import { sugerencias } from './recomendaciones';
import type { Catalogo, EntradaCatalogo, Mensaje } from './tipos';

const entrada = (id: string, tipo: EntradaCatalogo['tipo'], recomendadas?: string[]): EntradaCatalogo => ({
  id, tipo, significado: id, termino: id, texto: id, icono: 'si', ...(recomendadas ? { recomendadas } : {}),
});

const catalogo: Catalogo = {
  version: 'prueba',
  ficticio: true,
  recursos: [],
  recursosSistema: {},
  entradas: [
    entradaSintoma('S-TOS', ['P-DESDE', 'P-FLEMAS']),
    entradaSintoma('S-FIEBRE', ['P-DESDE', 'P-ESCALOFRIOS']),
    entradaSintoma('S-SIN', undefined),
    entrada('P-DESDE', 'pregunta-medico'),
    entrada('P-FLEMAS', 'pregunta-medico'),
    entrada('P-ESCALOFRIOS', 'pregunta-medico'),
    entrada('P-ALERGIA', 'pregunta-medico'),
    entrada('P-MEDICAMENTO', 'pregunta-medico'),
    entrada('R-SI', 'respuesta-paciente'),
  ],
  preguntasGenerales: ['P-ALERGIA', 'P-MEDICAMENTO', 'P-FLEMAS'],
};

function entradaSintoma(id: string, recomendadas: string[] | undefined) {
  return entrada(id, 'sintoma', recomendadas);
}

let n = 0;
const delPaciente = (...entradaIds: string[]): Mensaje => ({
  id: `m${++n}`, sesionId: 's', origen: 'paciente', via: 'catalogo', confirmadoEn: n,
  items: entradaIds.map((entradaId) => ({ entradaId, texto: entradaId })),
});
const delMedico = (entradaId: string): Mensaje => ({
  id: `m${++n}`, sesionId: 's', origen: 'medico', entradaId, texto: entradaId, recursoId: 'R', enviadoEn: n,
});

describe('Preguntas sugeridas al médico (D55)', () => {
  it('sin mensajes: solo las generales, en su orden', () => {
    const s = sugerencias(catalogo, []);
    expect(s.porSintomas).toEqual([]);
    expect(s.generales).toEqual([
      { entradaId: 'P-ALERGIA', porSintomas: [] },
      { entradaId: 'P-MEDICAMENTO', porSintomas: [] },
      { entradaId: 'P-FLEMAS', porSintomas: [] },
    ]);
  });

  it('junta las recomendadas de los síntomas, del mensaje más reciente al más antiguo, sin repetir', () => {
    const s = sugerencias(catalogo, [delPaciente('S-TOS'), delPaciente('S-FIEBRE')]);
    expect(s.porSintomas).toEqual([
      { entradaId: 'P-DESDE', porSintomas: ['S-FIEBRE', 'S-TOS'] },
      { entradaId: 'P-ESCALOFRIOS', porSintomas: ['S-FIEBRE'] },
      { entradaId: 'P-FLEMAS', porSintomas: ['S-TOS'] },
    ]);
  });

  it('dentro de un mismo mensaje respeta el orden de los síntomas', () => {
    const s = sugerencias(catalogo, [delPaciente('S-TOS', 'S-FIEBRE')]);
    expect(s.porSintomas.map((x) => x.entradaId)).toEqual(['P-DESDE', 'P-FLEMAS', 'P-ESCALOFRIOS']);
  });

  it('una general que ya sugiere un síntoma no se repite en las generales', () => {
    const s = sugerencias(catalogo, [delPaciente('S-TOS')]);
    expect(s.generales.map((x) => x.entradaId)).toEqual(['P-ALERGIA', 'P-MEDICAMENTO']);
  });

  it('quita las preguntas que el médico ya envió en la sesión', () => {
    const s = sugerencias(catalogo, [delPaciente('S-TOS'), delMedico('P-DESDE'), delMedico('P-ALERGIA')]);
    expect(s.porSintomas.map((x) => x.entradaId)).toEqual(['P-FLEMAS']);
    expect(s.generales.map((x) => x.entradaId)).toEqual(['P-MEDICAMENTO']);
  });

  it('el mismo síntoma en dos mensajes se lista una sola vez', () => {
    const s = sugerencias(catalogo, [delPaciente('S-TOS'), delPaciente('S-TOS')]);
    expect(s.porSintomas).toEqual([
      { entradaId: 'P-DESDE', porSintomas: ['S-TOS'] },
      { entradaId: 'P-FLEMAS', porSintomas: ['S-TOS'] },
    ]);
  });

  it('ignora síntomas sin recomendadas, respuestas breves y entradas que no existen', () => {
    const s = sugerencias(catalogo, [delPaciente('S-SIN', 'R-SI', 'NO-EXISTE')]);
    expect(s.porSintomas).toEqual([]);
  });
});
