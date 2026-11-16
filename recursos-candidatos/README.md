# Recursos candidatos en LSM (sin validar)

Videos descargados el 16/11/2026 de las dos fuentes públicas. **Son candidatos, no recursos validados**:
no se copiaron a `public/recursos/` ni se tocaron en `catalogo/ficticio-dev.json`. Antes de usar uno en el
producto falta lo que pide `TECHSTAR_MVP.md` §6.2: que corresponda al mensaje completo, que el uso esté
permitido por la fuente y registrar la aprobación entrada–recurso.

| Fuente | Página | Señas en el sitio | Dónde aloja los videos |
|---|---|---|---|
| Iztacala Enseña (FES Iztacala, UNAM) | https://www.iztacalaensena.org/iacutendice-de-categoriacuteas.html | 758 en 30 categorías | YouTube Shorts |
| Indiscapacidad CDMX · Portal LSM | https://lsm.indiscapacidad.cdmx.gob.mx/ | 1 050 en 24 ejes | YouTube |

## Contenido

- `videos/` — 85 videos `.mp4` (49 MB en total; H.264 a 720p, **sin audio**: solo la pista de video).
  Iztacala son verticales (720×1280) e Indiscapacidad horizontales (1280×720). Nombre:
  `<IZT|IND>_<seña>_<idYouTube>.mp4`.
- `procedencia.json` — por cada video: fuente, nombre de la seña en el sitio, página de origen, URL del video,
  entradas del catálogo para las que es candidato, cobertura, tamaño y fecha de descarga.
- `indices/` — lista completa de señas de cada sitio (nombre, categoría, URL del video), por si se necesitan más.
- `armar_manifiesto.py` y `descargar.py` — scripts que generaron todo. Requieren `pip install "yt-dlp[default]"`
  (el extra `default` instala `yt-dlp-ejs`; sin él YouTube niega los videos de Indiscapacidad) y Node.js.
  `yt-dlp` ya avisa que dejará de soportar Python 3.10.

## Cobertura por entrada del catálogo

**Completa** = un video dice el mensaje. **Parcial** = solo una parte (la seña del concepto, o la pregunta en otro
tiempo verbal); falta decidir con apoyo lingüístico si basta o si hay que grabar la frase.

| Entrada | Mensaje | Cobertura | Candidatos |
|---|---|---|---|
| PAC-S-01 | Tengo dolor de cabeza. | parcial | IZT «Dolor de cabeza» (2 versiones), IND «Dolor» |
| PAC-S-02 | Tengo dolor de estómago. | **parcial, falta «estómago»** | IZT «Dolor» |
| PAC-S-03 | Me duele la garganta. | parcial | IZT «Dolor de garganta» |
| PAC-S-04 | Tengo fiebre. | parcial | IZT y IND «Fiebre» |
| PAC-S-05 | Tengo tos. | parcial | IZT «Tos» (2), IND «Tos» (1) y (2) |
| PAC-S-06 | Me siento mareado o mareada. | parcial | IZT «Mareo» (2), IND «Mareos», IZT «¿Estás mareado/a?» |
| PAC-S-07 | Tengo náuseas. | parcial | IZT «Nauseas» (2), IND «Asco (Náuseas)» |
| PAC-S-08 | Me siento muy cansado o cansada. | parcial | IZT «Cansado», IND «Cansancio» |
| PAC-R-01 | Sí. | **sin candidato** | Ninguno de los dos sitios tiene la seña |
| PAC-R-02 | No. | **sin candidato** | Ninguno de los dos sitios tiene la seña |
| PAC-R-03 | No lo sé. | parcial | IZT y IND «No saber» |
| MED-P-01 | ¿Desde cuándo tiene este síntoma? | parcial | IZT «¿Cuándo?», IZT «Tiempo» |
| MED-P-02 | ¿Puede señalar dónde le duele? | completa | IZT «¿Dónde te duele?» |
| MED-P-03 | ¿Tiene alergia a algún medicamento? | completa | IZT «¿Eres alérgico/a a algún medicamento?» (+ «Alergia» IZT/IND) |
| MED-P-04 | ¿Está tomando algún medicamento? | completa | IZT «¿Estás tomando medicamento?» (+ «Medicamento» IZT/IND) |
| MED-P-05 | ¿Ha tenido fiebre? | parcial | IZT «¿Tienes fiebre?» (presente, no pasado) |
| MED-P-06 | ¿Ha tenido vómito? | completa | IZT «¿Vomitaste?» (+ IZT «Vomitar», IND «Vómito») |
| MED-R-01 | Ahora voy a revisarle. | parcial | IZT «Revisión general médica», «Ahora» IZT/IND |
| MED-R-02 | Espere un momento, por favor. | parcial | IND «Esperar», «Por favor» IZT/IND |
| MED-R-03 | Para continuar se necesita un intérprete de LSM. | parcial | IZT «¿Necesitas intérprete?», «Intérprete» IZT/IND |
| MED-R-04 | Hemos terminado la consulta. | parcial | IZT «Acabar», IND «Consulta Médica» |

### Controles y avisos del sistema

| Clave | Cobertura | Candidatos |
|---|---|---|
| noEntendi | parcial | IZT «No entender», «Entender» IZT/IND |
| intensidadDolor | parcial | IZT «¿Qué tanto te duele?», «¿Te duele mucho?», «Mucho»/«Poco» IZT/IND, números 1–10 de IND |
| descartar | apoyo | IZT «Quitar», «Cambiar» |
| confirmar | apoyo | IND «Enviar» (3 variantes) |
| avisoAlcance, revisar, cancelarCaptura, expresionDesconocida | **sin candidato** | Son frases largas o propias de la app; no existen en los sitios |

Vocabulario de apoyo (útil para el reconocedor o futuras entradas): «¿Cuáles son tus síntomas?», «¿Qué sientes?»,
«Síntomas», «¿Tienes dolor?», «¿Te duele la cabeza?», «¿Tienes náuseas?», «¿Tienes tos?», «Gracias», «Hola»,
«Ayudar», «Equivocar», «Descansar».

## Pendientes antes de usarlos

1. **Permiso de uso.** Ningún sitio publica una licencia que permita redistribuir los videos. Para la entrega
   académica, pedir autorización por escrito (Iztacala Enseña tiene página de contacto; Indiscapacidad, directorio
   del instituto) y registrar la respuesta en las «condiciones de uso» de cada recurso.
2. **Revisión lingüística** de la cobertura parcial con una persona usuaria de LSM: si la seña del concepto basta o
   hay que grabar la frase completa.
3. **Grabar o conseguir** «Sí», «No», «estómago» y los avisos del sistema.
4. Al aprobar un recurso: copiar el video a `public/recursos/` con el nombre del campo `archivo` y correr
   `npm run validar-catalogo` (ver README del proyecto, «Editar el catálogo»).
5. **No subir los videos a git** sin decidirlo: son 49 MB y su redistribución no está autorizada.
