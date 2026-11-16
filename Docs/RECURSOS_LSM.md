# Inventario de recursos en LSM · pendientes de validación

<!-- Documento GENERADO desde catalogo/ficticio-dev.json con `npm run docs-recursos`. No editar a mano: los cambios se pierden. -->

Registro exigido por `TECHSTAR_MVP.md` §6.1. Catálogo: `ficticio-dev-0.1` ([catalogo/ficticio-dev.json](../catalogo/ficticio-dev.json)).
Para agregar o cambiar entradas y recursos, ver la sección «Editar el catálogo» del [README](../README.md).

## Estado general

- Entradas: **21** · con recurso validado: **0** · con recurso de prueba: **19** · sin recurso: **2**.
- **Ningún recurso está validado.** En el **flujo de producto** (`recursos=producto`) todas las entradas quedan bloqueadas.
- El contenido del catálogo es **ficticio**. El Catálogo V1 sigue pendiente de definir y aprobar (SRS 1.6 §1.3).
- Los recursos de prueba se muestran como marcadores (silueta neutra, icono y etiqueta ámbar «Prueba · no es LSM»). Solo prueban la interfaz y **no acreditan comprensión en LSM**.
- Los iconos de apoyo visual (Lucide, licencia ISC; el del estómago es propio) son provisionales y no están validados con personas Sordas. Están en `src/vistas/comunes/IconoEntrada.tsx`.
- Fuente candidata del plan original: Iztacala Enseña. Antes de usar un recurso, falta comprobar que corresponde al mensaje completo, que funciona en la app, que el uso está permitido, y registrar la aprobación entrada–recurso.
- Las entradas con contenido clínico (síntomas, alergias, medicamentos) también requieren revisión del personal médico.

Valores comunes a todos los recursos:

| Campo | Valor |
|---|---|
| Procedencia | Marcador generado por la app (sin video). |
| Condiciones de uso | Solo desarrollo. No usar en demostraciones como LSM. |
| Revisión lingüística | Pendiente: no existe recurso en LSM. |
| Estado de reproducción | Marcador visible en laptops (navegador). Sin archivo de video que reproducir. |

## Entradas del paciente

| ID | Tipo | Significado | Texto en español | Término de búsqueda | Icono | Recurso asociado | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| PAC-S-01 | síntoma (dolor) | El paciente informa que le duele la cabeza. | Tengo dolor de cabeza. | dolor de cabeza | cabeza | REC-PRUEBA-PAC-S-01 | prueba |  |
| PAC-S-02 | síntoma (dolor) | El paciente informa que le duele el estómago. | Tengo dolor de estómago. | dolor de estómago | estomago | REC-PRUEBA-PAC-S-02 | prueba |  |
| PAC-S-03 | síntoma (dolor) | El paciente informa que le duele la garganta. | Me duele la garganta. | dolor de garganta | garganta | REC-PRUEBA-PAC-S-03 | prueba |  |
| PAC-S-04 | síntoma | El paciente informa que tiene fiebre (temperatura alta). | Tengo fiebre. | fiebre | fiebre | REC-PRUEBA-PAC-S-04 | prueba |  |
| PAC-S-05 | síntoma | El paciente informa que tiene tos. | Tengo tos. | tos | tos | REC-PRUEBA-PAC-S-05 | prueba |  |
| PAC-S-06 | síntoma | El paciente informa que se siente mareado. | Me siento mareado o mareada. | mareo | mareo | **ninguno** | sin recurso | Sin recurso a propósito: prueba el bloqueo en la revisión del paciente. |
| PAC-S-07 | síntoma | El paciente informa que tiene ganas de vomitar. | Tengo náuseas. | náuseas | nauseas | REC-PRUEBA-PAC-S-07 | prueba |  |
| PAC-S-08 | síntoma | El paciente informa que se siente muy cansado. | Me siento muy cansado o cansada. | cansancio | cansancio | REC-PRUEBA-PAC-S-08 | prueba |  |
| PAC-R-01 | respuesta breve | El paciente responde afirmativamente a la pregunta anterior del médico. | Sí. | sí | si | REC-PRUEBA-PAC-R-01 | prueba | Respuesta breve propuesta: falta decidir qué puede responder el paciente (TECHSTAR_MVP.md §6.3). |
| PAC-R-02 | respuesta breve | El paciente responde negativamente a la pregunta anterior del médico. | No. | no | no | REC-PRUEBA-PAC-R-02 | prueba | Respuesta breve propuesta (§6.3). |
| PAC-R-03 | respuesta breve | El paciente indica que no sabe la respuesta a la pregunta anterior del médico. | No lo sé. | no sé | no-se | REC-PRUEBA-PAC-R-03 | prueba | Respuesta breve propuesta (§6.3). |

## Entradas del médico

| ID | Tipo | Significado | Texto en español | Término de búsqueda | Icono | Recurso asociado | Estado | Nota |
|---|---|---|---|---|---|---|---|---|
| MED-P-01 | pregunta | El médico pregunta cuánto tiempo hace que empezó el síntoma. | ¿Desde cuándo tiene este síntoma? | desde cuándo | calendario | REC-PRUEBA-MED-P-01 | prueba |  |
| MED-P-02 | pregunta | El médico pide al paciente que señale con la mano el lugar del dolor. | ¿Puede señalar dónde le duele? | dónde duele | senalar | REC-PRUEBA-MED-P-02 | prueba |  |
| MED-P-03 | pregunta | El médico pregunta si el paciente es alérgico a algún medicamento. | ¿Tiene alergia a algún medicamento? | alergia a medicamento | alergia | REC-PRUEBA-MED-P-03 | prueba |  |
| MED-P-04 | pregunta | El médico pregunta si el paciente toma actualmente algún medicamento. | ¿Está tomando algún medicamento? | toma medicamento | medicamento | REC-PRUEBA-MED-P-04 | prueba |  |
| MED-P-05 | pregunta | El médico pregunta si el paciente ha tenido fiebre. | ¿Ha tenido fiebre? | fiebre | fiebre | REC-PRUEBA-MED-P-05 | prueba |  |
| MED-P-06 | pregunta | El médico pregunta si el paciente ha vomitado. | ¿Ha tenido vómito? | vómito | vomito | **ninguno** | sin recurso | Sin recurso a propósito: prueba el bloqueo de envío del médico. |
| MED-R-01 | respuesta | El médico avisa que va a hacer la exploración física. | Ahora voy a revisarle. | revisar | revisar | REC-PRUEBA-MED-R-01 | prueba |  |
| MED-R-02 | respuesta | El médico pide al paciente que espere un momento. | Espere un momento, por favor. | esperar | esperar | REC-PRUEBA-MED-R-02 | prueba |  |
| MED-R-03 | respuesta | El médico indica que la consulta necesita un intérprete de LSM para continuar. | Para continuar se necesita un intérprete de LSM. | intérprete | interprete | REC-PRUEBA-MED-R-03 | prueba |  |
| MED-R-04 | respuesta | El médico indica que la consulta terminó. | Hemos terminado la consulta. | terminar consulta | terminar | REC-PRUEBA-MED-R-04 | prueba |  |

## Recursos de controles y avisos del sistema

| Clave | Uso | Recurso | Estado |
|---|---|---|---|
| avisoAlcance | Aviso de alcance al iniciar (RF-16, RC-01) | REC-PRUEBA-SIS-ALCANCE | prueba |
| revisar | Encabezado «Revisa tu mensaje» (RF-03) | REC-PRUEBA-SIS-REVISAR | prueba |
| confirmar | Control «Confirmar mensaje» (RF-07) | REC-PRUEBA-SIS-CONFIRMAR | prueba |
| descartar | Control «Descartar mensaje» (RF-13) | REC-PRUEBA-SIS-DESCARTAR | prueba |
| noEntendi | Control «No entendí» (RF-15) | REC-PRUEBA-SIS-NO-ENTENDI | prueba |
| intensidadDolor | Escala de intensidad del dolor 1–10 (RF-19) | REC-PRUEBA-SIS-INTENSIDAD | prueba |
| expresionDesconocida | Aviso de expresión no reconocida (RF-05) | REC-PRUEBA-SIS-DESCONOCIDA | prueba |
| cancelarCaptura | Control «Cancelar» de la cámara (RF-17) | REC-PRUEBA-SIS-CANCELAR | prueba |

## Detalle de recursos

| ID | Tipo | Estado | Qué debe mostrar | Archivo | Aprobación (quién, fecha) |
|---|---|---|---|---|---|
| REC-PRUEBA-PAC-S-01 | marcador-prueba | prueba | Seña o explicación en LSM de: «Tengo dolor de cabeza.» | — | — |
| REC-PRUEBA-PAC-S-02 | marcador-prueba | prueba | Seña o explicación en LSM de: «Tengo dolor de estómago.» | — | — |
| REC-PRUEBA-PAC-S-03 | marcador-prueba | prueba | Seña o explicación en LSM de: «Me duele la garganta.» | — | — |
| REC-PRUEBA-PAC-S-04 | marcador-prueba | prueba | Seña o explicación en LSM de: «Tengo fiebre.» | — | — |
| REC-PRUEBA-PAC-S-05 | marcador-prueba | prueba | Seña o explicación en LSM de: «Tengo tos.» | — | — |
| REC-PRUEBA-PAC-S-07 | marcador-prueba | prueba | Seña o explicación en LSM de: «Tengo náuseas.» | — | — |
| REC-PRUEBA-PAC-S-08 | marcador-prueba | prueba | Seña o explicación en LSM de: «Me siento muy cansado o cansada.» | — | — |
| REC-PRUEBA-PAC-R-01 | marcador-prueba | prueba | Seña o explicación en LSM de: «Sí.» | — | — |
| REC-PRUEBA-PAC-R-02 | marcador-prueba | prueba | Seña o explicación en LSM de: «No.» | — | — |
| REC-PRUEBA-PAC-R-03 | marcador-prueba | prueba | Seña o explicación en LSM de: «No lo sé.» | — | — |
| REC-PRUEBA-MED-P-01 | marcador-prueba | prueba | Seña o explicación en LSM de: «¿Desde cuándo tiene este síntoma?» | — | — |
| REC-PRUEBA-MED-P-02 | marcador-prueba | prueba | Seña o explicación en LSM de: «¿Puede señalar dónde le duele?» | — | — |
| REC-PRUEBA-MED-P-03 | marcador-prueba | prueba | Seña o explicación en LSM de: «¿Tiene alergia a algún medicamento?» | — | — |
| REC-PRUEBA-MED-P-04 | marcador-prueba | prueba | Seña o explicación en LSM de: «¿Está tomando algún medicamento?» | — | — |
| REC-PRUEBA-MED-P-05 | marcador-prueba | prueba | Seña o explicación en LSM de: «¿Ha tenido fiebre?» | — | — |
| REC-PRUEBA-MED-R-01 | marcador-prueba | prueba | Seña o explicación en LSM de: «Ahora voy a revisarle.» | — | — |
| REC-PRUEBA-MED-R-02 | marcador-prueba | prueba | Seña o explicación en LSM de: «Espere un momento, por favor.» | — | — |
| REC-PRUEBA-MED-R-03 | marcador-prueba | prueba | Seña o explicación en LSM de: «Para continuar se necesita un intérprete de LSM.» | — | — |
| REC-PRUEBA-MED-R-04 | marcador-prueba | prueba | Seña o explicación en LSM de: «Hemos terminado la consulta.» | — | — |
| REC-PRUEBA-SIS-ALCANCE | marcador-prueba | prueba | Aviso de alcance en LSM (RF-16). | — | — |
| REC-PRUEBA-SIS-REVISAR | marcador-prueba | prueba | Explicación en LSM de «revisa tu mensaje». | — | — |
| REC-PRUEBA-SIS-CONFIRMAR | marcador-prueba | prueba | Control «Confirmar mensaje» en LSM (RF-07). | — | — |
| REC-PRUEBA-SIS-DESCARTAR | marcador-prueba | prueba | Control «Descartar mensaje» en LSM (RF-13). | — | — |
| REC-PRUEBA-SIS-NO-ENTENDI | marcador-prueba | prueba | Control «No entendí» en LSM (RF-15). | — | — |
| REC-PRUEBA-SIS-INTENSIDAD | marcador-prueba | prueba | Escala de intensidad del dolor 1 a 10 en LSM (RF-19). | — | — |
| REC-PRUEBA-SIS-DESCONOCIDA | marcador-prueba | prueba | Aviso de expresión no reconocida en LSM (RF-05). | — | — |
| REC-PRUEBA-SIS-CANCELAR | marcador-prueba | prueba | Control «Cancelar» de la captura en LSM (RF-17). | — | — |
