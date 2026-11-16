// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  bytesAleatorios,
  CanalSeguro,
  derivarClaveMaestra,
  generarCodigo,
  normalizarCodigo,
  type Trama,
} from './canalSeguro';
import { esComando, urlDeDireccion } from './protocoloRed';

const ITER = 1000; // rápido para pruebas; la app usa ITERACIONES_PBKDF2

async function pareja(codigoPaciente = 'ABCDE12345', codigoMedico = 'ABCDE12345') {
  const sal = bytesAleatorios(16);
  const ns = bytesAleatorios(16);
  const nc = bytesAleatorios(16);
  const paciente = await CanalSeguro.crear(await derivarClaveMaestra(codigoPaciente, sal, ITER), ns, nc, 'paciente');
  const medico = await CanalSeguro.crear(await derivarClaveMaestra(codigoMedico, sal, ITER), ns, nc, 'medico');
  return { paciente, medico };
}

describe('Código de vinculación', () => {
  it('se genera con 10 caracteres sin letras confusas y se normaliza al teclearlo', () => {
    const codigo = generarCodigo();
    expect(codigo).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(normalizarCodigo(codigo)).toBe(codigo.replace('-', ''));
    expect(normalizarCodigo(' d7k0p 4qhar ')).toBe('D7K0P4QHAR');
    expect(normalizarCodigo('D7KOP-4QHAR')).toBe('D7K0P4QHAR'); // O → 0
    expect(normalizarCodigo('ABC')).toBeNull();
    expect(normalizarCodigo('ABCDE-1234U')).toBeNull(); // U no pertenece al alfabeto
  });
});

describe('Canal cifrado', () => {
  it('lleva mensajes en ambos sentidos sin exponer el contenido', async () => {
    const { paciente, medico } = await pareja();
    const trama = await paciente.cifrar({ texto: 'Tengo fiebre.' });
    expect(JSON.stringify(trama)).not.toContain('fiebre');
    expect(await medico.descifrar(trama)).toEqual({ texto: 'Tengo fiebre.' });
    expect(await paciente.descifrar(await medico.cifrar({ ok: true }))).toEqual({ ok: true });
  });

  it('un equipo con otro código no puede leer ni fabricar tramas', async () => {
    const { paciente, medico } = await pareja('ABCDE12345', 'ZZZZZ99999');
    await expect(medico.descifrar(await paciente.cifrar({ a: 1 }))).rejects.toThrow('no-autenticada');
  });

  it('rechaza una trama alterada, repetida o fuera de orden', async () => {
    const { paciente, medico } = await pareja();
    const t0 = await paciente.cifrar({ n: 0 });
    const t1 = await paciente.cifrar({ n: 1 });
    const alterada: Trama = { ...t0, c: t0.c.slice(0, -4) + (t0.c.endsWith('AAA=') ? 'BBB=' : 'AAA=') };
    await expect(medico.descifrar(alterada)).rejects.toThrow('no-autenticada');
    await expect(medico.descifrar(t1)).rejects.toThrow('fuera-de-orden');
    expect(await medico.descifrar(t0)).toEqual({ n: 0 });
    await expect(medico.descifrar(t0)).rejects.toThrow('fuera-de-orden'); // repetida
    expect(await medico.descifrar(t1)).toEqual({ n: 1 });
  });

  it('una trama de un sentido no sirve en el otro', async () => {
    const { paciente } = await pareja();
    const t = await paciente.cifrar({ eco: true });
    await expect(paciente.descifrar(t)).rejects.toThrow('no-autenticada');
  });
});

describe('Protocolo de red', () => {
  it('arma la dirección del WebSocket a partir de lo que teclea el personal', () => {
    expect(urlDeDireccion('192.168.1.20')).toBe('ws://192.168.1.20:47100/techstar');
    expect(urlDeDireccion(' 192.168.1.20:5000 ')).toBe('ws://192.168.1.20:5000/techstar');
    expect(urlDeDireccion('ws://10.0.0.3:47100/otra')).toBe('ws://10.0.0.3:47100/techstar');
    expect(urlDeDireccion('no es una dirección')).toBeNull();
    expect(urlDeDireccion('10.0.0.3:99999')).toBeNull();
  });

  it('solo deja pasar comandos con la forma esperada', () => {
    expect(esComando({ tipo: 'acuseRecibo', sesionId: 's', mensajeId: 'm' })).toBe(true);
    expect(esComando({ tipo: 'confirmarMensajePaciente', sesionId: 's', envioId: 'e', via: 'catalogo', selecciones: [{ entradaId: 'x' }], textosRevisados: ['t'] })).toBe(true);
    expect(esComando({ tipo: 'confirmarMensajePaciente', sesionId: 's', envioId: 'e', via: 'catalogo', selecciones: 'x', textosRevisados: [] })).toBe(false);
    expect(esComando({ tipo: 'borrarTodo' })).toBe(false);
    expect(esComando(null)).toBe(false);
  });
});
