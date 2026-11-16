import { describe, expect, it } from 'vitest';
import { permisoConcedido, type SolicitudPermiso } from './permisos';

const base: SolicitudPermiso = {
  modo: 'paciente',
  permiso: 'media',
  ventanaPropia: true,
  url: 'file:///C:/app/dist/index.html?modo=paciente-red',
  tiposMedia: ['video'],
};

describe('Permisos de Electron (etapa C)', () => {
  it('concede solo la cámara a la ventana propia en los modos paciente y demostración', () => {
    expect(permisoConcedido(base)).toBe(true);
    expect(permisoConcedido({ ...base, modo: 'demo' })).toBe(true);
  });

  it('niega la cámara al modo médico, a otro contenido y a páginas que no son la app', () => {
    expect(permisoConcedido({ ...base, modo: 'medico' })).toBe(false);
    expect(permisoConcedido({ ...base, ventanaPropia: false })).toBe(false);
    expect(permisoConcedido({ ...base, url: 'https://ejemplo.com/' })).toBe(false);
  });

  it('niega el micrófono (aunque venga junto con el video) y cualquier otro permiso', () => {
    expect(permisoConcedido({ ...base, tiposMedia: ['audio'] })).toBe(false);
    expect(permisoConcedido({ ...base, tiposMedia: ['video', 'audio'] })).toBe(false);
    expect(permisoConcedido({ ...base, tiposMedia: [] })).toBe(false);
    expect(permisoConcedido({ ...base, tiposMedia: undefined })).toBe(false);
    for (const permiso of ['display-capture', 'geolocation', 'notifications', 'clipboard-read', 'openExternal']) {
      expect(permisoConcedido({ ...base, permiso })).toBe(false);
    }
  });
});
