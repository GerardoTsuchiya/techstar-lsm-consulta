// @vitest-environment node
import dgram from 'node:dgram';
import { afterEach, describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../../src/catalogo/catalogoFicticio';
import { CoordinadorSesion } from '../../src/nucleo/coordinador';
import { elegirMedico, mensajeBusqueda } from '../../src/transporte/busqueda';
import { conectarPorWebSocket } from '../../src/transporte/websocket';
import { buscarMedicos } from '../busquedaPaciente';
import { iniciarRespuestaBusqueda } from './busquedaMedico';
import { iniciarServidorRed } from './servidorRed';

/** D56: el médico responde por UDP en 127.0.0.1 y el paciente lo elige con el código. */

const ITER = 1000;
const CODIGO = 'ABCDE-12345';
const limpiar: (() => unknown)[] = [];
afterEach(async () => {
  while (limpiar.length) await limpiar.pop()!();
});

async function montar(maxPorSegundo?: number) {
  const coordinador = new CoordinadorSesion({ catalogo: catalogoFicticio, politica: 'desarrollo' });
  const servidor = await iniciarServidorRed({ coordinador, host: '127.0.0.1', puerto: 0, iteraciones: ITER, codigo: CODIGO });
  limpiar.push(() => servidor.cerrar());
  const respuesta = await iniciarRespuestaBusqueda({
    host: '127.0.0.1',
    puerto: 0,
    datos: () => servidor.datosAnuncio(),
    maxPorSegundo,
  });
  limpiar.push(() => respuesta.cerrar());
  const buscar = () => buscarMedicos({ puerto: respuesta.puerto, destinos: ['127.0.0.1'], duracionMs: 300, intervaloMs: 100 });
  return { servidor, respuesta, buscar };
}

/** Envía datagramas crudos y cuenta las respuestas durante `esperaMs`. */
async function respuestasA(puerto: number, mensajes: string[], esperaMs = 250): Promise<number> {
  const socket = dgram.createSocket('udp4');
  let n = 0;
  socket.on('message', () => n++);
  await new Promise<void>((r) => socket.bind(0, '127.0.0.1', r));
  for (const m of mensajes) socket.send(m, puerto, '127.0.0.1');
  await new Promise((r) => setTimeout(r, esperaMs));
  socket.close();
  return n;
}

describe('El médico responde a la búsqueda (D56)', () => {
  it('el paciente lo encuentra, lo elige con el código y se conecta', async () => {
    const { servidor, buscar } = await montar();
    const anuncios = await buscar();
    expect(anuncios).toHaveLength(1);
    expect(anuncios[0]).toMatchObject({ ip: '127.0.0.1', puerto: servidor.puerto });

    const r = await elegirMedico(CODIGO, anuncios, ITER);
    expect(r).toMatchObject({ tipo: 'encontrado', url: `ws://127.0.0.1:${servidor.puerto}/techstar` });
    if (r.tipo !== 'encontrado') return;

    const conexion = conectarPorWebSocket({ url: r.url, codigo: CODIGO, dispositivoId: 'equipo-paciente', iteraciones: ITER });
    limpiar.push(() => conexion.desconectar());
    await new Promise<void>((listo) => conexion.alEstado((e) => e.fase === 'conectado' && listo()));
    expect(servidor.estado()).toMatchObject({ vinculado: true, conectado: true });
  });

  it('tras «Desvincular» la huella cambia y el código anterior ya no coincide', async () => {
    const { servidor, buscar } = await montar();
    const antes = await buscar();
    await servidor.desvincular();
    const despues = await buscar();
    expect(despues[0]?.huella).not.toBe(antes[0]?.huella);
    expect(await elegirMedico(CODIGO, despues, ITER)).toEqual({ tipo: 'sin-coincidencia' });
  });

  it('ignora paquetes que no son una búsqueda', async () => {
    const { respuesta } = await montar();
    const invalidos = ['hola', '{"t":"busqueda"}', JSON.stringify({ ...mensajeBusqueda(), extra: 1 }), 'x'.repeat(600)];
    expect(await respuestasA(respuesta.puerto, invalidos)).toBe(0);
    expect(await respuestasA(respuesta.puerto, [JSON.stringify(mensajeBusqueda())])).toBe(1);
  });

  it('responde como máximo `maxPorSegundo` veces por segundo', async () => {
    const { respuesta } = await montar(2);
    const busqueda = JSON.stringify(mensajeBusqueda());
    expect(await respuestasA(respuesta.puerto, [busqueda, busqueda, busqueda, busqueda, busqueda])).toBe(2);
  });
});
