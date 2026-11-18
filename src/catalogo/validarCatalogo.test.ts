import { readFileSync } from 'node:fs';
import datos from '../../catalogo/ficticio-dev.json';
import { recursoDeEntrada, sePuedeEnviar } from '../nucleo/recursos';
import { catalogoFicticio, ERRORES_CATALOGO } from './catalogoFicticio';
import { generarDocumentoRecursos } from './documentoRecursos';
import { comprobarArchivos, validarCatalogo } from './validarCatalogo';

type Datos = typeof datos & Record<string, unknown>;
type Fila = Record<string, unknown>;

/** Copia editable del catálogo real, para romperlo a propósito en cada prueba. */
function copia(cambiar: (d: Datos & { entradas: Fila[]; recursos: Fila[]; recursosSistema: Fila }) => void) {
  const d = JSON.parse(JSON.stringify(datos)) as Datos & { entradas: Fila[]; recursos: Fila[]; recursosSistema: Fila };
  cambiar(d);
  return validarCatalogo(d);
}
const entrada = (d: { entradas: Fila[] }, id: string) => d.entradas.find((e) => e.id === id)!;
const recurso = (d: { recursos: Fila[] }, id: string) => d.recursos.find((r) => r.id === id)!;
const errores = (r: ReturnType<typeof validarCatalogo>) => r.errores.join('\n');

const VALIDADO = {
  tipo: 'video',
  estado: 'validado',
  archivo: 'PAC-S-01.mp4',
  aprobacion: { quien: 'Equipo TechStar con apoyo lingüístico', fecha: '2026-11-20' },
};

describe('Catálogo ficticio en catalogo/ficticio-dev.json', () => {
  it('es válido, sin errores ni avisos, y la app lo carga', () => {
    const r = validarCatalogo(datos);
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(ERRORES_CATALOGO).toEqual([]);
    expect(catalogoFicticio.version).toBe('ficticio-dev-0.1');
  });

  it('conserva las mismas entradas y las dos entradas sin recurso a propósito', () => {
    expect(catalogoFicticio.entradas.map((e) => e.id)).toEqual([
      'PAC-S-01', 'PAC-S-02', 'PAC-S-03', 'PAC-S-04', 'PAC-S-05', 'PAC-S-06', 'PAC-S-07', 'PAC-S-08',
      'PAC-R-01', 'PAC-R-02', 'PAC-R-03',
      // Respuestas breves a las preguntas del médico (tiempo, frecuencia y medicamentos), §6.3.
      'PAC-R-04', 'PAC-R-05', 'PAC-R-06', 'PAC-R-07', 'PAC-R-08', 'PAC-R-09', 'PAC-R-10',
      'PAC-R-11', 'PAC-R-12', 'PAC-R-13', 'PAC-R-14',
      'MED-P-01', 'MED-P-02', 'MED-P-03', 'MED-P-04', 'MED-P-05', 'MED-P-06',
      'MED-R-01', 'MED-R-02', 'MED-R-03', 'MED-R-04',
    ]);
    const sinRecurso = catalogoFicticio.entradas.filter((e) => !e.recursoId).map((e) => e.id);
    expect(sinRecurso).toEqual(['PAC-S-06', 'MED-P-06']);
    expect(catalogoFicticio.entradas.filter((e) => e.esDolor).map((e) => e.id)).toEqual(['PAC-S-01', 'PAC-S-02', 'PAC-S-03']);
    // 19 de entradas + controles del sistema (la etapa C agrega los suyos).
    expect(catalogoFicticio.recursos.length).toBeGreaterThanOrEqual(26);
    // Ninguno validado: los videos de fuentes externas siguen «prueba» hasta su revisión y aprobación (§6.2).
    expect(catalogoFicticio.recursos.every((r) => r.estado === 'prueba' && !r.aprobacion)).toBe(true);
  });

  it('los videos de fuentes externas son locales, de tipo video y solo en recursos de prueba', () => {
    const conArchivo = catalogoFicticio.recursos.filter((r) => r.archivo);
    expect(conArchivo.map((r) => r.id)).toEqual([
      'REC-PRUEBA-PAC-S-01', 'REC-PRUEBA-PAC-S-03', 'REC-PRUEBA-PAC-S-04', 'REC-PRUEBA-PAC-S-05',
      'REC-PRUEBA-PAC-S-07', 'REC-PRUEBA-PAC-S-08', 'REC-PRUEBA-PAC-R-03',
      'REC-PRUEBA-PAC-R-04', 'REC-PRUEBA-PAC-R-05', 'REC-PRUEBA-PAC-R-06', 'REC-PRUEBA-PAC-R-07',
      'REC-PRUEBA-PAC-R-08', 'REC-PRUEBA-PAC-R-09', 'REC-PRUEBA-PAC-R-10', 'REC-PRUEBA-PAC-R-11',
      'REC-PRUEBA-PAC-R-12', 'REC-PRUEBA-PAC-R-13', 'REC-PRUEBA-PAC-R-14',
      'REC-PRUEBA-MED-P-02', 'REC-PRUEBA-MED-P-03', 'REC-PRUEBA-MED-P-04', 'REC-PRUEBA-MED-P-05',
      'REC-PRUEBA-SIS-NO-ENTENDI', 'REC-PRUEBA-SIS-INTENSIDAD',
    ]);
    for (const r of conArchivo) {
      expect(r.tipo).toBe('video');
      expect(r.src).toBe(`recursos/${r.archivo}`);
      expect(r.procedencia).toMatch(/^(Iztacala Enseña|Indiscapacidad CDMX)/);
    }
  });

  it('Docs/RECURSOS_LSM.md está generado a partir del archivo de datos', () => {
    const r = validarCatalogo(datos);
    const notas = Object.fromEntries(
      (datos.entradas as Fila[]).filter((e) => typeof e.nota === 'string').map((e) => [e.id, e.nota as string]),
    );
    const esperado = generarDocumentoRecursos(r.cargado!, 'catalogo/ficticio-dev.json', notas);
    const actual = readFileSync('Docs/RECURSOS_LSM.md', 'utf8').replace(/\r\n/g, '\n');
    expect(actual, 'Ejecuta «npm run docs-recursos»').toBe(esperado);
  });
});

describe('Validador del catálogo: rechaza datos que cambiarían lo comunicado', () => {
  it('IDs repetidos de entrada y de recurso', () => {
    const r = copia((d) => {
      entrada(d, 'PAC-S-02').id = 'PAC-S-01';
      recurso(d, 'REC-PRUEBA-PAC-S-03').id = 'REC-PRUEBA-PAC-S-04';
    });
    expect(r.cargado).toBeUndefined();
    expect(errores(r)).toContain('El id de entrada «PAC-S-01» está repetido');
    expect(errores(r)).toContain('El id de recurso «REC-PRUEBA-PAC-S-04» está repetido');
  });

  it('asociaciones a recursos inexistentes, en entradas y en controles del sistema', () => {
    const r = copia((d) => {
      entrada(d, 'MED-P-01').recursoId = 'REC-NO-EXISTE';
      d.recursosSistema.confirmar = 'REC-TAMPOCO';
    });
    expect(errores(r)).toContain('Entrada MED-P-01: el recurso «REC-NO-EXISTE» no existe');
    expect(errores(r)).toContain('«confirmar» apunta al recurso «REC-TAMPOCO», que no existe');
  });

  it('un recurso validado sin archivo o sin aprobación registrada', () => {
    const r = copia((d) => {
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-01'), VALIDADO, { archivo: null });
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-02'), VALIDADO, { archivo: 'PAC-S-02.mp4', aprobacion: null });
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-03'), VALIDADO, { archivo: 'PAC-S-03.mp4', aprobacion: { quien: ' ', fecha: '20/11/2026' } });
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-04'), VALIDADO, { tipo: 'marcador-prueba', archivo: null });
    });
    const e = errores(r);
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-01: un recurso validado necesita su archivo');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-02: un recurso validado necesita la aprobación');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-03: falta quién aprobó');
    expect(e).toContain('la fecha de aprobación «20/11/2026» no es válida; usa AAAA-MM-DD');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-04: un recurso validado no puede ser «marcador-prueba»');
  });

  it('fechas imposibles', () => {
    const r = copia((d) => Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-01'), VALIDADO, { aprobacion: { quien: 'X', fecha: '2026-02-30' } }));
    expect(errores(r)).toContain('«2026-02-30» no es válida');
  });

  it('tipos y estados desconocidos', () => {
    const r = copia((d) => {
      entrada(d, 'PAC-S-01').tipo = 'sintomas';
      recurso(d, 'REC-PRUEBA-PAC-S-02').tipo = 'gif';
      recurso(d, 'REC-PRUEBA-PAC-S-03').estado = 'aprobado';
    });
    const e = errores(r);
    expect(e).toContain('Entrada PAC-S-01: el tipo «sintomas» no existe. Tipos admitidos: «sintoma»');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-02: el tipo «gif» no existe');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-03: el estado «aprobado» no existe. Estados admitidos: «validado», «prueba»');
  });

  it('textos vacíos o solo con espacios', () => {
    const r = copia((d) => {
      entrada(d, 'PAC-S-01').texto = '   ';
      entrada(d, 'PAC-S-02').significado = '';
      entrada(d, 'PAC-S-03').termino = '';
      recurso(d, 'REC-PRUEBA-PAC-S-04').procedencia = '';
      d.avisoAlcance.parrafos[1] = '';
    });
    const e = errores(r);
    expect(e).toContain('Entrada PAC-S-01: falta el texto en español («texto») o está vacío.');
    expect(e).toContain('Entrada PAC-S-02: falta el significado');
    expect(e).toContain('Entrada PAC-S-03: falta el término de búsqueda');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-04: falta la procedencia');
    expect(e).toContain('Aviso de alcance: el párrafo 2 está vacío.');
  });

  it('archivos fuera de public/recursos/ o de internet (RNF-03) y extensiones que no corresponden', () => {
    const r = copia((d) => {
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-01'), VALIDADO, { archivo: 'https://example.org/dolor.mp4' });
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-02'), VALIDADO, { archivo: '../secreto/PAC-S-02.mp4' });
      Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-03'), VALIDADO, { archivo: 'PAC-S-03.png' });
    });
    const e = errores(r);
    expect(e).toContain('es una dirección de internet. La app debe funcionar sin internet (RNF-03)');
    expect(e).toContain('debe ser solo un nombre (sin carpetas, espacios ni acentos)');
    expect(e).toContain('un recurso de tipo «video» debe ser .mp4 o .webm');
  });

  it('campos mal escritos, con sugerencia', () => {
    const r = copia((d) => {
      const e = entrada(d, 'MED-P-01');
      e.recursoID = e.recursoId;
      delete e.recursoId;
      d.recursosSistema.noEntiendo = 'REC-PRUEBA-SIS-NO-ENTENDI';
    });
    const e = errores(r);
    expect(e).toContain('Entrada MED-P-01: el campo «recursoID» no existe (¿quisiste escribir «recursoId»?)');
    expect(e).toContain('«recursoId» debe ser el id de un recurso o null');
    expect(e).toContain('la clave «noEntiendo» no existe (¿quisiste escribir «noEntendi»?)');
  });

  it('intensidad de dolor fuera de un síntoma e iconos que la app no sabe dibujar', () => {
    const r = copia((d) => {
      entrada(d, 'MED-P-02').esDolor = true;
      entrada(d, 'PAC-S-05').icono = 'pulmon';
    });
    const e = errores(r);
    expect(e).toContain('Entrada MED-P-02: solo un síntoma puede tener «esDolor»: true');
    expect(e).toContain('Entrada PAC-S-05: el icono «pulmon» no existe');
  });

  it('JSON que no es un catálogo', () => {
    expect(validarCatalogo(null).errores).toEqual(['El catálogo debe ser un objeto JSON { ... }.']);
    expect(errores(validarCatalogo({}))).toContain('«entradas» debe ser una lista');
  });

  it('avisa (sin bloquear) de recursos sin uso o compartidos', () => {
    const r = copia((d) => {
      entrada(d, 'PAC-S-05').recursoId = 'REC-PRUEBA-PAC-S-04';
    });
    expect(r.errores).toEqual([]);
    expect(r.avisos.join('\n')).toContain('Recurso REC-PRUEBA-PAC-S-05: ninguna entrada ni control del sistema lo usa.');
    expect(r.avisos.join('\n')).toContain('Recurso REC-PRUEBA-PAC-S-04: lo comparten Entrada PAC-S-04, Entrada PAC-S-05');
  });
});

describe('Recurso validado bien registrado', () => {
  const r = copia((d) => Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-01'), VALIDADO));

  it('se carga con su ruta local y su aprobación', () => {
    expect(r.errores).toEqual([]);
    const rec = r.cargado!.catalogo.recursos.find((x) => x.id === 'REC-PRUEBA-PAC-S-01')!;
    expect(rec).toMatchObject({ estado: 'validado', archivo: 'PAC-S-01.mp4', src: 'recursos/PAC-S-01.mp4' });
    expect(rec.aprobacion).toEqual(VALIDADO.aprobacion);
  });

  it('solo esa entrada pasa en el flujo de producto; las demás siguen bloqueadas', () => {
    const catalogo = r.cargado!.catalogo;
    const enviables = catalogo.entradas.filter((e) => sePuedeEnviar(recursoDeEntrada(catalogo, e, 'producto'))).map((e) => e.id);
    expect(enviables).toEqual(['PAC-S-01']);
  });
});

describe('Archivos de los recursos en public/recursos/ (RNF-03)', () => {
  const MP4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]);
  const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const catalogo = copia((d) => {
    Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-01'), VALIDADO);
    Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-02'), VALIDADO, { archivo: 'PAC-S-02.mp4' });
    Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-03'), VALIDADO, { archivo: 'PAC-S-03.mp4' });
    Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-04'), VALIDADO, { archivo: 'PAC-S-04.mp4' });
    Object.assign(recurso(d, 'REC-PRUEBA-PAC-S-05'), VALIDADO, { archivo: 'PAC-S-05.mp4' });
  }).cargado!.catalogo;
  const disco: Record<string, Uint8Array> = {
    'PAC-S-01.mp4': MP4,
    'PAC-S-03.mp4': new Uint8Array(0),
    'PAC-S-04.mp4': new TextEncoder().encode('<html>no es un video</html>'),
    'PAC-S-05.mp4': PNG,
  };
  const e = comprobarArchivos(catalogo, (a) => disco[a] ?? null).join('\n');

  it('acepta un archivo existente con contenido del formato correcto', () => {
    expect(e).not.toContain('REC-PRUEBA-PAC-S-01');
  });
  it('informa si falta, está vacío o está dañado, sin proponer otro', () => {
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-02 (validado): no se encontró el archivo public/recursos/PAC-S-02.mp4');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-03 (validado): el archivo public/recursos/PAC-S-03.mp4 está vacío');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-04 (validado): el archivo public/recursos/PAC-S-04.mp4 está dañado o no es MP4');
    expect(e).toContain('Recurso REC-PRUEBA-PAC-S-05 (validado): el archivo public/recursos/PAC-S-05.mp4 está dañado o no es MP4 (su contenido es PNG');
  });
  it('los marcadores de prueba no necesitan archivo', () => {
    const errores = comprobarArchivos(catalogoFicticio, () => null).join('\n');
    for (const r of catalogoFicticio.recursos.filter((x) => x.tipo === 'marcador-prueba')) {
      expect(errores).not.toContain(`Recurso ${r.id} `);
    }
  });
});
