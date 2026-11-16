import { describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../catalogo/catalogoFicticio';
import { CoordinadorSesion } from './coordinador';
import { textosRevisados } from './mensajes';
import type { Catalogo, Comando, Evento, MensajeMedico, PoliticaRecursos, Seleccion, ViaPaciente } from './tipos';

function nuevo(politica: PoliticaRecursos = 'desarrollo', catalogo: Catalogo = catalogoFicticio) {
  let n = 0;
  const c = new CoordinadorSesion({ catalogo, politica, generarId: (p) => `${p}-${++n}`, ahora: () => 1000 });
  const eventos: Evento[] = [];
  c.suscribir((e) => eventos.push(e));
  const r = c.procesar('medico', { tipo: 'iniciarSesion' });
  if (!r.ok || !r.id) throw new Error('no inició');
  return { c, sesionId: r.id, eventos };
}

function confirmar(
  c: CoordinadorSesion,
  sesionId: string,
  selecciones: Seleccion[],
  envioId = 'env-1',
  via: ViaPaciente = 'catalogo',
) {
  return c.procesar('paciente', {
    tipo: 'confirmarMensajePaciente',
    sesionId,
    envioId,
    via,
    selecciones,
    textosRevisados: textosRevisados(catalogoFicticio, selecciones),
  });
}

describe('Coordinador de sesión', () => {
  it('entrega al médico exactamente lo revisado, con intensidad solo si se eligió (RF-07, RF-19)', () => {
    const { c, sesionId } = nuevo();
    const r = confirmar(c, sesionId, [{ entradaId: 'PAC-S-01', intensidad: 7 }, { entradaId: 'PAC-S-04' }]);
    expect(r.ok).toBe(true);
    const m = c.instantanea()!.mensajes[0]!;
    expect(m.origen).toBe('paciente');
    if (m.origen !== 'paciente') return;
    expect(m.items).toEqual([
      { entradaId: 'PAC-S-01', texto: 'Tengo dolor de cabeza.', intensidad: 7 },
      { entradaId: 'PAC-S-04', texto: 'Tengo fiebre.' },
    ]);
    expect('intensidad' in m.items[1]!).toBe(false);
  });

  it('un doble toque o reintento con el mismo envioId produce un solo mensaje (RF-07)', () => {
    const { c, sesionId } = nuevo();
    const sel = [{ entradaId: 'PAC-S-05' }];
    const a = confirmar(c, sesionId, sel, 'env-x');
    const b = confirmar(c, sesionId, sel, 'env-x');
    expect(a.ok && b.ok).toBe(true);
    expect(b.ok && b.duplicado).toBe(true);
    expect(c.instantanea()!.mensajes).toHaveLength(1);
  });

  it('rechaza contenido distinto del revisado', () => {
    const { c, sesionId } = nuevo();
    const r = c.procesar('paciente', {
      tipo: 'confirmarMensajePaciente',
      sesionId,
      envioId: 'e',
      via: 'catalogo',
      selecciones: [{ entradaId: 'PAC-S-04' }],
      textosRevisados: ['Tengo tos.'],
    });
    expect(r).toEqual({ ok: false, error: 'contenido-no-coincide' });
    expect(c.instantanea()!.mensajes).toHaveLength(0);
  });

  it('bloquea entradas sin recurso en ambos modos (RF-03, RF-02)', () => {
    for (const politica of ['desarrollo', 'producto'] as const) {
      const { c, sesionId } = nuevo(politica);
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-06' }])).toEqual({ ok: false, error: 'recurso-no-disponible' });
      const r = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm', entradaId: 'MED-P-06' });
      expect(r).toEqual({ ok: false, error: 'recurso-no-disponible' });
      expect(c.instantanea()!.mensajes).toHaveLength(0);
    }
  });

  it('en el flujo de producto bloquea los recursos de prueba', () => {
    const { c, sesionId } = nuevo('producto');
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }])).toEqual({ ok: false, error: 'recurso-no-disponible' });
    const r = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm', entradaId: 'MED-P-01' });
    expect(r).toEqual({ ok: false, error: 'recurso-no-disponible' });
  });

  it('acepta un recurso validado en el flujo de producto y lo asocia sin sustituirlo (RI-01)', () => {
    const catalogo: Catalogo = {
      ...catalogoFicticio,
      recursos: catalogoFicticio.recursos.map((r) => (r.id === 'REC-PRUEBA-MED-P-01' ? { ...r, estado: 'validado' } : r)),
    };
    const { c, sesionId } = nuevo('producto', catalogo);
    const r = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm', entradaId: 'MED-P-01' });
    expect(r.ok).toBe(true);
    const m = c.instantanea()!.mensajes[0] as MensajeMedico;
    expect(m.recursoId).toBe('REC-PRUEBA-MED-P-01');
  });

  it('valida la intensidad: entero 1–10 y solo en síntomas de dolor (RF-19)', () => {
    const { c, sesionId } = nuevo();
    for (const intensidad of [0, 11, 3.5]) {
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-01', intensidad }], `e${intensidad}`)).toEqual({
        ok: false,
        error: 'intensidad-invalida',
      });
    }
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04', intensidad: 5 }], 'f')).toEqual({
      ok: false,
      error: 'intensidad-invalida',
    });
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-01', intensidad: 10 }], 'g').ok).toBe(true);
  });

  it('rechaza selección vacía o repetida', () => {
    const { c, sesionId } = nuevo();
    expect(confirmar(c, sesionId, [])).toEqual({ ok: false, error: 'seleccion-vacia' });
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }, { entradaId: 'PAC-S-04' }])).toEqual({
      ok: false,
      error: 'seleccion-repetida',
    });
  });

  it('aplica permisos por rol', () => {
    const { c, sesionId } = nuevo();
    expect(c.procesar('paciente', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'a', entradaId: 'MED-P-01' })).toEqual({
      ok: false,
      error: 'rol-no-autorizado',
    });
    expect(c.procesar('paciente', { tipo: 'iniciarSesion' })).toEqual({ ok: false, error: 'rol-no-autorizado' });
    expect(
      c.procesar('medico', {
        tipo: 'confirmarMensajePaciente',
        sesionId,
        envioId: 'b',
        via: 'catalogo',
        selecciones: [{ entradaId: 'PAC-S-04' }],
        textosRevisados: ['Tengo fiebre.'],
      }),
    ).toEqual({ ok: false, error: 'rol-no-autorizado' });
  });

  it('vincula «No entendí» al mensaje correcto y lo marca atendido con el siguiente envío (RF-15)', () => {
    const { c, sesionId } = nuevo();
    const m1 = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm1', entradaId: 'MED-P-01' });
    const m2 = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm2', entradaId: 'MED-P-03' });
    if (!m1.ok || !m2.ok) throw new Error();
    const a = c.procesar('paciente', { tipo: 'solicitarAclaracion', sesionId, envioId: 'a1', mensajeId: m1.id! });
    expect(a.ok).toBe(true);
    const acl = c.instantanea()!.aclaraciones;
    expect(acl).toHaveLength(1);
    expect(acl[0]!.mensajeId).toBe(m1.id);
    expect(acl[0]!.atendidaCon).toBeUndefined();

    // Repetir mientras está pendiente no duplica el aviso.
    const otra = c.procesar('paciente', { tipo: 'solicitarAclaracion', sesionId, envioId: 'a2', mensajeId: m1.id! });
    expect(otra.ok && otra.duplicado).toBe(true);
    expect(c.instantanea()!.aclaraciones).toHaveLength(1);

    const m3 = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm3', entradaId: 'MED-P-02' });
    expect(c.instantanea()!.aclaraciones[0]!.atendidaCon).toBe(m3.ok ? m3.id : 'x');
  });

  it('no permite «No entendí» sin un mensaje del médico', () => {
    const { c, sesionId } = nuevo();
    const p = confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }]);
    expect(c.procesar('paciente', { tipo: 'solicitarAclaracion', sesionId, envioId: 'a', mensajeId: 'msg-x' })).toEqual({
      ok: false,
      error: 'mensaje-no-encontrado',
    });
    // Tampoco sobre un mensaje del propio paciente.
    expect(c.procesar('paciente', { tipo: 'solicitarAclaracion', sesionId, envioId: 'b', mensajeId: p.ok ? p.id! : '' })).toEqual({
      ok: false,
      error: 'mensaje-no-encontrado',
    });
  });

  it('solo el destinatario puede acusar recibo', () => {
    const { c, sesionId } = nuevo();
    const m = c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm', entradaId: 'MED-R-01' });
    const id = m.ok ? m.id! : '';
    expect(c.procesar('medico', { tipo: 'acuseRecibo', sesionId, mensajeId: id })).toEqual({ ok: false, error: 'rol-no-autorizado' });
    expect(c.instantanea()!.mensajes[0]!.recibidoEn).toBeUndefined();
    expect(c.procesar('paciente', { tipo: 'acuseRecibo', sesionId, mensajeId: id }).ok).toBe(true);
    expect(c.instantanea()!.mensajes[0]!.recibidoEn).toBe(1000);
  });

  it('al cerrar elimina el contenido, rechaza envíos tardíos y la nueva sesión empieza vacía (RF-18, RF-20)', () => {
    const { c, sesionId, eventos } = nuevo();
    confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }]);
    c.procesar('medico', { tipo: 'enviarEntradaMedico', sesionId, envioId: 'm', entradaId: 'MED-P-01' });
    expect(c.procesar('medico', { tipo: 'cerrarSesion', sesionId }).ok).toBe(true);
    expect(c.instantanea()).toBeNull();
    expect(eventos.some((e) => e.tipo === 'sesionCerrada' && e.sesionId === sesionId)).toBe(true);

    // Resultado tardío de la sesión cerrada.
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-05' }], 'tarde')).toEqual({ ok: false, error: 'sesion-cerrada' });

    const r = c.procesar('medico', { tipo: 'iniciarSesion' });
    expect(r.ok).toBe(true);
    const nueva = c.instantanea()!;
    expect(nueva.sesionId).not.toBe(sesionId);
    expect(nueva.mensajes).toEqual([]);
    expect(nueva.aclaraciones).toEqual([]);
    // Y un envío dirigido a la sesión anterior sigue rechazado.
    expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-05' }], 'tarde2')).toEqual({ ok: false, error: 'sesion-cerrada' });
  });

  it('rechaza mensajes de otra sesión', () => {
    const { c } = nuevo();
    expect(confirmar(c, 'ses-ajena', [{ entradaId: 'PAC-S-04' }])).toEqual({ ok: false, error: 'sesion-incorrecta' });
  });

  it('no permite abrir dos sesiones a la vez', () => {
    const { c } = nuevo();
    expect(c.procesar('medico', { tipo: 'iniciarSesion' })).toEqual({ ok: false, error: 'sesion-abierta' });
  });

  it('las instantáneas son copias: modificar una no altera la sesión', () => {
    const { c, sesionId } = nuevo();
    confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }]);
    const copia = c.instantanea()!;
    copia.mensajes.length = 0;
    expect(c.instantanea()!.mensajes).toHaveLength(1);
  });

  describe('mensajes por la cámara (etapa C, RF-01)', () => {
    it('acepta un candidato revisado con via «camara» y lo entrega igual que uno del catálogo', () => {
      const { c, sesionId } = nuevo();
      const r = confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }], 'env-cam', 'camara');
      expect(r.ok).toBe(true);
      const m = c.instantanea()!.mensajes[0]!;
      expect(m.origen === 'paciente' && m.via).toBe('camara');
      expect(m.origen === 'paciente' && m.items).toEqual([{ entradaId: 'PAC-S-04', texto: 'Tengo fiebre.' }]);
      // Doble toque: un solo mensaje (RF-07)
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }], 'env-cam', 'camara')).toMatchObject({ ok: true, duplicado: true });
      expect(c.instantanea()!.mensajes).toHaveLength(1);
    });

    it('no relaja ninguna validación: recurso, intensidad, tipo, contenido, rol y sesión', () => {
      const { c, sesionId } = nuevo();
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-06' }], 'a', 'camara')).toEqual({ ok: false, error: 'recurso-no-disponible' });
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04', intensidad: 5 }], 'b', 'camara')).toEqual({ ok: false, error: 'intensidad-invalida' });
      expect(confirmar(c, sesionId, [{ entradaId: 'MED-P-01' }], 'c', 'camara')).toEqual({ ok: false, error: 'tipo-no-permitido' });
      expect(confirmar(c, sesionId, [{ entradaId: 'NO-EXISTE' }], 'd', 'camara')).toEqual({ ok: false, error: 'entrada-desconocida' });
      const distinto: Comando = {
        tipo: 'confirmarMensajePaciente',
        sesionId,
        envioId: 'e',
        via: 'camara',
        selecciones: [{ entradaId: 'PAC-S-04' }],
        textosRevisados: ['Tengo tos.'],
      };
      expect(c.procesar('paciente', distinto)).toEqual({ ok: false, error: 'contenido-no-coincide' });
      expect(c.procesar('medico', { ...distinto, textosRevisados: ['Tengo fiebre.'] })).toEqual({ ok: false, error: 'rol-no-autorizado' });
      expect(c.procesar('paciente', { ...distinto, sesionId: 'ses-otra', textosRevisados: ['Tengo fiebre.'] })).toEqual({
        ok: false,
        error: 'sesion-incorrecta',
      });
      expect(c.instantanea()!.mensajes).toHaveLength(0);
    });

    it('en el flujo de producto un candidato de la cámara con recurso de prueba se bloquea', () => {
      const { c, sesionId } = nuevo('producto');
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }], 'a', 'camara')).toEqual({ ok: false, error: 'recurso-no-disponible' });
    });

    it('por la cámara solo se acepta una entrada, y una vía desconocida se rechaza', () => {
      const { c, sesionId } = nuevo();
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }, { entradaId: 'PAC-S-05' }], 'a', 'camara')).toEqual({
        ok: false,
        error: 'comando-invalido',
      });
      expect(confirmar(c, sesionId, [{ entradaId: 'PAC-S-04' }], 'b', 'voz' as ViaPaciente)).toEqual({ ok: false, error: 'comando-invalido' });
      expect(c.instantanea()!.mensajes).toHaveLength(0);
    });
  });
});
