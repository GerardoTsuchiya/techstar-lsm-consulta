// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  type AnuncioRecibido,
  APP_BUSQUEDA,
  calcularHuella,
  elegirMedico,
  esAnuncio,
  esBusqueda,
  mensajeBusqueda,
} from './busqueda';
import { aBase64, bytesAleatorios, derivarClaveMaestra, normalizarCodigo } from './canalSeguro';
import { VERSION_PROTOCOLO } from './protocoloRed';

const ITER = 1000;

async function anuncioDe(codigo: string, ip: string, puerto = 47100, v = VERSION_PROTOCOLO): Promise<AnuncioRecibido> {
  const sal = bytesAleatorios(16);
  const maestra = await derivarClaveMaestra(normalizarCodigo(codigo)!, sal, ITER);
  return { t: 'anuncio', app: APP_BUSQUEDA, v, puerto, sal: aBase64(sal), huella: await calcularHuella(maestra, sal), ip };
}

describe('Mensajes de búsqueda y anuncio (D56)', () => {
  it('la búsqueda tiene la forma exacta y nada más', () => {
    expect(esBusqueda(mensajeBusqueda())).toBe(true);
    expect(esBusqueda({ ...mensajeBusqueda(), extra: 1 })).toBe(false);
    expect(esBusqueda({ t: 'busqueda', app: 'otra-app', v: 1 })).toBe(false);
    expect(esBusqueda({ t: 'busqueda', app: APP_BUSQUEDA })).toBe(false);
    expect(esBusqueda(null)).toBe(false);
  });

  it('el anuncio exige puerto válido y textos cortos', async () => {
    const a = await anuncioDe('ABCDE-12345', '192.168.1.20');
    const { ip: _ip, ...anuncio } = a;
    expect(esAnuncio(anuncio)).toBe(true);
    expect(esAnuncio({ ...anuncio, puerto: 0 })).toBe(false);
    expect(esAnuncio({ ...anuncio, puerto: 70000 })).toBe(false);
    expect(esAnuncio({ ...anuncio, huella: 'x'.repeat(65) })).toBe(false);
    expect(esAnuncio({ ...anuncio, app: 'otra-app' })).toBe(false);
    expect(esAnuncio({ ...anuncio, codigo: 'ABCDE12345' })).toBe(false);
  });

  it('la huella depende del código y de la sal', async () => {
    const sal = bytesAleatorios(16);
    const m1 = await derivarClaveMaestra('ABCDE12345', sal, ITER);
    const m2 = await derivarClaveMaestra('ABCDE12346', sal, ITER);
    expect(await calcularHuella(m1, sal)).toBe(await calcularHuella(m1, sal));
    expect(await calcularHuella(m1, sal)).not.toBe(await calcularHuella(m2, sal));
    expect(await calcularHuella(m1, sal)).not.toBe(await calcularHuella(m1, bytesAleatorios(16)));
  });
});

describe('Elegir la computadora del médico con el código (D56)', () => {
  it('sin anuncios: «nadie»', async () => {
    expect(await elegirMedico('ABCDE-12345', [], ITER)).toEqual({ tipo: 'nadie' });
  });

  it('con varios médicos elige el que tiene el código tecleado', async () => {
    const otro = await anuncioDe('ZZZZZ-99999', '192.168.1.30');
    const suyo = await anuncioDe('ABCDE-12345', '192.168.1.20', 47100);
    const r = await elegirMedico('abcde 12345', [otro, suyo], ITER);
    expect(r).toEqual({ tipo: 'encontrado', anuncio: suyo, url: 'ws://192.168.1.20:47100/techstar' });
  });

  it('hay médicos pero ninguno con ese código: «sin-coincidencia»', async () => {
    const otro = await anuncioDe('ZZZZZ-99999', '192.168.1.30');
    expect(await elegirMedico('ABCDE-12345', [otro], ITER)).toEqual({ tipo: 'sin-coincidencia' });
  });

  it('solo hay médicos de otra versión: «version»', async () => {
    const viejo = await anuncioDe('ABCDE-12345', '192.168.1.20', 47100, VERSION_PROTOCOLO + 1);
    expect(await elegirMedico('ABCDE-12345', [viejo], ITER)).toEqual({ tipo: 'version' });
  });

  it('un código mal escrito nunca coincide', async () => {
    const suyo = await anuncioDe('ABCDE-12345', '192.168.1.20');
    expect(await elegirMedico('abc', [suyo], ITER)).toEqual({ tipo: 'sin-coincidencia' });
  });
});
