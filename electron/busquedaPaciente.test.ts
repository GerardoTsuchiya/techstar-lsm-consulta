// @vitest-environment node
import type os from 'node:os';
import { describe, expect, it } from 'vitest';
import { destinosDeDifusion } from './busquedaPaciente';

type Interfaces = ReturnType<typeof os.networkInterfaces>;
const ipv4 = (address: string, netmask: string, internal = false) =>
  ({ address, netmask, family: 'IPv4', internal, mac: '00:00:00:00:00:00', cidr: null }) as const;

describe('Direcciones de difusión del equipo del paciente (D56)', () => {
  it('calcula la difusión de cada red IPv4 y añade la general y la local', () => {
    const interfaces = {
      'Wi-Fi': [ipv4('192.168.1.37', '255.255.255.0')],
      vEthernet: [ipv4('172.20.16.1', '255.255.240.0')],
      Loopback: [ipv4('127.0.0.1', '255.0.0.0', true)],
    } as unknown as Interfaces;
    expect(destinosDeDifusion(interfaces)).toEqual(['192.168.1.255', '172.20.31.255', '255.255.255.255', '127.0.0.1']);
  });

  it('sin redes: solo la general y la local', () => {
    expect(destinosDeDifusion({} as Interfaces)).toEqual(['255.255.255.255', '127.0.0.1']);
  });

  it('con máscara /32 la difusión es la propia dirección', () => {
    const interfaces = { enlace: [ipv4('10.0.0.5', '255.255.255.255')] } as unknown as Interfaces;
    expect(destinosDeDifusion(interfaces)).toEqual(['10.0.0.5', '255.255.255.255', '127.0.0.1']);
  });

  it('una interfaz sin máscara se omite', () => {
    const interfaces = { rara: [{ ...ipv4('10.0.0.5', '255.255.255.0'), netmask: '' }] } as unknown as Interfaces;
    expect(destinosDeDifusion(interfaces)).toEqual(['255.255.255.255', '127.0.0.1']);
  });
});
