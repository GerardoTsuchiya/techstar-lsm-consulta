# Inventario de recursos en LSM · pendientes de validación

Registro exigido por `TECHSTAR_MVP.md` §6.1. Fecha: 07/11/2026. Catálogo: `ficticio-dev-0.1`
([src/catalogo/catalogoFicticio.ts](../src/catalogo/catalogoFicticio.ts)).

## Estado general

- **Ningún recurso está validado.** Todos los recursos `REC-PRUEBA-*` son marcadores visuales generados por la app
  (silueta neutra de intérprete, icono de la entrada y etiqueta ámbar «Prueba · no es LSM»). Solo prueban la interfaz
  y **no acreditan comprensión en LSM**.
- El contenido del catálogo es **ficticio**. El Catálogo V1 sigue pendiente de definir y aprobar (SRS 1.6 §1.3).
- Los iconos de apoyo visual (Lucide, licencia ISC; el del estómago es propio) son provisionales y no están validados
  con personas Sordas. Están en `src/vistas/comunes/IconoEntrada.tsx`.
- En el **flujo de producto** (`recursos=producto`) todas las entradas quedan bloqueadas hasta que exista al menos un
  recurso con estado `validado`.
- Fuente candidata del plan original: Iztacala Enseña. Antes de usar un recurso, falta comprobar que corresponde al
  mensaje completo, que funciona en la app, que el uso está permitido, y registrar la aprobación entrada–recurso.

Valores comunes de las columnas para todos los recursos de prueba:

| Campo | Valor actual |
|---|---|
| Procedencia | Marcador generado por la app (sin video) |
| Condiciones de uso | Solo desarrollo. No usar en demostraciones como LSM |
| Revisión lingüística | Pendiente: no existe recurso en LSM |
| Estado de reproducción | Marcador visible en laptops (navegador). Sin archivo de video que reproducir |

## Entradas del paciente

| ID | Tipo | Texto en español | Recurso asociado | Estado | Pendiente |
|---|---|---|---|---|---|
| PAC-S-01 | síntoma (dolor) | Tengo dolor de cabeza. | REC-PRUEBA-PAC-S-01 | prueba | Recurso LSM, revisión lingüística y clínica |
| PAC-S-02 | síntoma (dolor) | Tengo dolor de estómago. | REC-PRUEBA-PAC-S-02 | prueba | Igual |
| PAC-S-03 | síntoma (dolor) | Me duele la garganta. | REC-PRUEBA-PAC-S-03 | prueba | Igual |
| PAC-S-04 | síntoma | Tengo fiebre. | REC-PRUEBA-PAC-S-04 | prueba | Igual |
| PAC-S-05 | síntoma | Tengo tos. | REC-PRUEBA-PAC-S-05 | prueba | Igual |
| PAC-S-06 | síntoma | Me siento mareado o mareada. | **ninguno** (a propósito) | sin recurso | Se usa para probar el bloqueo |
| PAC-S-07 | síntoma | Tengo náuseas. | REC-PRUEBA-PAC-S-07 | prueba | Recurso LSM, revisión |
| PAC-S-08 | síntoma | Me siento muy cansado o cansada. | REC-PRUEBA-PAC-S-08 | prueba | Igual |
| PAC-R-01 | respuesta breve* | Sí. | REC-PRUEBA-PAC-R-01 | prueba | *Decidir si el paciente tendrá respuestas breves (§6.3) |
| PAC-R-02 | respuesta breve* | No. | REC-PRUEBA-PAC-R-02 | prueba | Igual |
| PAC-R-03 | respuesta breve* | No lo sé. | REC-PRUEBA-PAC-R-03 | prueba | Igual |

## Entradas del médico

| ID | Tipo | Texto en español | Término de búsqueda | Recurso asociado | Estado |
|---|---|---|---|---|---|
| MED-P-01 | pregunta | ¿Desde cuándo tiene este síntoma? | desde cuándo | REC-PRUEBA-MED-P-01 | prueba |
| MED-P-02 | pregunta | ¿Puede señalar dónde le duele? | dónde duele | REC-PRUEBA-MED-P-02 | prueba |
| MED-P-03 | pregunta | ¿Tiene alergia a algún medicamento? | alergia a medicamento | REC-PRUEBA-MED-P-03 | prueba |
| MED-P-04 | pregunta | ¿Está tomando algún medicamento? | toma medicamento | REC-PRUEBA-MED-P-04 | prueba |
| MED-P-05 | pregunta | ¿Ha tenido fiebre? | fiebre | REC-PRUEBA-MED-P-05 | prueba |
| MED-P-06 | pregunta | ¿Ha tenido vómito? | vómito | **ninguno** (a propósito) | sin recurso |
| MED-R-01 | respuesta | Ahora voy a revisarle. | revisar | REC-PRUEBA-MED-R-01 | prueba |
| MED-R-02 | respuesta | Espere un momento, por favor. | esperar | REC-PRUEBA-MED-R-02 | prueba |
| MED-R-03 | respuesta | Para continuar se necesita un intérprete de LSM. | intérprete | REC-PRUEBA-MED-R-03 | prueba |
| MED-R-04 | respuesta | Hemos terminado la consulta. | terminar consulta | REC-PRUEBA-MED-R-04 | prueba |

Las entradas con contenido clínico (MED-P-03, MED-P-04 y las de síntomas) también requieren revisión del personal médico.

## Recursos de controles y avisos del sistema

| Clave | Uso | Recurso | Estado |
|---|---|---|---|
| avisoAlcance | Aviso de alcance al iniciar (RF-16, RC-01) | REC-PRUEBA-SIS-ALCANCE | prueba. La app muestra «Este aviso todavía no tiene un recurso en LSM validado» |
| revisar | Encabezado «Revisa tu mensaje» (RF-03) | REC-PRUEBA-SIS-REVISAR | prueba |
| confirmar | Control «Confirmar mensaje» (RF-07) | REC-PRUEBA-SIS-CONFIRMAR | prueba |
| descartar | Control «Descartar mensaje» (RF-13) | REC-PRUEBA-SIS-DESCARTAR | prueba |
| noEntendi | Control «No entendí» (RF-15) | REC-PRUEBA-SIS-NO-ENTENDI | prueba |
| intensidadDolor | Escala 1–10 (RF-19). En producto bloquea enviar con intensidad | REC-PRUEBA-SIS-INTENSIDAD | prueba |
| expresionDesconocida | Aviso de expresión no reconocida (RF-05, etapa C) | REC-PRUEBA-SIS-DESCONOCIDA | prueba |
| cancelarCaptura | Control «Cancelar» de cámara (RF-17, etapa C) | REC-PRUEBA-SIS-CANCELAR | prueba |

## Cómo registrar un recurso validado (cuando exista)

1. Copiar el archivo a `public/recursos/` (lo empaqueta Vite y funciona sin internet).
2. En el catálogo, cambiar el recurso a `estado: 'validado'`, con `tipo: 'video'` y `src: '/recursos/<archivo>'`.
   Llenar procedencia, condiciones de uso y revisión lingüística.
3. Actualizar esta tabla con la fecha y quién aprobó la asociación entrada–recurso.
4. Repetir la prueba del flujo de producto: esa entrada debe poder enviarse y mostrar exactamente ese recurso.
