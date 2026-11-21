/**
 * npm run evaluar-reconocedor
 *
 * Entrena y evalúa el reconocedor experimental con los puntos extraídos de los videos web
 * (`recursos-candidatos/puntos/`, generados con `npm run herramienta-puntos`). Evaluación
 * **preliminar**: solo hay 1 o 2 personas por fuente, videos de estudio y ninguna persona Sorda
 * de la asociación (ver Docs/RECONOCEDOR.md).
 *
 * 1. Plantillas: cada video del vocabulario y su espejo.
 * 2. Umbrales de rechazo: se calibran con la validación «dejando uno fuera» del vocabulario y la
 *    mitad A de las expresiones desconocidas; las falsas aceptaciones se informan con la mitad B.
 * 3. Escribe `public/modelos/plantillas-lsm.json` (lo carga la app) y
 *    `recursos-candidatos/evaluacion-reconocedor.json` (resultados, sin puntos).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { caracteristicas, DIMENSION, PASOS, PESOS } from '../src/reconocimiento/experimental/caracteristicas.ts';
import { decidirVectores, type Decision, type ModeloReconocedor, type Plantilla } from '../src/reconocimiento/experimental/clasificador.ts';
import { espejar, esSecuenciaPuntos, type SecuenciaPuntos } from '../src/reconocimiento/experimental/puntos.ts';
import { RAIZ } from './comun.ts';

const BANDA = 5;
/** Penalización de una falsa aceptación frente a un acierto perdido al calibrar (RF-05: nunca adivinar). */
const PESO_FALSA_ACEPTACION = 2;

interface VideoInventario {
  archivo: string;
  fuente: string;
  senaEnSitio: string;
  uso: 'plantilla' | 'desconocida' | 'excluido';
  entrada?: string;
}

interface Muestra {
  v: VideoInventario;
  /** null si no se vieron manos o cuerpo: se cuenta como «desconocido» directo. */
  vectores: number[][] | null;
  espejo: number[][] | null;
  motivo?: string;
}

const inventario = JSON.parse(readFileSync(path.join(RAIZ, 'recursos-candidatos/inventario-reconocedor.json'), 'utf8')) as {
  vocabulario: { entrada: string }[];
  videos: VideoInventario[];
};

function leerPuntos(v: VideoInventario): SecuenciaPuntos | null {
  const ruta = path.join(RAIZ, 'recursos-candidatos/puntos', `${v.archivo.replace(/\.mp4$/, '')}.reproducir.json`);
  if (!existsSync(ruta)) return null;
  const datos: unknown = JSON.parse(readFileSync(ruta, 'utf8'));
  if (!esSecuenciaPuntos(datos)) throw new Error(`Puntos inválidos: ${ruta}`);
  return datos;
}

const faltantes: string[] = [];
const muestras: Muestra[] = [];
for (const v of inventario.videos.filter((x) => x.uso !== 'excluido')) {
  const s = leerPuntos(v);
  if (!s) {
    faltantes.push(v.archivo);
    continue;
  }
  const c = caracteristicas(s);
  const e = caracteristicas(espejar(s));
  muestras.push({ v, vectores: c.ok ? c.vectores : null, espejo: e.ok ? e.vectores : null, motivo: c.ok ? undefined : c.motivo });
}
if (faltantes.length > 0) {
  console.error(`Faltan los puntos de ${faltantes.length} videos (corre npm run herramienta-puntos):\n  ${faltantes.join('\n  ')}`);
  process.exit(1);
}

const conocidas = muestras.filter((m) => m.v.uso === 'plantilla');
const desconocidas = muestras.filter((m) => m.v.uso === 'desconocida').sort((a, b) => a.v.archivo.localeCompare(b.v.archivo));
const mitadA = desconocidas.filter((_, i) => i % 2 === 0);
const mitadB = desconocidas.filter((_, i) => i % 2 === 1);

function plantillasDe(ms: Muestra[]): Plantilla[] {
  return ms.flatMap((m) => [
    ...(m.vectores ? [{ entrada: m.v.entrada!, origen: m.v.archivo, vectores: m.vectores }] : []),
    ...(m.espejo ? [{ entrada: m.v.entrada!, origen: `${m.v.archivo} (espejo)`, vectores: m.espejo }] : []),
  ]);
}

function modelo(plantillas: Plantilla[], umbralDistancia = Infinity, umbralMargen = 1): ModeloReconocedor {
  return {
    version: 1,
    descripcion: '',
    pasos: PASOS,
    pesos: PESOS,
    banda: BANDA,
    umbralDistancia,
    umbralMargen,
    plantillas,
  };
}

function decidirMuestra(mod: ModeloReconocedor, m: Muestra): Decision {
  if (!m.vectores) return { tipo: 'desconocido', motivo: (m.motivo as 'sin-manos' | 'sin-cuerpo') ?? 'sin-manos' };
  return decidirVectores(mod, m.vectores);
}

/** Decisión sin umbrales (para calibrar): la entrada más parecida con su distancia y margen. */
interface Crudo {
  m: Muestra;
  esperado: string | null;
  masParecida: string | null;
  distancia: number;
  margen: number;
}

function crudo(mod: ModeloReconocedor, m: Muestra, esperado: string | null): Crudo {
  const d = decidirMuestra(mod, m);
  if (d.tipo === 'reconocido') return { m, esperado, masParecida: d.entrada, distancia: d.distancia, margen: d.margen };
  return { m, esperado, masParecida: d.masParecida ?? null, distancia: d.distancia ?? Infinity, margen: d.margen ?? 1 };
}

const aceptado = (c: Crudo, tau: number, rho: number) => c.masParecida !== null && c.distancia <= tau && c.margen <= rho;

// --- 1. Validación «dejando uno fuera» (sin umbrales) -------------------------------------------
const evaluables = conocidas.filter((m) => conocidas.some((o) => o !== m && o.v.entrada === m.v.entrada));
const noEvaluables = conocidas.filter((m) => !evaluables.includes(m));
const loo = evaluables.map((m) => crudo(modelo(plantillasDe(conocidas.filter((o) => o !== m))), m, m.v.entrada!));

// --- 2. Entre fuentes: plantillas de una fuente, prueba con la otra (otra persona) ---------------
const fuenteCorta = (f: string) => (f.startsWith('Iztacala') ? 'IZT' : f.startsWith('Indiscapacidad') ? 'IND' : 'SOL');
const entreFuentes = conocidas.flatMap((m) => {
  const otras = conocidas.filter((o) => fuenteCorta(o.v.fuente) !== fuenteCorta(m.v.fuente));
  if (!otras.some((o) => o.v.entrada === m.v.entrada)) return [];
  return [crudo(modelo(plantillasDe(otras)), m, m.v.entrada!)];
});

// --- 3. Expresiones desconocidas contra todas las plantillas -------------------------------------
const completo = modelo(plantillasDe(conocidas));
const crudoA = mitadA.map((m) => crudo(completo, m, null));
const crudoB = mitadB.map((m) => crudo(completo, m, null));

// --- 4. Calibración de umbrales con LOO + mitad A ------------------------------------------------
const candidatosTau = [...new Set([...loo, ...crudoA].map((c) => c.distancia).filter(Number.isFinite))].sort((a, b) => a - b);
const candidatosRho = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1];
let mejor = { tau: 0, rho: 1, puntaje: -Infinity, aciertos: 0, falsas: 0 };
for (const tau of candidatosTau) {
  for (const rho of candidatosRho) {
    const aciertos = loo.filter((c) => aceptado(c, tau, rho) && c.masParecida === c.esperado).length;
    const errores = loo.filter((c) => aceptado(c, tau, rho) && c.masParecida !== c.esperado).length;
    const falsas = crudoA.filter((c) => aceptado(c, tau, rho)).length;
    const puntaje =
      aciertos / Math.max(loo.length, 1) - (PESO_FALSA_ACEPTACION * (falsas / Math.max(crudoA.length, 1) + errores / Math.max(loo.length, 1)));
    if (puntaje > mejor.puntaje + 1e-9) mejor = { tau, rho, puntaje, aciertos, falsas };
  }
}
const tau = Number(mejor.tau.toFixed(4));
const rho = mejor.rho;

// --- 5. Resultados con los umbrales elegidos -----------------------------------------------------
type Resultado = 'acierto' | 'confusion' | 'rechazo' | 'falsa-aceptacion' | 'rechazo-correcto';
function resultado(c: Crudo): Resultado {
  const ok = aceptado(c, tau, rho);
  if (c.esperado === null) return ok ? 'falsa-aceptacion' : 'rechazo-correcto';
  if (!ok) return 'rechazo';
  return c.masParecida === c.esperado ? 'acierto' : 'confusion';
}
const fila = (c: Crudo) => ({
  archivo: c.m.v.archivo,
  fuente: fuenteCorta(c.m.v.fuente),
  sena: c.m.v.senaEnSitio,
  esperado: c.esperado,
  masParecida: c.masParecida,
  distancia: Number.isFinite(c.distancia) ? Number(c.distancia.toFixed(3)) : null,
  margen: Number(c.margen.toFixed(3)),
  resultado: resultado(c),
  ...(c.m.motivo ? { motivo: c.m.motivo } : {}),
});

const vocabulario = inventario.vocabulario.map((x) => x.entrada);
const porSena = (filas: ReturnType<typeof fila>[]) =>
  vocabulario.map((entrada) => {
    const f = filas.filter((x) => x.esperado === entrada);
    return {
      entrada,
      muestras: f.length,
      aciertos: f.filter((x) => x.resultado === 'acierto').length,
      rechazos: f.filter((x) => x.resultado === 'rechazo').length,
      confusiones: f.filter((x) => x.resultado === 'confusion').map((x) => x.masParecida),
    };
  });

const filasLoo = loo.map(fila);
const filasEntre = entreFuentes.map(fila);
const filasA = crudoA.map(fila);
const filasB = crudoB.map(fila);
const contar = (f: ReturnType<typeof fila>[], r: Resultado) => f.filter((x) => x.resultado === r).length;

const evaluacion = {
  fecha: new Date().toISOString().slice(0, 10),
  aviso: 'PRELIMINAR. Videos web de estudio, 1 o 2 personas por fuente, sin personas Sordas de la asociación ni otra cámara. Umbrales calibrados con los mismos videos (LOO + mitad A de desconocidas).',
  metodo: { pasos: PASOS, dimension: DIMENSION, pesos: PESOS, banda: BANDA, pesoFalsaAceptacion: PESO_FALSA_ACEPTACION },
  umbrales: { distancia: tau, margen: rho },
  noEvaluablesPorValidacionCruzada: noEvaluables.map((m) => ({ archivo: m.v.archivo, entrada: m.v.entrada, motivo: 'Única muestra de su seña' })),
  dejandoUnoFuera: { resumen: porSena(filasLoo), filas: filasLoo },
  entreFuentes: { resumen: porSena(filasEntre), filas: filasEntre },
  desconocidasCalibracion: { total: filasA.length, falsasAceptaciones: contar(filasA, 'falsa-aceptacion'), filas: filasA },
  desconocidasPrueba: { total: filasB.length, falsasAceptaciones: contar(filasB, 'falsa-aceptacion'), filas: filasB },
};
writeFileSync(path.join(RAIZ, 'recursos-candidatos/evaluacion-reconocedor.json'), `${JSON.stringify(evaluacion, null, 2)}\n`);

const redondeo = (vs: number[][]) => vs.map((f) => f.map((x) => Math.round(x * 1e4) / 1e4));
const modeloFinal: ModeloReconocedor = {
  ...completo,
  descripcion: `Reconocedor experimental NO VALIDADO (${evaluacion.fecha}). Plantillas de videos web de Iztacala Enseña, Indiscapacidad CDMX y Sol Lara (permiso de entrenamiento). Ver Docs/RECONOCEDOR.md.`,
  umbralDistancia: tau,
  umbralMargen: rho,
  plantillas: completo.plantillas.map((p) => ({ ...p, vectores: redondeo(p.vectores) })),
};
writeFileSync(path.join(RAIZ, 'public/modelos/plantillas-lsm.json'), `${JSON.stringify(modeloFinal)}\n`);

// --- Resumen en consola (Markdown) ---------------------------------------------------------------
const tabla = (titulo: string, filas: ReturnType<typeof porSena>) => {
  console.log(`\n### ${titulo}\n\n| Entrada | Muestras | Aciertos | Rechazos | Confusiones |\n|---|---|---|---|---|`);
  for (const r of filas) if (r.muestras > 0) console.log(`| ${r.entrada} | ${r.muestras} | ${r.aciertos} | ${r.rechazos} | ${r.confusiones.join(', ') || '—'} |`);
  const t = filas.reduce((s, r) => ({ m: s.m + r.muestras, a: s.a + r.aciertos }), { m: 0, a: 0 });
  console.log(`| **Total** | ${t.m} | ${t.a} | | |`);
};
console.log(`Umbrales: distancia ≤ ${tau}, margen ≤ ${rho} (calibración: ${mejor.aciertos}/${loo.length} aciertos LOO, ${mejor.falsas}/${crudoA.length} falsas en A)`);
console.log(`No evaluables por validación cruzada: ${noEvaluables.map((m) => m.v.entrada).join(', ') || '—'}`);
tabla('Dejando uno fuera', porSena(filasLoo));
tabla('Entre fuentes (otra persona)', porSena(filasEntre));
console.log(`\nDesconocidas, mitad A (calibración): ${contar(filasA, 'falsa-aceptacion')} falsas aceptaciones de ${filasA.length}`);
console.log(`Desconocidas, mitad B (prueba): ${contar(filasB, 'falsa-aceptacion')} falsas aceptaciones de ${filasB.length}`);
for (const f of [...filasA, ...filasB].filter((x) => x.resultado === 'falsa-aceptacion')) console.log(`  · ${f.sena} (${f.fuente}) → ${f.masParecida} (d=${f.distancia}, m=${f.margen})`);
console.log(`\nPlantillas: ${modeloFinal.plantillas.length} → public/modelos/plantillas-lsm.json`);
