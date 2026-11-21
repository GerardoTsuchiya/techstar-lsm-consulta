import { describe, expect, it } from 'vitest';
import { catalogoFicticio } from '../../catalogo/catalogoFicticio';
import { fabricaDeReconocedor } from '../fabrica';
import { leerTipoReconocedor } from '../tipoReconocedor';
import { asignarManos, caracteristicas, DIMENSION, PASOS, PESOS, referenciaDe, remuestrear } from './caracteristicas';
import { decidir, decidirVectores, dtw, esModeloReconocedor, type ModeloReconocedor, type Plantilla } from './clasificador';
import type { ExtractorPuntos } from './extractorMediaPipe';
import { circulo, linea, mano, quieta, secuencia } from '../../pruebas/secuenciasSinteticas';
import { espejar, esSecuenciaPuntos, type SecuenciaPuntos } from './puntos';
import { describirDiagnostico, ReconocedorExperimental } from './reconocedorExperimental';

/**
 * Pruebas del reconocedor experimental con secuencias SINTÉTICAS (no hay MediaPipe en jsdom):
 * características, DTW, rechazo de lo desconocido (RF-05), cancelación y política.
 */

function vectores(s: SecuenciaPuntos): number[][] {
  const c = caracteristicas(s);
  if (!c.ok) throw new Error(c.motivo);
  return c.vectores;
}

function modeloCon(plantillas: [string, SecuenciaPuntos][], umbralDistancia = 0.5, umbralMargen = 0.8): ModeloReconocedor {
  return {
    version: 1,
    descripcion: 'prueba',
    pasos: PASOS,
    pesos: PESOS,
    banda: 5,
    umbralDistancia,
    umbralMargen,
    plantillas: plantillas.map(([entrada, s]): Plantilla => ({ entrada, origen: entrada, vectores: vectores(s) })),
  };
}

describe('características', () => {
  it('no dependen de la posición ni del tamaño de la persona en la imagen', () => {
    const a = vectores(secuencia(circulo));
    const b = vectores(secuencia(circulo, { escala: 1.7, desplazamiento: [90, -40], ancho: 1280, alto: 720 }));
    expect(a).toHaveLength(PASOS);
    expect(a[0]).toHaveLength(DIMENSION);
    expect(dtw(a, b, 5)).toBeLessThan(1e-9);
  });

  it('recorta el tramo sin manos y remuestrea por tiempo', () => {
    const conPausa = vectores(secuencia(linea, { sinManosAlInicio: 8 }));
    expect(conPausa).toHaveLength(PASOS);
    expect(remuestrear([0, 1], [[0], [10]], 3)).toEqual([[0], [5], [10]]);
  });

  it('sin manos o sin hombros no hay características (la vista dirá «no reconocido»)', () => {
    const vacia: SecuenciaPuntos = { ancho: 640, alto: 480, cuadros: [{ t: 0, hombros: null, manos: [] }] };
    expect(caracteristicas(vacia)).toMatchObject({ ok: false, motivo: 'sin-manos' });
    const s = secuencia(circulo);
    const sinHombros = { ...s, cuadros: s.cuadros.map((c) => ({ ...c, hombros: null })) };
    expect(caracteristicas(sinHombros)).toMatchObject({ ok: false, motivo: 'sin-cuerpo' });
  });

  it('sigue cada mano aunque cruce el centro del cuerpo y pone primero la dominante', () => {
    // Mano que va de un lado al otro del cuerpo, más otra quieta en reposo del lado contrario.
    const s = secuencia((f) => [200 + 240 * f, 200]);
    s.cuadros = s.cuadros.map((c) => ({ ...c, manos: [...c.manos, mano(560, 560)] }));
    const pares = asignarManos(s.cuadros, referenciaDe(s)!);
    expect(pares.every(([dominante]) => dominante && dominante[0]![1] === 200)).toBe(true);
    expect(pares.every(([, otra]) => otra && otra[0]![0] === 560)).toBe(true);
    // El espejo cambia la posición, no cuál es la dominante.
    const e = espejar(s);
    expect(asignarManos(e.cuadros, referenciaDe(e)!).every(([d]) => d && d[0]![1] === 200)).toBe(true);
  });

  it('valida la forma de los puntos leídos de un archivo', () => {
    expect(esSecuenciaPuntos(secuencia(circulo))).toBe(true);
    expect(esSecuenciaPuntos({ ancho: 1, alto: 1, cuadros: [{ t: 0, hombros: null, manos: [[[0, 0]]] }] })).toBe(false);
  });
});

describe('clasificador', () => {
  it('DTW tolera la misma seña más lenta o más rápida', () => {
    const lenta = secuencia((f) => circulo(Math.min(1, f * f * 1.0)));
    expect(dtw(vectores(secuencia(circulo)), vectores(lenta), 5)).toBeLessThan(dtw(vectores(secuencia(circulo)), vectores(secuencia(linea)), 5));
  });

  it('reconoce la seña más parecida si está cerca y se distingue de la segunda', () => {
    const m = modeloCon([
      ['PAC-S-04', secuencia(circulo)],
      ['PAC-S-05', secuencia(linea)],
    ]);
    expect(decidir(m, secuencia(circulo, { escala: 1.2 }))).toMatchObject({ tipo: 'reconocido', entrada: 'PAC-S-04' });
    expect(decidir(m, secuencia(linea))).toMatchObject({ tipo: 'reconocido', entrada: 'PAC-S-05' });
  });

  it('RF-05: algo lejano de todas las plantillas es «desconocido», nunca la más parecida', () => {
    const m = modeloCon([
      ['PAC-S-04', secuencia(circulo)],
      ['PAC-S-05', secuencia(linea)],
    ]);
    const d = decidir(m, secuencia(quieta, { abierta: 0.1 }));
    expect(d).toMatchObject({ tipo: 'desconocido', motivo: 'lejana' });
  });

  it('RF-05: si dos señas quedan casi a la misma distancia, es «desconocido» (ambigua)', () => {
    // Solo la mano sube o baja 20 px: la consulta queda justo a la mitad.
    const corrida = (dy: number) => (f: number): [number, number] => [circulo(f)[0], circulo(f)[1] + dy];
    const m = modeloCon(
      [
        ['PAC-S-04', secuencia(corrida(-20))],
        ['PAC-S-05', secuencia(corrida(20))],
      ],
      10,
    );
    expect(decidirVectores(m, vectores(secuencia(circulo)))).toMatchObject({ tipo: 'desconocido', motivo: 'ambigua' });
    expect(decidirVectores(m, vectores(secuencia(corrida(-18))))).toMatchObject({ tipo: 'reconocido', entrada: 'PAC-S-04' });
  });

  it('valida el archivo del modelo', () => {
    expect(esModeloReconocedor(modeloCon([['PAC-S-04', secuencia(circulo)]]))).toBe(true);
    expect(esModeloReconocedor({ version: 2 })).toBe(false);
  });
});

/** Extractor falso: devuelve la secuencia indicada sin mirar el clip. */
function extractorFalso(s: SecuenciaPuntos | (() => Promise<SecuenciaPuntos>)): ExtractorPuntos {
  return { extraer: (_fuente, senal) => (senal.aborted ? Promise.reject(senal.reason) : typeof s === 'function' ? s() : Promise.resolve(s)) };
}

const clip = { capturaId: 'cap-1', datos: new Blob(), duracionMs: 2000 };

describe('ReconocedorExperimental', () => {
  const modelo = modeloCon([
    ['PAC-S-04', secuencia(circulo)],
    ['PAC-S-05', secuencia(linea)],
    ['MED-P-01', secuencia(quieta)], // no es del paciente: se ignora
  ]);

  it('solo existe en modo desarrollo; en producto ninguna fábrica da reconocedor (D33)', () => {
    expect(() => new ReconocedorExperimental('producto', catalogoFicticio)).toThrow(/modo desarrollo/);
    expect(fabricaDeReconocedor('experimental')('producto', catalogoFicticio)).toBeNull();
    expect(fabricaDeReconocedor('simulado')('producto', catalogoFicticio)).toBeNull();
    expect(leerTipoReconocedor('cualquiera')).toBe('simulado');
  });

  it('reconoce, no es simulado, está marcado como experimental y guarda solo el diagnóstico', async () => {
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => extractorFalso(secuencia(circulo)),
    });
    expect(r.simulado).toBe(false);
    expect(r.experimental).toBe(true);
    expect(r.vocabulario).toEqual(['PAC-S-01', 'PAC-S-04', 'PAC-S-05', 'PAC-S-07', 'PAC-S-08', 'PAC-R-01', 'PAC-R-02', 'PAC-R-03']);
    expect(await r.reconocer(clip, new AbortController().signal)).toEqual({ tipo: 'reconocido', entradaId: 'PAC-S-04' });
    expect(Object.keys(r.ultimoDiagnostico!)).not.toContain('puntos');
    expect(describirDiagnostico(r.ultimoDiagnostico)).toMatch(/Distancia .*umbral.*respuesta en/);
  });

  it('una plantilla de una entrada fuera del paciente nunca es resultado (responde «desconocido»)', async () => {
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => extractorFalso(secuencia(quieta)),
    });
    expect(await r.reconocer(clip, new AbortController().signal)).toEqual({ tipo: 'desconocido' });
    expect(describirDiagnostico(r.ultimoDiagnostico)).toMatch(/^Rechazo/);
  });

  it('sin manos visibles responde «desconocido»', async () => {
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => extractorFalso({ ancho: 640, alto: 480, cuadros: [] }),
    });
    expect(await r.reconocer(clip, new AbortController().signal)).toEqual({ tipo: 'desconocido' });
    expect(describirDiagnostico(r.ultimoDiagnostico)).toMatch(/no se vieron las manos/);
  });

  it('al cancelar deja de esperar y no devuelve resultado', async () => {
    let soltar: (s: SecuenciaPuntos) => void = () => {};
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: async () => modelo,
      extractor: async () => extractorFalso(() => new Promise((res) => (soltar = res))),
    });
    const control = new AbortController();
    const promesa = r.reconocer(clip, control.signal);
    await Promise.resolve();
    control.abort(new DOMException('Cancelado', 'AbortError'));
    soltar(secuencia(circulo));
    await expect(promesa).rejects.toThrow(/Cancelado/);
    expect(r.ultimoDiagnostico).toBeNull();
  });

  it('si el modelo no carga, el reconocimiento falla (la vista lo informa) sin inventar un resultado', async () => {
    const r = new ReconocedorExperimental('desarrollo', catalogoFicticio, {
      cargarModelo: () => Promise.reject(new Error('sin modelo')),
      extractor: async () => extractorFalso(secuencia(circulo)),
    });
    await expect(r.reconocer(clip, new AbortController().signal)).rejects.toThrow('sin modelo');
  });
});

describe('posición de reposo', () => {
  it('manos a la altura de la cintura no cuentan como seña', () => {
    const cintura = secuencia((): [number, number] => [300, 300 + 200 * 1.2]);
    expect(caracteristicas(cintura)).toMatchObject({ ok: false, motivo: 'sin-manos' });
  });
});
