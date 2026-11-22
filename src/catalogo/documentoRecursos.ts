import type { ClaveSistema, EntradaCatalogo, Recurso } from '../nucleo/tipos';
import { USOS_SISTEMA, type CatalogoCargado } from './validarCatalogo.ts';

/**
 * Genera `guias/RECURSOS_LSM.md` a partir del archivo de datos del catálogo (TECHSTAR_MVP.md §6.1).
 * Lo usan `npm run docs-recursos` (escribe el documento) y `npm run validar-catalogo`
 * (comprueba que el documento está al día). Solo importa tipos y funciones puras.
 */

type ConNota = EntradaCatalogo & { nota?: string };

const TIPO_ENTRADA: Record<EntradaCatalogo['tipo'], string> = {
  sintoma: 'síntoma',
  'respuesta-paciente': 'respuesta breve',
  'pregunta-medico': 'pregunta',
  'respuesta-medico': 'respuesta',
};

/** Escapa lo que rompería una celda de tabla en Markdown. */
const celda = (t: string) => t.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');

function estadoEntrada(e: EntradaCatalogo, recursos: Map<string, Recurso>): string {
  if (!e.recursoId) return 'sin recurso';
  return recursos.get(e.recursoId)?.estado ?? 'sin recurso';
}

function aprobacion(r: Recurso): string {
  return r.aprobacion ? `${r.aprobacion.quien}, ${r.aprobacion.fecha}` : '—';
}

const CAMPOS_COMUNES = [
  ['procedencia', 'Procedencia'],
  ['condicionesUso', 'Condiciones de uso'],
  ['revisionLinguistica', 'Revisión lingüística'],
  ['estadoReproduccion', 'Estado de reproducción'],
] as const;

function tablaEntradas(entradas: ConNota[], recursos: Map<string, Recurso>): string[] {
  const filas = [
    '| ID | Tipo | Significado | Texto en español | Término de búsqueda | Icono | Recurso asociado | Estado | Nota |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  for (const e of entradas) {
    const tipo = TIPO_ENTRADA[e.tipo] + (e.esDolor ? ' (dolor)' : '');
    const recurso = e.recursoId ?? '**ninguno**';
    const nota = e.nota ?? '';
    filas.push(
      `| ${e.id} | ${tipo} | ${celda(e.significado)} | ${celda(e.texto)} | ${celda(e.termino)} | ${e.icono} | ${recurso} | ${estadoEntrada(e, recursos)} | ${celda(nota)} |`,
    );
  }
  return filas;
}

export function generarDocumentoRecursos(cargado: CatalogoCargado, archivoDatos: string, notasEntradas: Record<string, string> = {}): string {
  const { catalogo } = cargado;
  const recursos = new Map(catalogo.recursos.map((r) => [r.id, r]));
  const entradas: ConNota[] = catalogo.entradas.map((e) => ({ ...e, nota: notasEntradas[e.id] }));
  const validados = catalogo.recursos.filter((r) => r.estado === 'validado');
  const conValidado = catalogo.entradas.filter((e) => estadoEntrada(e, recursos) === 'validado').length;
  const conPrueba = catalogo.entradas.filter((e) => estadoEntrada(e, recursos) === 'prueba').length;
  const sinRecurso = catalogo.entradas.length - conValidado - conPrueba;

  // Valores iguales en todos los recursos: se muestran una sola vez.
  const comunes = CAMPOS_COMUNES.filter(
    ([campo]) => catalogo.recursos.length > 1 && catalogo.recursos.every((r) => r[campo] === catalogo.recursos[0]![campo]),
  );
  const propios = CAMPOS_COMUNES.filter((c) => !comunes.includes(c));

  const l: string[] = [];
  l.push('# Inventario de recursos en LSM · pendientes de validación', '');
  l.push(
    `<!-- Documento GENERADO desde ${archivoDatos} con \`npm run docs-recursos\`. No editar a mano: los cambios se pierden. -->`,
    '',
  );
  l.push(
    `Registro exigido por \`TECHSTAR_MVP.md\` §6.1. Catálogo: \`${catalogo.version}\` ([${archivoDatos}](../${archivoDatos})).`,
    'Para agregar o cambiar entradas y recursos, ver la sección «Editar el catálogo» del [README](../README.md).',
    '',
  );

  l.push('## Estado general', '');
  l.push(
    `- Entradas: **${catalogo.entradas.length}** · con recurso validado: **${conValidado}** · con recurso de prueba: **${conPrueba}** · sin recurso: **${sinRecurso}**.`,
  );
  l.push(
    validados.length === 0
      ? '- **Ningún recurso está validado.** En el **flujo de producto** (`recursos=producto`) todas las entradas quedan bloqueadas.'
      : `- Recursos validados: **${validados.length}** (${validados.map((r) => r.id).join(', ')}). En el flujo de producto solo se pueden enviar las entradas asociadas a ellos.`,
  );
  if (catalogo.ficticio) {
    l.push('- El contenido del catálogo es **ficticio**. El Catálogo V1 sigue pendiente de definir y aprobar (SRS 1.6 §1.3).');
  }
  const pruebaConArchivo = catalogo.recursos.filter((r) => r.estado === 'prueba' && r.tipo !== 'marcador-prueba').length;
  const marcadores = catalogo.recursos.filter((r) => r.tipo === 'marcador-prueba').length;
  l.push(
    `- Recursos de prueba con archivo (video o imagen en LSM de una fuente externa, **sin validar**): **${pruebaConArchivo}**. En modo desarrollo se reproducen con la etiqueta ámbar «Prueba · LSM sin validar»; en el flujo de producto siguen bloqueados.`,
    `- Marcadores de prueba (sin archivo): **${marcadores}**. Se muestran como silueta neutra con icono y etiqueta ámbar «Prueba · no es LSM».`,
    '- Ningún recurso de prueba **acredita comprensión en LSM** hasta su revisión lingüística y aprobación.',
    '- Los iconos de apoyo visual (Lucide, licencia ISC; el del estómago es propio) son provisionales y no están validados con personas Sordas. Están en `src/vistas/comunes/IconoEntrada.tsx`.',
    '- Fuentes candidatas: Iztacala Enseña (la del plan original) y el Portal LSM de Indiscapacidad CDMX; «Sí» y «No» vienen del canal de YouTube de Sol Lara (fuente individual). Inventario de videos candidatos en [recursos-candidatos/](../recursos-candidatos/README.md). Antes de validar un recurso, falta comprobar que corresponde al mensaje completo, que funciona en la app, que el uso está permitido, y registrar la aprobación entrada–recurso.',
    '- Las entradas con contenido clínico (síntomas, alergias, medicamentos) también requieren revisión del personal médico.',
    '',
  );

  if (comunes.length > 0) {
    l.push('Valores comunes a todos los recursos:', '', '| Campo | Valor |', '|---|---|');
    for (const [campo, nombre] of comunes) l.push(`| ${nombre} | ${celda(catalogo.recursos[0]![campo])} |`);
    l.push('');
  }

  l.push('## Entradas del paciente', '');
  l.push(...tablaEntradas(entradas.filter((e) => e.tipo === 'sintoma' || e.tipo === 'respuesta-paciente'), recursos), '');
  l.push('## Entradas del médico', '');
  l.push(...tablaEntradas(entradas.filter((e) => e.tipo === 'pregunta-medico' || e.tipo === 'respuesta-medico'), recursos), '');

  l.push('## Recursos de controles y avisos del sistema', '');
  l.push('| Clave | Uso | Recurso | Estado |', '|---|---|---|---|');
  for (const clave of Object.keys(USOS_SISTEMA) as ClaveSistema[]) {
    const id = catalogo.recursosSistema[clave];
    const r = id ? recursos.get(id) : undefined;
    l.push(`| ${clave} | ${USOS_SISTEMA[clave]} | ${r ? r.id : '**ninguno**'} | ${r ? r.estado : 'sin recurso'} |`);
  }
  l.push('');

  l.push('## Detalle de recursos', '');
  const encabezado = ['ID', 'Tipo', 'Estado', 'Qué debe mostrar', 'Archivo', 'Aprobación (quién, fecha)', ...propios.map(([, n]) => n)];
  l.push(`| ${encabezado.join(' | ')} |`, `|${encabezado.map(() => '---').join('|')}|`);
  for (const r of catalogo.recursos) {
    const archivo = r.archivo ? `\`public/recursos/${r.archivo}\`` : '—';
    const extra = propios.map(([campo]) => celda(r[campo]));
    l.push(`| ${[r.id, r.tipo, r.estado, celda(r.descripcion), archivo, celda(aprobacion(r)), ...extra].join(' | ')} |`);
  }
  l.push('');

  return l.join('\n');
}
