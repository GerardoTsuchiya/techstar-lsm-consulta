import type { Catalogo, EntradaCatalogo, Recurso } from '../nucleo/tipos';

/**
 * CATÁLOGO FICTICIO DE DESARROLLO — NO es el Catálogo V1.
 *
 * - El contenido del Catálogo V1 sigue pendiente de definir y aprobar (SRS 1.6 §1.3).
 * - Ningún recurso aquí está validado en LSM. Los recursos `REC-PRUEBA-*` son
 *   marcadores visuales para probar la interfaz: no acreditan comprensión en LSM.
 * - Dos entradas no tienen recurso a propósito (PAC-S-06 y MED-P-06) para probar el bloqueo.
 * - Los iconos son apoyos visuales provisionales, no validados.
 * - El grupo «Respuestas breves» del paciente es una propuesta: falta decidir qué
 *   puede responder el paciente a cada pregunta (TECHSTAR_MVP.md §6.3).
 *
 * El inventario y los pendientes de validación están en Docs/RECURSOS_LSM.md.
 */

const recursoPrueba = (id: string, descripcion: string): Recurso => ({
  id: `REC-PRUEBA-${id}`,
  tipo: 'marcador-prueba',
  estado: 'prueba',
  descripcion,
  procedencia: 'Marcador generado por la app (sin video).',
  condicionesUso: 'Solo desarrollo. No usar en demostraciones como LSM.',
  revisionLinguistica: 'Pendiente: no existe recurso en LSM.',
});

const entradas: EntradaCatalogo[] = [
  // --- Síntomas del paciente (RF-19)
  { id: 'PAC-S-01', tipo: 'sintoma', termino: 'dolor de cabeza', texto: 'Tengo dolor de cabeza.', icono: 'cabeza', esDolor: true, recursoId: 'REC-PRUEBA-PAC-S-01' },
  { id: 'PAC-S-02', tipo: 'sintoma', termino: 'dolor de estómago', texto: 'Tengo dolor de estómago.', icono: 'estomago', esDolor: true, recursoId: 'REC-PRUEBA-PAC-S-02' },
  { id: 'PAC-S-03', tipo: 'sintoma', termino: 'dolor de garganta', texto: 'Me duele la garganta.', icono: 'garganta', esDolor: true, recursoId: 'REC-PRUEBA-PAC-S-03' },
  { id: 'PAC-S-04', tipo: 'sintoma', termino: 'fiebre', texto: 'Tengo fiebre.', icono: 'fiebre', recursoId: 'REC-PRUEBA-PAC-S-04' },
  { id: 'PAC-S-05', tipo: 'sintoma', termino: 'tos', texto: 'Tengo tos.', icono: 'tos', recursoId: 'REC-PRUEBA-PAC-S-05' },
  // Sin recurso a propósito: prueba el bloqueo en la revisión del paciente.
  { id: 'PAC-S-06', tipo: 'sintoma', termino: 'mareo', texto: 'Me siento mareado o mareada.', icono: 'mareo' },
  { id: 'PAC-S-07', tipo: 'sintoma', termino: 'náuseas', texto: 'Tengo náuseas.', icono: 'nauseas', recursoId: 'REC-PRUEBA-PAC-S-07' },
  { id: 'PAC-S-08', tipo: 'sintoma', termino: 'cansancio', texto: 'Me siento muy cansado o cansada.', icono: 'cansancio', recursoId: 'REC-PRUEBA-PAC-S-08' },

  // --- Respuestas breves del paciente (propuesta pendiente, §6.3)
  { id: 'PAC-R-01', tipo: 'respuesta-paciente', termino: 'sí', texto: 'Sí.', icono: 'si', recursoId: 'REC-PRUEBA-PAC-R-01' },
  { id: 'PAC-R-02', tipo: 'respuesta-paciente', termino: 'no', texto: 'No.', icono: 'no', recursoId: 'REC-PRUEBA-PAC-R-02' },
  { id: 'PAC-R-03', tipo: 'respuesta-paciente', termino: 'no sé', texto: 'No lo sé.', icono: 'no-se', recursoId: 'REC-PRUEBA-PAC-R-03' },

  // --- Preguntas del médico (RF-14, RF-02)
  { id: 'MED-P-01', tipo: 'pregunta-medico', termino: 'desde cuándo', texto: '¿Desde cuándo tiene este síntoma?', icono: 'calendario', recursoId: 'REC-PRUEBA-MED-P-01' },
  { id: 'MED-P-02', tipo: 'pregunta-medico', termino: 'dónde duele', texto: '¿Puede señalar dónde le duele?', icono: 'senalar', recursoId: 'REC-PRUEBA-MED-P-02' },
  { id: 'MED-P-03', tipo: 'pregunta-medico', termino: 'alergia a medicamento', texto: '¿Tiene alergia a algún medicamento?', icono: 'alergia', recursoId: 'REC-PRUEBA-MED-P-03' },
  { id: 'MED-P-04', tipo: 'pregunta-medico', termino: 'toma medicamento', texto: '¿Está tomando algún medicamento?', icono: 'medicamento', recursoId: 'REC-PRUEBA-MED-P-04' },
  { id: 'MED-P-05', tipo: 'pregunta-medico', termino: 'fiebre', texto: '¿Ha tenido fiebre?', icono: 'fiebre', recursoId: 'REC-PRUEBA-MED-P-05' },
  // Sin recurso a propósito: prueba el bloqueo de envío del médico.
  { id: 'MED-P-06', tipo: 'pregunta-medico', termino: 'vómito', texto: '¿Ha tenido vómito?', icono: 'vomito' },

  // --- Respuestas e indicaciones del médico
  { id: 'MED-R-01', tipo: 'respuesta-medico', termino: 'revisar', texto: 'Ahora voy a revisarle.', icono: 'revisar', recursoId: 'REC-PRUEBA-MED-R-01' },
  { id: 'MED-R-02', tipo: 'respuesta-medico', termino: 'esperar', texto: 'Espere un momento, por favor.', icono: 'esperar', recursoId: 'REC-PRUEBA-MED-R-02' },
  { id: 'MED-R-03', tipo: 'respuesta-medico', termino: 'intérprete', texto: 'Para continuar se necesita un intérprete de LSM.', icono: 'interprete', recursoId: 'REC-PRUEBA-MED-R-03' },
  { id: 'MED-R-04', tipo: 'respuesta-medico', termino: 'terminar consulta', texto: 'Hemos terminado la consulta.', icono: 'terminar', recursoId: 'REC-PRUEBA-MED-R-04' },
];

const recursosEntradas = entradas
  .filter((e) => e.recursoId)
  .map((e) => recursoPrueba(e.id, `Seña o explicación en LSM de: «${e.texto}»`));

const recursosSistema: Recurso[] = [
  recursoPrueba('SIS-ALCANCE', 'Aviso de alcance en LSM (RF-16).'),
  recursoPrueba('SIS-REVISAR', 'Explicación en LSM de «revisa tu mensaje».'),
  recursoPrueba('SIS-CONFIRMAR', 'Control «Confirmar mensaje» en LSM (RF-07).'),
  recursoPrueba('SIS-DESCARTAR', 'Control «Descartar mensaje» en LSM (RF-13).'),
  recursoPrueba('SIS-NO-ENTENDI', 'Control «No entendí» en LSM (RF-15).'),
  recursoPrueba('SIS-INTENSIDAD', 'Escala de intensidad del dolor 1 a 10 en LSM (RF-19).'),
  recursoPrueba('SIS-DESCONOCIDA', 'Aviso de expresión no reconocida en LSM (RF-05).'),
];

export const catalogoFicticio: Catalogo = {
  version: 'ficticio-dev-0.1',
  ficticio: true,
  entradas,
  recursos: [...recursosEntradas, ...recursosSistema],
  recursosSistema: {
    avisoAlcance: 'REC-PRUEBA-SIS-ALCANCE',
    revisar: 'REC-PRUEBA-SIS-REVISAR',
    confirmar: 'REC-PRUEBA-SIS-CONFIRMAR',
    descartar: 'REC-PRUEBA-SIS-DESCARTAR',
    noEntendi: 'REC-PRUEBA-SIS-NO-ENTENDI',
    intensidadDolor: 'REC-PRUEBA-SIS-INTENSIDAD',
    expresionDesconocida: 'REC-PRUEBA-SIS-DESCONOCIDA',
    // cancelarCaptura: sin recurso (etapa C).
  },
};

/** Texto del aviso de alcance (RF-16, RC-01). Pendiente de validación. */
export const TEXTO_AVISO_ALCANCE = {
  titulo: 'Antes de empezar',
  parrafos: [
    'Esta aplicación es un apoyo limitado para consultas médicas generales.',
    'Solo incluye las frases del catálogo. No traduce conversaciones libres y no sustituye a un intérprete de LSM.',
    'En emergencias, cirugías, especialidades o situaciones complejas, se necesita un intérprete.',
  ],
};
