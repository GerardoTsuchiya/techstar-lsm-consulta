// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../../src/catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../../src/nucleo/coordinador';
import type { Comando, Evento, InstantaneaSesion } from '../../src/nucleo/tipos';
import { conectarLocal } from '../../src/transporte/local';
import { type ConexionRed, conectarPorWebSocket, type OpcionesWebSocket } from '../../src/transporte/websocket';
import { leerArgumentos } from '../argumentos';
import { iniciarServidorRed, type OpcionesServidorRed } from './servidorRed';

/**
 * Etapa B: servidor WebSocket de la laptop del médico + transporte WebSocket del paciente,
 * en esta computadora (127.0.0.1). Comprueba vinculación, equipos ajenos, caídas de red,
 * recuperación sin duplicados y envíos tardíos tras el cierre.
 */

const ITER = 1000;
const CODIGO = 'ABCDE-12345';
const limpiar: (() => unknown)[] = [];
afterEach(async () => {
  while (limpiar.length) await limpiar.pop()!();
});

async function montar(opciones: Partial<OpcionesServidorRed> = {}) {
  const coordinador = opciones.coordinador ?? new CoordinadorSesion({ catalogo: catalogoFicticio, politica: 'desarrollo' });
  const servidor = await iniciarServidorRed({
    coordinador,
    host: '127.0.0.1',
    puerto: 0,
    iteraciones: ITER,
    latidoMs: 50,
    codigo: CODIGO,
    ...opciones,
  });
  limpiar.push(() => servidor.cerrar());
  const medico = conectarLocal(coordinador, 'medico');
  return { coordinador, servidor, medico, url: `ws://127.0.0.1:${servidor.puerto}/techstar` };
}

function conectarPaciente(url: string, extra: Partial<OpcionesWebSocket> = {}) {
  const conexion = conectarPorWebSocket({
    url,
    codigo: CODIGO,
    dispositivoId: 'laptop-del-paciente',
    iteraciones: ITER,
    esperaMaximaMs: 4000,
    silencioMaximoMs: 400,
    pausasReintentoMs: [30, 60, 100],
    ...extra,
  });
  limpiar.push(() => conexion.desconectar());
  const eventos: Evento[] = [];
  conexion.alEvento((e) => eventos.push(e));
  return { conexion, eventos };
}

async function esperar(cumple: () => boolean, ms = 4000) {
  const inicio = Date.now();
  while (!cumple()) {
    if (Date.now() - inicio > ms) throw new Error('tiempo agotado');
    await new Promise((r) => setTimeout(r, 10));
  }
}

const fase = (c: ConexionRed) => c.estado().fase;

function ultimaInstantanea(eventos: Evento[]): InstantaneaSesion | null | undefined {
  const e = [...eventos].reverse().find((x): x is Extract<Evento, { tipo: 'estado' }> => x.tipo === 'estado');
  return e ? e.instantanea : undefined;
}

const confirmarFiebre = (sesionId: string, envioId = 'env-fiebre'): Comando => ({
  tipo: 'confirmarMensajePaciente',
  sesionId,
  envioId,
  via: 'catalogo',
  selecciones: [{ entradaId: 'PAC-S-04' }],
  textosRevisados: ['Tengo fiebre.'],
});

async function iniciar(medico: ReturnType<typeof conectarLocal>, coordinador: CoordinadorSesion) {
  await medico.enviar({ tipo: 'iniciarSesion' });
  return coordinador.instantanea()!.sesionId;
}

describe('Vinculación por la red local', () => {
  it('la laptop vinculada recibe el estado y sus comandos llegan al coordinador como «paciente»', async () => {
    const { coordinador, servidor, medico, url } = await montar();
    const { conexion, eventos } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    expect(servidor.estado()).toMatchObject({ vinculado: true, conectado: true, codigo: CODIGO, rechazados: 0 });

    const sesionId = await iniciar(medico, coordinador);
    await esperar(() => ultimaInstantanea(eventos)?.sesionId === sesionId);

    expect(await conexion.enviar(confirmarFiebre(sesionId))).toMatchObject({ ok: true });
    expect(coordinador.instantanea()!.mensajes).toHaveLength(1);
    // El servidor fija el rol: el paciente no puede iniciar ni hacerse pasar por el médico.
    expect(await conexion.enviar({ tipo: 'iniciarSesion' })).toEqual({ ok: false, error: 'rol-no-autorizado' });
    expect(await conexion.enviar({ tipo: 'enviarEntradaMedico', sesionId, envioId: 'x', entradaId: 'MED-P-01' })).toEqual({
      ok: false,
      error: 'rol-no-autorizado',
    });
  });

  it('un equipo ajeno (código incorrecto) se rechaza, no reintenta y no toca la sesión', async () => {
    const { coordinador, servidor, medico, url } = await montar();
    await iniciar(medico, coordinador);
    const { conexion, eventos } = conectarPaciente(url, { codigo: 'ZZZZZ-99999', dispositivoId: 'equipo-ajeno-1' });
    await esperar(() => fase(conexion) === 'rechazado');
    expect(conexion.estado().motivo).toBe('codigo-incorrecto');
    expect(eventos).toHaveLength(0); // no recibió nada de la consulta
    expect(servidor.estado()).toMatchObject({ vinculado: false, rechazados: 1, ultimoRechazo: 'codigo-incorrecto' });
    expect(await conexion.enviar({ tipo: 'acuseRecibo', sesionId: 's', mensajeId: 'm' })).toEqual({ ok: false, error: 'sin-conexion' });
    expect(coordinador.instantanea()!.mensajes).toHaveLength(0);
  });

  it('una sola pareja: otro equipo con el código correcto se rechaza mientras exista la vinculación', async () => {
    const { servidor, url } = await montar();
    const primero = conectarPaciente(url);
    await esperar(() => fase(primero.conexion) === 'conectado');
    const segundo = conectarPaciente(url, { dispositivoId: 'otra-laptop-con-codigo' });
    await esperar(() => fase(segundo.conexion) === 'rechazado');
    expect(segundo.conexion.estado().motivo).toBe('pareja-ocupada');
    expect(fase(primero.conexion)).toBe('conectado');
    expect(servidor.estado().ultimoRechazo).toBe('pareja-ocupada');
  });

  it('por la red no se acepta el rol «médico»', async () => {
    const { url } = await montar();
    const { conexion } = conectarPaciente(url, { rol: 'medico', dispositivoId: 'se-dice-medico' });
    await esperar(() => fase(conexion) === 'rechazado');
    expect(conexion.estado().motivo).toBe('rol-no-permitido');
  });

  it('un cliente que habla sin cifrar se desconecta y el servidor sigue atendiendo', async () => {
    const { coordinador, url } = await montar();
    const intruso = new WebSocket(url);
    const recibidos: string[] = [];
    intruso.onmessage = (e) => recibidos.push(String(e.data));
    await new Promise((r) => (intruso.onopen = r));
    intruso.send(JSON.stringify({ t: 'solicitud', id: '1', comando: { tipo: 'iniciarSesion' } }));
    await new Promise((r) => (intruso.onclose = r));
    expect(recibidos.some((m) => m.includes('"rechazo"'))).toBe(true);
    expect(coordinador.instantanea()).toBeNull();

    const { conexion } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
  });

  it('la misma laptop puede volver a entrar con el código (p. ej. si recarga su ventana)', async () => {
    const { servidor, url } = await montar();
    const antes = conectarPaciente(url);
    await esperar(() => fase(antes.conexion) === 'conectado');
    antes.conexion.desconectar();
    await esperar(() => !servidor.estado().conectado);
    expect(servidor.estado()).toMatchObject({ vinculado: true, codigo: CODIGO });
    const despues = conectarPaciente(url);
    await esperar(() => fase(despues.conexion) === 'conectado');
  });

  it('al desvincular, la laptop queda fuera y se genera un código nuevo', async () => {
    const { servidor, url } = await montar();
    const { conexion } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    const nuevo = await servidor.desvincular();
    await esperar(() => fase(conexion) === 'rechazado');
    expect(conexion.estado().motivo).toBe('desvinculado');
    expect(nuevo.vinculado).toBe(false);
    expect(nuevo.codigo).not.toBe(CODIGO);
    // Con el código anterior ya no entra nadie.
    const otro = conectarPaciente(url, { dispositivoId: 'despues-de-desvincular' });
    await esperar(() => fase(otro.conexion) === 'rechazado');
    expect(otro.conexion.estado().motivo).toBe('codigo-incorrecto');
  });
});

describe('Caída de red y recuperación', () => {
  it('reconecta solo, recibe la instantánea y no hay «Recibido» falso (RF-20)', async () => {
    const { coordinador, servidor, medico, url } = await montar();
    const { conexion, eventos } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    const sesionId = await iniciar(medico, coordinador);

    servidor.cortarConexiones();
    // El médico envía mientras la laptop del paciente está desconectada.
    const r = await medico.enviar({ tipo: 'enviarEntradaMedico', sesionId, envioId: 'env-m1', entradaId: 'MED-P-01' });
    expect(r.ok).toBe(true);
    const mensajeId = (r as { id: string }).id;

    await esperar(() => conexion.estado().reconexiones === 1 && fase(conexion) === 'conectado');
    await esperar(() => ultimaInstantanea(eventos)?.mensajes.some((m) => m.id === mensajeId) === true);
    // Llegó la instantánea, pero el médico NO ve «Recibido» hasta que la pantalla del paciente lo acuse.
    expect(coordinador.instantanea()!.mensajes[0]!.recibidoEn).toBeUndefined();
    expect(await conexion.enviar({ tipo: 'acuseRecibo', sesionId, mensajeId })).toMatchObject({ ok: true });
    expect(coordinador.instantanea()!.mensajes[0]!.recibidoEn).toBeTypeOf('number');
  });

  it('si la red cae después de aplicar un envío y antes de responder, el reintento no lo duplica', async () => {
    let cortes = 0;
    const { coordinador, medico, url } = await montar({
      cortarAntesDeResponder: (c) => c.tipo === 'confirmarMensajePaciente' && cortes++ === 0,
    });
    const { conexion } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    const sesionId = await iniciar(medico, coordinador);

    const r = await conexion.enviar(confirmarFiebre(sesionId));
    expect(cortes).toBe(2); // se aplicó, se cortó la red y se reenvió con el mismo envioId
    expect(r).toMatchObject({ ok: true, duplicado: true });
    expect(conexion.estado().reconexiones).toBe(1);
    expect(coordinador.instantanea()!.mensajes).toHaveLength(1);
  });

  it('un envío hecho durante la caída se entrega una sola vez al reconectar', async () => {
    const { coordinador, servidor, medico, url } = await montar();
    const { conexion } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    const sesionId = await iniciar(medico, coordinador);

    servidor.cortarConexiones();
    const [a, b] = await Promise.all([
      conexion.enviar(confirmarFiebre(sesionId)),
      conexion.enviar(confirmarFiebre(sesionId)), // doble toque durante la caída
    ]);
    expect(a.ok && b.ok).toBe(true);
    expect(coordinador.instantanea()!.mensajes).toHaveLength(1);
  });

  it('detecta una red muda (sin cierre) y se reconecta', async () => {
    const { servidor, url } = await montar();
    const { conexion } = conectarPaciente(url);
    await esperar(() => fase(conexion) === 'conectado');
    servidor.silenciar(true);
    await esperar(() => fase(conexion) === 'reconectando');
    servidor.silenciar(false);
    await esperar(() => fase(conexion) === 'conectado');
    expect(conexion.estado().reconexiones).toBe(1);
    expect(servidor.estado()).toMatchObject({ vinculado: true, conectado: true });
  });

  it('un envío tardío tras el cierre de la consulta se rechaza al reconectar (RF-18, RF-20)', async () => {
    const coordinador = new CoordinadorSesion({ catalogo: catalogoFicticio, politica: 'desarrollo' });
    const primero = await montar({ coordinador, puerto: 0 });
    const puerto = primero.servidor.puerto;
    const { conexion, eventos } = conectarPaciente(primero.url);
    await esperar(() => fase(conexion) === 'conectado');
    const sesionId = await iniciar(primero.medico, coordinador);

    // La laptop del médico deja de escuchar; el paciente confirma sin saberlo.
    await primero.servidor.cerrar();
    await esperar(() => fase(conexion) !== 'conectado');
    const tardio = conexion.enviar(confirmarFiebre(sesionId));
    // Mientras tanto el médico termina la consulta.
    await primero.medico.enviar({ tipo: 'cerrarSesion', sesionId });

    await montar({ coordinador, puerto });
    expect(await tardio).toEqual({ ok: false, error: 'sesion-cerrada' });
    await esperar(() => ultimaInstantanea(eventos) === null);
    expect(coordinador.instantanea()).toBeNull();
  });

  it('sin la computadora del médico, un envío responde «sin conexión» en lugar de fingir entrega', async () => {
    const { servidor, url } = await montar();
    await servidor.cerrar();
    const { conexion } = conectarPaciente(url, { esperaMaximaMs: 300 });
    expect(await conexion.enviar({ tipo: 'acuseRecibo', sesionId: 's', mensajeId: 'm' })).toEqual({ ok: false, error: 'sin-conexion' });
    expect(fase(conexion)).toBe('conectando');
  });
});

describe('Arranque de la app de escritorio', () => {
  it('lee el modo y elige la opción segura ante valores desconocidos', () => {
    expect(leerArgumentos(['electron', '.', '--modo=medico', '--recursos=desarrollo', '--solo-local'])).toEqual({
      modo: 'medico',
      politica: 'desarrollo',
      puerto: 47100,
      soloLocal: true,
    });
    expect(leerArgumentos(['--modo=paciente', '--puerto=5000'])).toMatchObject({ modo: 'paciente', politica: 'producto', puerto: 5000 });
    expect(leerArgumentos(['--modo=raro', '--recursos=otro', '--puerto=abc'])).toEqual({
      modo: 'demo',
      politica: 'producto',
      puerto: 47100,
      soloLocal: false,
    });
  });
});
