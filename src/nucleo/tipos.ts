/**
 * Tipos compartidos por las reglas de sesión, el transporte y las vistas.
 * No dependen de React ni del medio de comunicación.
 */

export type Rol = 'paciente' | 'medico';

// ---------------------------------------------------------------- Catálogo

/**
 * Estado de un recurso en LSM.
 * - `validado`: asociación entrada–recurso aprobada (RI-01). Hoy no existe ninguno.
 * - `prueba`: archivo o marcador para probar la interfaz. NO acredita comprensión en LSM.
 * Una entrada sin `recursoId` no tiene recurso.
 */
export type EstadoRecurso = 'validado' | 'prueba';

/** `marcador-prueba`: la app dibuja un marcador; no hay archivo. */
export type TipoRecurso = 'video' | 'imagen' | 'marcador-prueba';

/** Quién aprobó la asociación entrada–recurso y cuándo (TECHSTAR_MVP.md §6.2). */
export interface AprobacionRecurso {
  quien: string;
  /** Fecha AAAA-MM-DD. */
  fecha: string;
}

/**
 * Recurso en LSM. Los datos vienen de `catalogo/*.json` y pasan por `validarCatalogo`.
 * Un recurso `validado` siempre tiene `archivo`, `src` y `aprobacion`.
 */
export interface Recurso {
  id: string;
  tipo: TipoRecurso;
  estado: EstadoRecurso;
  /** Qué debería mostrar el recurso (no es el recurso). */
  descripcion: string;
  /** Nombre del archivo dentro de `public/recursos/` (RNF-03: instalado, sin internet). */
  archivo?: string;
  /** Ruta relativa con la que la vista carga el archivo (`recursos/<archivo>`). */
  src?: string;
  procedencia: string;
  condicionesUso: string;
  revisionLinguistica: string;
  aprobacion?: AprobacionRecurso;
  /** Dónde se comprobó que se reproduce y con qué resultado. */
  estadoReproduccion: string;
}

export type TipoEntrada =
  | 'sintoma'
  | 'respuesta-paciente'
  | 'pregunta-medico'
  | 'respuesta-medico';

export interface EntradaCatalogo {
  id: string;
  tipo: TipoEntrada;
  /** Qué quiere comunicar la entrada, para revisar que el recurso conserva el sentido. */
  significado: string;
  /** Término de búsqueda en español (RF-14). */
  termino: string;
  /** Mensaje en español que se entrega. */
  texto: string;
  /** Clave del icono de apoyo visual provisional (no validado). La vista decide cómo dibujarlo. */
  icono: string;
  /** Solo los síntomas de dolor admiten intensidad 1–10 (RF-19). */
  esDolor?: boolean;
  /** Asociación entrada–recurso (RI-01). Ausente = sin recurso. */
  recursoId?: string;
}

/** Recursos de los controles y avisos del sistema (TECHSTAR_MVP.md §6.1). */
export type ClaveSistema =
  | 'avisoAlcance'
  | 'revisar'
  | 'confirmar'
  | 'descartar'
  | 'noEntendi'
  | 'intensidadDolor'
  | 'expresionDesconocida'
  | 'cancelarCaptura';

export interface Catalogo {
  version: string;
  /** true mientras el contenido sea de desarrollo y no el Catálogo V1 aprobado. */
  ficticio: boolean;
  entradas: EntradaCatalogo[];
  recursos: Recurso[];
  recursosSistema: Partial<Record<ClaveSistema, string>>;
}

/**
 * Política de recursos.
 * - `producto`: solo se envían entradas con recurso validado (flujo de producto).
 * - `desarrollo`: además se admiten recursos de prueba, siempre marcados en pantalla.
 * En ambas, una entrada sin recurso queda bloqueada.
 */
export type PoliticaRecursos = 'producto' | 'desarrollo';

export type Disponibilidad =
  | { estado: 'validado'; recurso: Recurso }
  | { estado: 'prueba'; recurso: Recurso }
  | { estado: 'bloqueado'; motivo: 'sin-recurso' | 'recurso-no-validado'; recurso?: Recurso };

// ---------------------------------------------------------------- Mensajes

export interface Seleccion {
  entradaId: string;
  /** Entero 1–10. Ausente = sin valor (RF-19). */
  intensidad?: number;
}

export interface ItemMensajePaciente {
  entradaId: string;
  texto: string;
  intensidad?: number;
}

/** Catálogo (RF-19) o cámara con reconocimiento (RF-01). */
export type ViaPaciente = 'catalogo' | 'camara';

export interface MensajePaciente {
  id: string;
  sesionId: string;
  origen: 'paciente';
  via: ViaPaciente;
  items: ItemMensajePaciente[];
  confirmadoEn: number;
  /** Momento en que la vista del médico lo mostró (acuse). */
  recibidoEn?: number;
}

export interface MensajeMedico {
  id: string;
  sesionId: string;
  origen: 'medico';
  entradaId: string;
  texto: string;
  recursoId: string;
  enviadoEn: number;
  /** Momento en que la vista del paciente lo mostró (acuse). */
  recibidoEn?: number;
}

export type Mensaje = MensajePaciente | MensajeMedico;

export interface SolicitudAclaracion {
  id: string;
  sesionId: string;
  /** Mensaje del médico que la persona no entendió (RF-15). */
  mensajeId: string;
  creadaEn: number;
  /** Mensaje del médico enviado después del aviso. */
  atendidaCon?: string;
}

export interface InstantaneaSesion {
  sesionId: string;
  catalogoVersion: string;
  politica: PoliticaRecursos;
  mensajes: Mensaje[];
  aclaraciones: SolicitudAclaracion[];
}

// ---------------------------------------------------------------- Protocolo

export type Comando =
  | { tipo: 'iniciarSesion' }
  | {
      tipo: 'confirmarMensajePaciente';
      sesionId: string;
      /** Identificador del envío: un doble toque o reintento usa el mismo. */
      envioId: string;
      /** Vía por la que se compuso el mensaje. Las dos pasan por la misma revisión y las mismas reglas. */
      via: ViaPaciente;
      selecciones: Seleccion[];
      /** Textos exactamente como se mostraron en la revisión. */
      textosRevisados: string[];
    }
  | { tipo: 'enviarEntradaMedico'; sesionId: string; envioId: string; entradaId: string }
  | { tipo: 'solicitarAclaracion'; sesionId: string; envioId: string; mensajeId: string }
  | { tipo: 'acuseRecibo'; sesionId: string; mensajeId: string }
  | { tipo: 'cerrarSesion'; sesionId: string };

export type CodigoError =
  | 'sin-sesion'
  | 'sesion-abierta'
  | 'sesion-incorrecta'
  | 'sesion-cerrada'
  | 'rol-no-autorizado'
  | 'seleccion-vacia'
  | 'seleccion-repetida'
  | 'entrada-desconocida'
  | 'tipo-no-permitido'
  | 'recurso-no-disponible'
  | 'intensidad-invalida'
  | 'contenido-no-coincide'
  | 'mensaje-no-encontrado'
  | 'sin-conexion'
  /** Llegó por la red un comando con forma inválida (etapa B). */
  | 'comando-invalido';

export type Resultado =
  | { ok: true; id?: string; duplicado?: boolean }
  | { ok: false; error: CodigoError };

export type Evento =
  | { tipo: 'estado'; instantanea: InstantaneaSesion | null }
  | { tipo: 'sesionCerrada'; sesionId: string };
