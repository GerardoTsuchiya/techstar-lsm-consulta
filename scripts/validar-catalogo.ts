/**
 * npm run validar-catalogo [-- catalogo/otro.json]
 *
 * Revisa los archivos de `catalogo/` (todos, o los indicados), que los archivos de
 * `public/recursos/` existan y no estén dañados, y que `guias/RECURSOS_LSM.md` esté al día.
 * Termina con código 1 si hay errores (así `npm run check` falla).
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { generarDocumentoRecursos } from '../src/catalogo/documentoRecursos.ts';
import { comprobarArchivos, validarCatalogo } from '../src/catalogo/validarCatalogo.ts';
import { archivosPublicos, CARPETA_PUBLICA, CATALOGO_APP, DOCUMENTO, leerJson, leerRecurso, notasDeEntradas, RAIZ } from './comun.ts';

const pedidos = process.argv.slice(2);
const archivos = pedidos.length
  ? pedidos.map((a) => path.relative(RAIZ, path.resolve(a)).replace(/\\/g, '/'))
  : readdirSync(path.join(RAIZ, 'catalogo'))
      .filter((n) => n.endsWith('.json'))
      .map((n) => `catalogo/${n}`);

const presentes = archivosPublicos();
const usados = new Set<string>();
let totalErrores = 0;

const imprimir = (titulo: string, lineas: string[]) => {
  if (lineas.length === 0) return;
  console.log(`  ${titulo} (${lineas.length}):`);
  for (const l of lineas) console.log(`    - ${l}`);
};

for (const archivo of archivos) {
  console.log(`\n${archivo}`);
  const lectura = leerJson(archivo);
  if (!lectura.ok) {
    imprimir('Errores', [lectura.error]);
    totalErrores++;
    continue;
  }

  const resultado = validarCatalogo(lectura.datos);
  const errores = [...resultado.errores];
  if (resultado.cargado) {
    const { catalogo } = resultado.cargado;
    for (const r of catalogo.recursos) if (r.archivo) usados.add(r.archivo);
    errores.push(...comprobarArchivos(catalogo, (a) => leerRecurso(a, presentes)));

    if (archivo === CATALOGO_APP) {
      const esperado = generarDocumentoRecursos(resultado.cargado, CATALOGO_APP, notasDeEntradas(lectura.datos));
      let actual = '';
      try {
        actual = readFileSync(path.join(RAIZ, DOCUMENTO), 'utf8');
      } catch {
        /* falta el documento: se informa abajo */
      }
      if (actual.replace(/\r\n/g, '\n') !== esperado) {
        errores.push(`${DOCUMENTO} no coincide con ${CATALOGO_APP}. Ejecuta «npm run docs-recursos» para regenerarlo.`);
      }
    }
  }

  imprimir('Errores', errores);
  imprimir('Avisos', resultado.avisos);
  totalErrores += errores.length;
  if (errores.length === 0 && resultado.cargado) {
    const { catalogo } = resultado.cargado;
    const validados = catalogo.recursos.filter((r) => r.estado === 'validado').length;
    console.log(
      `  Correcto: ${catalogo.entradas.length} entradas, ${catalogo.recursos.length} recursos (${validados} validados).`,
    );
  }
}

const sobrantes = presentes.filter((n) => !usados.has(n) && n !== 'README.md');
if (sobrantes.length > 0) {
  console.log(`\n${CARPETA_PUBLICA}/`);
  imprimir('Avisos', sobrantes.map((n) => `«${n}» no está en ningún catálogo (¿falta registrarlo o sobra?).`));
}

if (totalErrores > 0) {
  console.error(`\nEl catálogo tiene ${totalErrores} error(es). La app no abrirá ninguna consulta hasta corregirlos.`);
  process.exit(1);
}
console.log('\nCatálogo correcto.');
