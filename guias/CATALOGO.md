# Editar el catálogo (detalle)

Resumen en el [README](../README.md#editar-el-catálogo). Aquí están los campos y los pasos completos.

**Campos de cada entrada** (todos obligatorios salvo `nota`):

| Campo | Qué es | Ejemplo |
|---|---|---|
| `id` | Identificador único, sin espacios ni acentos | `"PAC-S-09"` |
| `tipo` | `sintoma`, `respuesta-paciente`, `pregunta-medico` o `respuesta-medico` | `"sintoma"` |
| `significado` | Qué quiere comunicar, para revisar que el recurso conserva el sentido | `"El paciente informa que le duele el oído."` |
| `texto` | Mensaje en español que se entrega, exactamente como se mostrará | `"Me duele el oído."` |
| `termino` | Término con el que el médico la busca (RF-14) | `"dolor de oído"` |
| `icono` | Clave de un icono existente (el validador lista las disponibles) | `"cabeza"` |
| `esDolor` | `true` solo en síntomas de dolor (admiten intensidad 1–10) | `true` |
| `recursoId` | ID del recurso en LSM asociado, o `null` si todavía no tiene (la entrada queda bloqueada) | `"REC-PAC-S-09"` |
| `recomendadas` | Opcional, solo en síntomas. Preguntas del médico que se le sugieren cuando el paciente confirma este síntoma, en orden | `["MED-P-01", "MED-P-18"]` |
| `nota` | Opcional. Aparece en el inventario | `"Pendiente de revisión médica."` |

**Preguntas generales:** la lista `"preguntasGenerales"` (en la raíz del archivo, después de `"recursosSistema"`) son
preguntas del médico que se le sugieren en cualquier consulta, en ese orden. El validador revisa que `recomendadas` y
`preguntasGenerales` solo contengan IDs de preguntas del médico que existan, sin repetir.

**Campos de cada recurso:** `id`, `tipo` (`video`, `imagen` o `marcador-prueba`), `estado` (`validado` o
`prueba`), `descripcion` (qué debe mostrar), `archivo` (nombre dentro de `public/recursos/`, o `null`),
`procedencia`, `condicionesUso`, `revisionLinguistica`, `aprobacion` (`{ "quien": "...", "fecha": "AAAA-MM-DD" }` o
`null`) y `estadoReproduccion` (dónde se comprobó que se reproduce). Los controles del sistema («Confirmar», «No
entendí», aviso de alcance…) se asocian en `recursosSistema`.

## Agregar una entrada, paso a paso

1. Abrir `catalogo/ficticio-dev.json` y, dentro de `"entradas"`, copiar una entrada del mismo tipo. Pegarla debajo
   y cuidar las comas: entre dos `{ … }` va una coma, y después de la última no.
2. Cambiar `id` (sigan la serie: `PAC-S-09`, `MED-P-07`…), `significado`, `texto`, `termino`, `icono` y `esDolor`.
3. Si todavía no hay recurso en LSM, poner `"recursoId": null`. La entrada aparece en el catálogo pero no se puede
   enviar (regla del encargo). Para probar la interfaz en modo desarrollo se puede asociar un recurso
   `marcador-prueba`, copiando uno de los `REC-PRUEBA-…` con un ID nuevo.
4. `npm run validar-catalogo` y corregir lo que indique. Cada mensaje dice qué entrada o recurso falla y por qué.
5. `npm run docs-recursos` para actualizar el inventario.
6. `npm run check` y revisar la entrada en la app (`npm run dev`, modo desarrollo).

Un icono nuevo sí requiere código: agregar la clave en `CLAVES_ICONO` (`src/catalogo/validarCatalogo.ts`) y su
dibujo en `src/vistas/comunes/IconoEntrada.tsx`. El compilador avisa si falta uno de los dos.

## Registrar un video en LSM validado, paso a paso

Antes de marcar un recurso como `validado` hay que comprobar (TECHSTAR_MVP.md §6.2) que corresponde al **mensaje
completo**, que **se reproduce en la app**, que el **uso está permitido** por sus condiciones, y **quién aprobó** la
asociación entrada–recurso y cuándo.

1. **Preparar el archivo.** Video `.mp4` (H.264) o `.webm`; imagen `.png`, `.jpg` o `.webp`. Nombrarlo con el ID
   de la entrada, sin espacios ni acentos: `PAC-S-01.mp4`. Nunca usar capturas o grabaciones de consultas (RF-18).
2. **Copiarlo a `public/recursos/`.** La app lo empaqueta y lo reproduce sin internet (RNF-03). No se admiten
   direcciones `https://…`.
3. **Registrar el recurso** en `"recursos"` (un recurso nuevo o el `REC-PRUEBA-…` de esa entrada, ya cambiado):

   ```json
   {
     "id": "REC-PAC-S-01",
     "tipo": "video",
     "estado": "validado",
     "descripcion": "Seña en LSM de «Tengo dolor de cabeza.»",
     "archivo": "PAC-S-01.mp4",
     "procedencia": "Iztacala Enseña, video «…» (URL de la ficha original)",
     "condicionesUso": "Uso educativo sin fines de lucro, con atribución (según la licencia de la fuente)",
     "revisionLinguistica": "Revisado por <nombre o rol del apoyo lingüístico>, 2026-11-18: conserva el sentido",
     "aprobacion": { "quien": "<quién aprobó la asociación>", "fecha": "2026-11-20" },
     "estadoReproduccion": "Probado en Electron (Windows 10), 2026-11-20: se reproduce sin internet"
   }
   ```

4. **Asociarlo a la entrada:** en la entrada `PAC-S-01`, `"recursoId": "REC-PAC-S-01"`. Si quedó un `REC-PRUEBA-…`
   sin uso, borrarlo (el validador avisa de los recursos sin uso).
5. `npm run validar-catalogo`. Rechaza un recurso validado sin archivo o sin aprobación, y comprueba que el archivo
   existe con ese nombre exacto (mayúsculas incluidas), que no está vacío y que su contenido es del formato de su
   extensión.
6. `npm run docs-recursos` y `npm run check`.
7. **Probar la reproducción:** `npm run dev` → **Flujo de producto** → la entrada se puede enviar y muestra
   exactamente ese video. Las demás siguen bloqueadas. En la app de escritorio:
   `npm run build:electron` y luego `npx electron . --modo=demo --recursos=producto`. Anotar el resultado en
   `estadoReproduccion` y regenerar el inventario.
8. **Guardar en el repositorio:** `git add public/recursos/PAC-S-01.mp4 catalogo/ guias/RECURSOS_LSM.md`. El
   `.gitignore` excluye todos los videos salvo los de `public/recursos/`.

Si en una laptop el archivo falta o está dañado, la pantalla muestra «Recurso dañado o faltante» y **no muestra otro
recurso en su lugar**.

**Catálogo V1:** cuando esté aprobado, crear `catalogo/v1.json` (mismo formato) y validarlo con
`npm run validar-catalogo -- catalogo/v1.json`. Cambiar la app al V1 es una decisión del equipo. Hay que cambiar dos
líneas: el `import` de `src/catalogo/catalogoFicticio.ts` y `CATALOGO_APP` en `scripts/comun.ts`.
