import type {
  AprobacionRecurso,
  Catalogo,
  ClaveSistema,
  EntradaCatalogo,
  EstadoRecurso,
  Recurso,
  TipoEntrada,
  TipoRecurso,
} from '../nucleo/tipos';

/**
 * Validación del archivo de datos del catálogo (`catalogo/*.json`).
 *
 * La usan la app (al cargar el catálogo), Electron (antes de abrir la sesión) y
 * `npm run validar-catalogo`. Solo importa tipos: así el script de Node puede cargarla sin compilar.
 * No cambia reglas de negocio: un catálogo inválido no se usa, y nunca se rellena un dato
 * faltante con otro (RI-01).
 */

// ------------------------------------------------------------ Valores admitidos

/** `Record` obliga a que cada lista coincida exactamente con su tipo en `nucleo/tipos.ts`. */
const TIPOS_ENTRADA: Record<TipoEntrada, string> = {
  sintoma: 'síntoma del paciente',
  'respuesta-paciente': 'respuesta breve del paciente',
  'pregunta-medico': 'pregunta del médico',
  'respuesta-medico': 'respuesta o indicación del médico',
};

const TIPOS_RECURSO: Record<TipoRecurso, string> = {
  video: 'video',
  imagen: 'imagen',
  'marcador-prueba': 'marcador de prueba (sin archivo)',
};

const ESTADOS_RECURSO: Record<EstadoRecurso, string> = {
  validado: 'validado',
  prueba: 'prueba',
};

/** Uso de cada recurso de sistema (TECHSTAR_MVP.md §6.1). También lo usa `Docs/RECURSOS_LSM.md`. */
export const USOS_SISTEMA: Record<ClaveSistema, string> = {
  avisoAlcance: 'Aviso de alcance al iniciar (RF-16, RC-01)',
  revisar: 'Encabezado «Revisa tu mensaje» (RF-03)',
  confirmar: 'Control «Confirmar mensaje» (RF-07)',
  descartar: 'Control «Descartar mensaje» (RF-13)',
  noEntendi: 'Control «No entendí» (RF-15)',
  intensidadDolor: 'Escala de intensidad del dolor 1–10 (RF-19)',
  expresionDesconocida: 'Aviso de expresión no reconocida (RF-05)',
  cancelarCaptura: 'Control «Cancelar» de la cámara (RF-17)',
};

/**
 * Claves de icono que la app sabe dibujar (`src/vistas/comunes/IconoEntrada.tsx`).
 * Agregar una clave aquí exige agregar su dibujo allí: el compilador lo comprueba.
 */
export const CLAVES_ICONO = [
  'cabeza', 'estomago', 'garganta', 'fiebre', 'tos', 'mareo', 'nauseas', 'cansancio',
  'si', 'no', 'no-se',
  'calendario', 'senalar', 'alergia', 'medicamento', 'vomito',
  'revisar', 'esperar', 'interprete', 'terminar',
  // Controles y avisos del sistema
  'alcance', 'escala', 'ver-mensaje', 'confirmar', 'descartar', 'no-entendi',
  'desconocida', 'cancelar-captura',
] as const;
export type ClaveIcono = (typeof CLAVES_ICONO)[number];

/** Extensiones admitidas por tipo de recurso. Son formatos que Electron reproduce sin instalar nada. */
export const EXTENSIONES: Record<'video' | 'imagen', readonly string[]> = {
  video: ['.mp4', '.webm'],
  imagen: ['.png', '.jpg', '.jpeg', '.webp'],
};

/** Carpeta, relativa a la página, desde la que la vista carga los archivos (`public/recursos/`). */
export const CARPETA_RECURSOS = 'recursos';

// ------------------------------------------------------------ Resultado

export interface TextoAvisoAlcance {
  titulo: string;
  parrafos: string[];
}

export interface CatalogoCargado {
  catalogo: Catalogo;
  avisoAlcance: TextoAvisoAlcance;
}

export interface ResultadoValidacion {
  /** Impiden usar el catálogo. */
  errores: string[];
  /** No impiden usarlo, pero conviene revisarlos. */
  avisos: string[];
  /** Solo existe si no hay errores. */
  cargado?: CatalogoCargado;
}

// ------------------------------------------------------------ Utilidades

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto => typeof v === 'object' && v !== null && !Array.isArray(v);
const textoValido = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const lista = (claves: Record<string, unknown> | readonly string[]) =>
  (Array.isArray(claves) ? claves : Object.keys(claves)).map((c) => `«${c}»`).join(', ');

const PATRON_ID = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;
const PATRON_ARCHIVO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function fechaValida(texto: string): boolean {
  const m = PATRON_FECHA.exec(texto);
  if (!m) return false;
  const [a, me, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const f = new Date(Date.UTC(a, me - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === me - 1 && f.getUTCDate() === d;
}

export function extension(archivo: string): string {
  const i = archivo.lastIndexOf('.');
  return i < 0 ? '' : archivo.slice(i).toLowerCase();
}

/** Distancia de edición pequeña para sugerir el campo que se quiso escribir. */
function parecido(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  if (x === y) return true;
  const fila = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    let previo = fila[0]!;
    fila[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const actual = fila[j]!;
      fila[j] = Math.min(fila[j]! + 1, fila[j - 1]! + 1, previo + (x[i - 1] === y[j - 1] ? 0 : 1));
      previo = actual;
    }
  }
  return fila[y.length]! <= 2;
}

function camposDesconocidos(obj: Objeto, admitidos: readonly string[], donde: string, errores: string[]) {
  for (const clave of Object.keys(obj)) {
    if (admitidos.includes(clave)) continue;
    const sugerencia = admitidos.find((a) => parecido(a, clave));
    errores.push(
      `${donde}: el campo «${clave}» no existe` +
        (sugerencia ? ` (¿quisiste escribir «${sugerencia}»?).` : `. Campos admitidos: ${lista(admitidos)}.`),
    );
  }
}

// ------------------------------------------------------------ Validación

const CAMPOS_RAIZ = ['version', 'ficticio', 'notas', 'avisoAlcance', 'recursosSistema', 'entradas', 'recursos'] as const;
const CAMPOS_ENTRADA = ['id', 'tipo', 'significado', 'texto', 'termino', 'icono', 'esDolor', 'recursoId', 'nota'] as const;
const CAMPOS_RECURSO = [
  'id', 'tipo', 'estado', 'descripcion', 'archivo', 'procedencia', 'condicionesUso',
  'revisionLinguistica', 'aprobacion', 'estadoReproduccion', 'nota',
] as const;
const TEXTOS_ENTRADA = { significado: 'el significado', texto: 'el texto en español', termino: 'el término de búsqueda' } as const;
const TEXTOS_RECURSO = {
  descripcion: 'la descripción',
  procedencia: 'la procedencia',
  condicionesUso: 'las condiciones de uso',
  revisionLinguistica: 'la revisión lingüística',
  estadoReproduccion: 'el estado de reproducción',
} as const;

function validarId(valor: unknown, donde: string, errores: string[]): string | undefined {
  if (!textoValido(valor)) {
    errores.push(`${donde}: falta el «id» o está vacío.`);
    return undefined;
  }
  if (!PATRON_ID.test(valor)) {
    errores.push(`${donde}: el id «${valor}» solo puede tener letras sin acento, números, guion (-) y guion bajo (_), sin espacios.`);
  }
  return valor;
}

function validarEntrada(e: unknown, i: number, errores: string[]): EntradaCatalogo | undefined {
  if (!esObjeto(e)) {
    errores.push(`entradas[${i}]: debe ser un objeto { ... }.`);
    return undefined;
  }
  const id = validarId(e.id, `entradas[${i}]`, errores);
  const donde = id ? `Entrada ${id}` : `entradas[${i}]`;
  const nErrores = errores.length;
  camposDesconocidos(e, CAMPOS_ENTRADA, donde, errores);

  if (typeof e.tipo !== 'string' || !(e.tipo in TIPOS_ENTRADA)) {
    errores.push(`${donde}: el tipo «${String(e.tipo)}» no existe. Tipos admitidos: ${lista(TIPOS_ENTRADA)}.`);
  }
  for (const [campo, nombre] of Object.entries(TEXTOS_ENTRADA)) {
    if (!textoValido(e[campo])) errores.push(`${donde}: falta ${nombre} («${campo}») o está vacío.`);
  }
  if (!textoValido(e.icono)) {
    errores.push(`${donde}: falta el icono («icono») o está vacío.`);
  } else if (!(CLAVES_ICONO as readonly string[]).includes(e.icono)) {
    errores.push(`${donde}: el icono «${e.icono}» no existe. Iconos disponibles: ${lista(CLAVES_ICONO)}.`);
  }
  if (typeof e.esDolor !== 'boolean') {
    errores.push(`${donde}: «esDolor» debe ser true o false.`);
  } else if (e.esDolor && e.tipo !== 'sintoma') {
    errores.push(`${donde}: solo un síntoma puede tener «esDolor»: true (la intensidad 1–10 es solo para dolor, RF-19).`);
  }
  if (e.recursoId !== null && !textoValido(e.recursoId)) {
    errores.push(`${donde}: «recursoId» debe ser el id de un recurso o null si la entrada no tiene recurso.`);
  }
  if (e.nota !== undefined && typeof e.nota !== 'string') errores.push(`${donde}: «nota» debe ser texto.`);

  if (errores.length > nErrores || !id) return undefined;
  const entrada: EntradaCatalogo = {
    id,
    tipo: e.tipo as TipoEntrada,
    significado: e.significado as string,
    termino: e.termino as string,
    texto: e.texto as string,
    icono: e.icono as string,
  };
  if (e.esDolor === true) entrada.esDolor = true;
  if (typeof e.recursoId === 'string') entrada.recursoId = e.recursoId;
  return entrada;
}

function validarAprobacion(a: unknown, donde: string, errores: string[]): AprobacionRecurso | undefined {
  if (a === null) return undefined;
  if (!esObjeto(a)) {
    errores.push(`${donde}: «aprobacion» debe ser null o { "quien": "...", "fecha": "AAAA-MM-DD" }.`);
    return undefined;
  }
  camposDesconocidos(a, ['quien', 'fecha'], `${donde} (aprobacion)`, errores);
  const n = errores.length;
  if (!textoValido(a.quien)) errores.push(`${donde}: falta quién aprobó la asociación («aprobacion.quien»).`);
  if (!textoValido(a.fecha) || !fechaValida(a.fecha)) {
    errores.push(`${donde}: la fecha de aprobación «${String(a.fecha)}» no es válida; usa AAAA-MM-DD, por ejemplo 2026-11-20.`);
  }
  return errores.length > n ? undefined : { quien: a.quien as string, fecha: a.fecha as string };
}

function validarRecurso(r: unknown, i: number, errores: string[]): Recurso | undefined {
  if (!esObjeto(r)) {
    errores.push(`recursos[${i}]: debe ser un objeto { ... }.`);
    return undefined;
  }
  const id = validarId(r.id, `recursos[${i}]`, errores);
  const donde = id ? `Recurso ${id}` : `recursos[${i}]`;
  const nErrores = errores.length;
  camposDesconocidos(r, CAMPOS_RECURSO, donde, errores);

  const tipoOk = typeof r.tipo === 'string' && r.tipo in TIPOS_RECURSO;
  if (!tipoOk) errores.push(`${donde}: el tipo «${String(r.tipo)}» no existe. Tipos admitidos: ${lista(TIPOS_RECURSO)}.`);
  const estadoOk = typeof r.estado === 'string' && r.estado in ESTADOS_RECURSO;
  if (!estadoOk) errores.push(`${donde}: el estado «${String(r.estado)}» no existe. Estados admitidos: ${lista(ESTADOS_RECURSO)}.`);
  for (const [campo, nombre] of Object.entries(TEXTOS_RECURSO)) {
    if (!textoValido(r[campo])) errores.push(`${donde}: falta ${nombre} («${campo}») o está vacío.`);
  }
  if (r.nota !== undefined && typeof r.nota !== 'string') errores.push(`${donde}: «nota» debe ser texto.`);

  // Archivo: solo un nombre dentro de public/recursos/ (RNF-03: sin internet).
  let archivo: string | undefined;
  if (r.archivo === null) {
    archivo = undefined;
  } else if (!textoValido(r.archivo)) {
    errores.push(`${donde}: «archivo» debe ser el nombre del archivo en public/recursos/ o null si no hay archivo.`);
  } else if (/^[a-z][a-z0-9+.-]*:/i.test(r.archivo) || r.archivo.startsWith('//')) {
    errores.push(`${donde}: el archivo «${r.archivo}» es una dirección de internet. La app debe funcionar sin internet (RNF-03): descarga el archivo a public/recursos/ y escribe solo su nombre.`);
  } else if (!PATRON_ARCHIVO.test(r.archivo)) {
    errores.push(`${donde}: el archivo «${r.archivo}» debe ser solo un nombre (sin carpetas, espacios ni acentos), por ejemplo «PAC-S-01.mp4».`);
  } else {
    archivo = r.archivo;
    if (r.tipo === 'marcador-prueba') {
      errores.push(`${donde}: un «marcador-prueba» no tiene archivo; si hay un archivo, usa el tipo «video» o «imagen».`);
    } else if (r.tipo === 'video' || r.tipo === 'imagen') {
      const ext = extension(archivo);
      if (!EXTENSIONES[r.tipo].includes(ext)) {
        errores.push(`${donde}: un recurso de tipo «${r.tipo}» debe ser ${EXTENSIONES[r.tipo].join(' o ')}; «${archivo}» no lo es.`);
      }
    }
  }
  if (r.archivo === null && (r.tipo === 'video' || r.tipo === 'imagen') && r.estado !== 'validado') {
    errores.push(`${donde}: un recurso de tipo «${r.tipo}» necesita «archivo». Si todavía no hay archivo, usa el tipo «marcador-prueba».`);
  }

  const aprobacion = validarAprobacion(r.aprobacion, donde, errores);
  if (r.estado === 'validado') {
    if (r.tipo === 'marcador-prueba') errores.push(`${donde}: un recurso validado no puede ser «marcador-prueba»; debe ser «video» o «imagen».`);
    if (r.archivo === null) errores.push(`${donde}: un recurso validado necesita su archivo en public/recursos/ («archivo»).`);
    if (r.aprobacion === null) {
      errores.push(`${donde}: un recurso validado necesita la aprobación de la asociación entrada–recurso: «aprobacion»: { "quien": "...", "fecha": "AAAA-MM-DD" } (TECHSTAR_MVP.md §6.2).`);
    }
  }

  if (errores.length > nErrores || !id) return undefined;
  const recurso: Recurso = {
    id,
    tipo: r.tipo as TipoRecurso,
    estado: r.estado as EstadoRecurso,
    descripcion: r.descripcion as string,
    procedencia: r.procedencia as string,
    condicionesUso: r.condicionesUso as string,
    revisionLinguistica: r.revisionLinguistica as string,
    estadoReproduccion: r.estadoReproduccion as string,
  };
  if (archivo) {
    recurso.archivo = archivo;
    recurso.src = `${CARPETA_RECURSOS}/${archivo}`;
  }
  if (aprobacion) recurso.aprobacion = aprobacion;
  return recurso;
}

function repetidos(ids: string[]): string[] {
  const vistos = new Set<string>();
  const dobles = new Set<string>();
  for (const id of ids) (vistos.has(id) ? dobles : vistos).add(id);
  return [...dobles];
}

/**
 * Valida los datos leídos de `catalogo/*.json`. No lanza excepciones: devuelve errores y avisos
 * en español, y el catálogo listo para usar solo si no hay errores.
 */
export function validarCatalogo(datos: unknown): ResultadoValidacion {
  const errores: string[] = [];
  const avisos: string[] = [];
  if (!esObjeto(datos)) return { errores: ['El catálogo debe ser un objeto JSON { ... }.'], avisos };

  camposDesconocidos(datos, CAMPOS_RAIZ, 'Catálogo', errores);
  if (!textoValido(datos.version)) errores.push('Catálogo: falta «version» o está vacía.');
  if (typeof datos.ficticio !== 'boolean') errores.push('Catálogo: «ficticio» debe ser true (contenido de desarrollo) o false (Catálogo V1 aprobado).');
  if (datos.notas !== undefined && !(Array.isArray(datos.notas) && datos.notas.every((n) => typeof n === 'string'))) {
    errores.push('Catálogo: «notas» debe ser una lista de textos.');
  }

  // Aviso de alcance
  let avisoAlcance: TextoAvisoAlcance | undefined;
  const aa = datos.avisoAlcance;
  if (!esObjeto(aa)) {
    errores.push('Catálogo: falta «avisoAlcance» { "titulo": "...", "parrafos": ["...", "...", "..."] }.');
  } else {
    camposDesconocidos(aa, ['titulo', 'parrafos'], 'Aviso de alcance', errores);
    const n = errores.length;
    if (!textoValido(aa.titulo)) errores.push('Aviso de alcance: falta el título o está vacío.');
    if (!Array.isArray(aa.parrafos) || aa.parrafos.length !== 3) {
      errores.push('Aviso de alcance: «parrafos» debe tener exactamente 3 textos (la pantalla del aviso los muestra en ese orden).');
    } else {
      aa.parrafos.forEach((p, i) => {
        if (!textoValido(p)) errores.push(`Aviso de alcance: el párrafo ${i + 1} está vacío.`);
      });
    }
    if (errores.length === n) avisoAlcance = { titulo: aa.titulo as string, parrafos: aa.parrafos as string[] };
  }

  // Entradas y recursos
  const entradasCrudas = datos.entradas;
  const recursosCrudos = datos.recursos;
  if (!Array.isArray(entradasCrudas)) errores.push('Catálogo: «entradas» debe ser una lista [ ... ].');
  if (!Array.isArray(recursosCrudos)) errores.push('Catálogo: «recursos» debe ser una lista [ ... ].');
  const entradasLista: unknown[] = Array.isArray(entradasCrudas) ? entradasCrudas : [];
  const recursosLista: unknown[] = Array.isArray(recursosCrudos) ? recursosCrudos : [];
  if (Array.isArray(entradasCrudas) && entradasCrudas.length === 0) errores.push('Catálogo: no tiene entradas.');

  const entradas = entradasLista.map((e, i) => validarEntrada(e, i, errores));
  const recursos = recursosLista.map((r, i) => validarRecurso(r, i, errores));

  const idsEntrada = entradasLista.map((e) => (esObjeto(e) && typeof e.id === 'string' ? e.id : '')).filter(Boolean);
  const idsRecurso = recursosLista.map((r) => (esObjeto(r) && typeof r.id === 'string' ? r.id : '')).filter(Boolean);
  for (const id of repetidos(idsEntrada)) errores.push(`El id de entrada «${id}» está repetido: cada entrada necesita un id distinto.`);
  for (const id of repetidos(idsRecurso)) errores.push(`El id de recurso «${id}» está repetido: cada recurso necesita un id distinto.`);
  const existentes = new Set(idsRecurso);

  // Asociaciones entrada–recurso
  const usos = new Map<string, string[]>();
  const usar = (recursoId: string, quien: string) => usos.set(recursoId, [...(usos.get(recursoId) ?? []), quien]);
  for (const e of entradasLista) {
    if (!esObjeto(e) || typeof e.recursoId !== 'string' || e.recursoId.trim() === '') continue;
    const quien = `Entrada ${String(e.id)}`;
    if (!existentes.has(e.recursoId)) {
      errores.push(`${quien}: el recurso «${e.recursoId}» no existe en «recursos». No se sustituye por otro: corrige el id o agrega el recurso.`);
    } else {
      usar(e.recursoId, quien);
    }
  }

  // Recursos del sistema
  const sistema: Partial<Record<ClaveSistema, string>> = {};
  const rs = datos.recursosSistema;
  if (!esObjeto(rs)) {
    errores.push('Catálogo: falta «recursosSistema» { "avisoAlcance": "REC-...", ... }.');
  } else {
    for (const [clave, valor] of Object.entries(rs)) {
      if (!(clave in USOS_SISTEMA)) {
        const sugerencia = Object.keys(USOS_SISTEMA).find((c) => parecido(c, clave));
        errores.push(
          `Recursos del sistema: la clave «${clave}» no existe` +
            (sugerencia ? ` (¿quisiste escribir «${sugerencia}»?).` : `. Claves admitidas: ${lista(USOS_SISTEMA)}.`),
        );
        continue;
      }
      if (valor === null) continue;
      if (!textoValido(valor)) {
        errores.push(`Recursos del sistema: «${clave}» debe ser el id de un recurso o null.`);
      } else if (!existentes.has(valor)) {
        errores.push(`Recursos del sistema: «${clave}» apunta al recurso «${valor}», que no existe en «recursos».`);
      } else {
        sistema[clave as ClaveSistema] = valor;
        usar(valor, `sistema «${clave}»`);
      }
    }
  }

  // Avisos (no bloquean)
  for (const r of recursos) {
    if (!r) continue;
    const quienes = usos.get(r.id) ?? [];
    if (quienes.length === 0) avisos.push(`Recurso ${r.id}: ninguna entrada ni control del sistema lo usa.`);
    if (quienes.length > 1) {
      avisos.push(`Recurso ${r.id}: lo comparten ${quienes.join(', ')}. Comprueba que el recurso corresponde al mensaje completo de cada una (§6.2).`);
    }
  }
  const porArchivo = new Map<string, string[]>();
  for (const r of recursos) if (r?.archivo) porArchivo.set(r.archivo.toLowerCase(), [...(porArchivo.get(r.archivo.toLowerCase()) ?? []), r.id]);
  for (const [archivo, ids] of porArchivo) {
    if (ids.length > 1) avisos.push(`El archivo «${archivo}» lo usan varios recursos (${ids.join(', ')}).`);
  }
  if (datos.ficticio === false && recursos.some((r) => r?.estado === 'prueba')) {
    avisos.push('El catálogo no es ficticio pero tiene recursos de prueba: esas entradas quedarán bloqueadas en el flujo de producto.');
  }

  if (errores.length > 0 || !avisoAlcance) return { errores, avisos };
  return {
    errores,
    avisos,
    cargado: {
      avisoAlcance,
      catalogo: {
        version: datos.version as string,
        ficticio: datos.ficticio as boolean,
        entradas: entradas as EntradaCatalogo[],
        recursos: recursos as Recurso[],
        recursosSistema: sistema,
      },
    },
  };
}

// ------------------------------------------------------------ Archivos (RNF-03)

/** Firma de los primeros bytes de cada formato admitido. */
function formatoReal(bytes: Uint8Array): string | undefined {
  const ascii = (desde: number, hasta: number) => String.fromCharCode(...bytes.subarray(desde, hasta));
  if (bytes.length >= 12 && ascii(4, 8) === 'ftyp') return '.mp4';
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return '.webm';
  if (bytes.length >= 8 && bytes[0] === 0x89 && ascii(1, 4) === 'PNG') return '.png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return '.jpg';
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return '.webp';
  return undefined;
}

const MISMO_FORMATO: Record<string, string> = { '.jpeg': '.jpg' };

/**
 * Comprueba que cada archivo declarado existe en `public/recursos/`, no está vacío y su contenido
 * corresponde a su formato. `leer` devuelve los bytes (basta el inicio) o null si no existe.
 * Si un archivo falta o está dañado se informa; nunca se usa otro en su lugar.
 */
export function comprobarArchivos(catalogo: Catalogo, leer: (archivo: string) => Uint8Array | null): string[] {
  const errores: string[] = [];
  for (const r of catalogo.recursos) {
    if (!r.archivo) continue;
    const ruta = `public/${CARPETA_RECURSOS}/${r.archivo}`;
    const bytes = leer(r.archivo);
    const estado = r.estado === 'validado' ? 'validado' : 'de prueba';
    if (bytes === null) {
      errores.push(`Recurso ${r.id} (${estado}): no se encontró el archivo ${ruta}. Cópialo a esa carpeta con ese nombre exacto (mayúsculas incluidas).`);
      continue;
    }
    if (bytes.length === 0) {
      errores.push(`Recurso ${r.id} (${estado}): el archivo ${ruta} está vacío (0 bytes); vuelve a copiarlo.`);
      continue;
    }
    const esperado = MISMO_FORMATO[extension(r.archivo)] ?? extension(r.archivo);
    const real = formatoReal(bytes);
    if (real !== esperado) {
      errores.push(
        `Recurso ${r.id} (${estado}): el archivo ${ruta} está dañado o no es ${esperado.slice(1).toUpperCase()}` +
          (real ? ` (su contenido es ${real.slice(1).toUpperCase()}; corrige la extensión o conviértelo).` : '; vuelve a exportarlo o copiarlo.'),
      );
    }
  }
  return errores;
}

/** Junta errores para mostrarlos en una sola línea de registro o en una excepción. */
export function describirErrores(errores: string[]): string {
  return `El catálogo tiene ${errores.length} error(es):\n- ${errores.join('\n- ')}`;
}
