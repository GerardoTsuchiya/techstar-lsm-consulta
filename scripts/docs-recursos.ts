/**
 * npm run docs-recursos
 *
 * Regenera `Docs/RECURSOS_LSM.md` a partir del catálogo que usa la app.
 * Solo escribe si el catálogo no tiene errores (`npm run validar-catalogo` da el detalle).
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { generarDocumentoRecursos } from '../src/catalogo/documentoRecursos.ts';
import { validarCatalogo } from '../src/catalogo/validarCatalogo.ts';
import { CATALOGO_APP, DOCUMENTO, leerJson, notasDeEntradas, RAIZ } from './comun.ts';

const lectura = leerJson(CATALOGO_APP);
if (!lectura.ok) {
  console.error(lectura.error);
  process.exit(1);
}
const resultado = validarCatalogo(lectura.datos);
if (!resultado.cargado) {
  console.error(`${CATALOGO_APP} tiene errores; no se regenera ${DOCUMENTO}:`);
  for (const e of resultado.errores) console.error(`  - ${e}`);
  process.exit(1);
}
writeFileSync(
  path.join(RAIZ, DOCUMENTO),
  generarDocumentoRecursos(resultado.cargado, CATALOGO_APP, notasDeEntradas(lectura.datos)),
  'utf8',
);
console.log(`${DOCUMENTO} actualizado desde ${CATALOGO_APP}.`);
