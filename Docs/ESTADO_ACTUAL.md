# Estado actual · TechStar (LSM Consulta)

**Fecha:** 07/11/2026 · **Etapa:** A (primera conversación en escritorio) · **Estado de la etapa:** implementada y
verificada en una computadora. Las etapas B a E siguen pendientes.

> En Windows, `docs/` y `Docs/` son la misma carpeta. Este archivo vive en `Docs/` junto a las copias de los documentos.

## 1. Documentos de referencia usados

| Documento | Versión | Ubicación local | Nota |
|---|---|---|---|
| Encargo `TECHSTAR_MVP.md` | Revisión 4 · 07/11/2026 | raíz | Punto de entrada |
| SRS | 1.6 · 04/11/2026 | `Docs/ACS_SRS_TechStar.pdf` | El pie de página dice «Versión 1.5». La copia en `Presentacion 4 Nov/` es idéntica (misma suma) |
| Lista consolidada | 1.5 · 04/11/2026 | `Docs/ACS_LISTA-CONSOLIDADA-REQUERIMIENTOS_TechStar.pdf` | El pie de página dice «Versión 1.4» |
| Prototipo Figma «Pinkies» V2 | Consultado el 07/11/2026 | enlace del encargo | Revisado con la sesión del equipo, **solo lectura** (no se editó). Se tomaron colores, tipografías, escala tipográfica, radios y distribución de las pantallas PS-*/PM-*. Ver §2.1 |

No se consultaron entrevistas: no fue necesario aclarar el origen de ningún requisito. El encargo apunta a
`docs/requisitos/`, pero las copias vigentes están en `Docs/` y no se movieron.

## 2. Decisiones tomadas en esta etapa

| # | Decisión | Motivo |
|---|---|---|
| D1 | **Dos políticas de recursos.** *Producto:* solo se envían entradas con recurso `validado`. *Desarrollo:* también admite recursos `prueba`, marcados con franjas amarillas y negras. En ambas, una entrada sin recurso queda bloqueada | No existe ningún recurso validado. El encargo pide bloquear en el flujo de producto y probar con recursos de prueba identificados |
| D2 | Vite + React 19 + TypeScript en el navegador. **Electron se deja para la etapa B** | Más sencillo de ejecutar y probar ahora. El núcleo y las vistas no dependen de Electron y se reutilizan sin cambios |
| D3 | El coordinador de sesión vive en la vista del médico y es la única autoridad. Los borradores del paciente **no salen de su pantalla** hasta confirmarse | RF-04 y RF-07 se cumplen por diseño, no solo por la interfaz |
| D4 | Cada envío lleva un `envioId`. El coordinador lo aplica una sola vez | Evita duplicados por doble toque o reintento (RF-07, RF-20) |
| D5 | El coordinador recompone el texto y lo compara con lo que el paciente revisó | Garantiza que el médico recibe exactamente lo revisado |
| D6 | «Recibido» solo aparece cuando la otra pantalla acusa que mostró el mensaje | RF-20: no se informa una entrega sin recepción |
| D7 | Grupo provisional **«Respuestas breves»** del paciente (Sí / No / No sé) | Falta decidir qué puede responder el paciente (§6.3). Está marcado en pantalla y se quita en el catálogo |
| D8 | «No entendí» siempre está disponible, aunque su recurso no esté validado (muestra su estado) | Bloquear la petición de aclaración perjudicaría al paciente. El bloqueo del encargo aplica a las entradas del catálogo |
| D9 | Los dos participantes pueden terminar la consulta, con un diálogo de confirmación | RF-18 no especifica quién cierra |
| D10 | Ante un valor desconocido en `?recursos=`, la app usa el flujo de producto | La opción estricta es la segura |
| D11 | Estilo del prototipo Figma V2 (paleta crema/verde/salvia, Cal Sans + Inter, cabecera, pasos 1-2-3, tarjetas «Elegir/Elegido», paginación, revisión en dos columnas, «Buscar en el catálogo») | Pedido del equipo el 07/11/2026 |
| D13 | Acabado más profesional (07/11/2026): iconos de línea uniformes (Lucide, ISC) en lugar de emoji; marcador de recurso de prueba con silueta neutra y etiqueta ámbar «Prueba · no es LSM» en lugar de franjas; banda de modo discreta; pesos tipográficos, sombras y espaciado más consistentes | Pedido del equipo: «más profesional manteniendo el estilo de Figma». Los recursos de prueba siguen identificados con texto en cada uno |
| D12 | La intensidad del dolor se indica en la **revisión**, como en Figma. Si cambia en la revisión, el envío recibe un `envioId` nuevo | Sigue el diseño del equipo sin permitir que un reintento devuelva como «enviado» un contenido anterior |

### 2.1 Diferencias intencionales con el prototipo Figma

| Pantalla de Figma | En Figma | En la app | Motivo |
|---|---|---|---|
| PS-Revisión opciones | La escala «¿Cuánto te duele?» aparece en 6/10 | Empieza en «–/10» con «Sin indicar» | RF-19: sin valor por defecto |
| PS-Revisión opciones | «Sí, enviar mensaje» y «Quitar» | «Confirmar mensaje» y «Descartar mensaje» (con el estilo de «Quitar») | Nombres de control de RF-07 y RF-13 |
| PM-Envío (confirmación) | Modal sin recurso en LSM | Revisión con texto **y** recurso, y botón «Enviar al paciente» | RF-02: el médico revisa el texto y el recurso antes de «Enviar» |
| PS-Mensaje de médico | Sin «No entendí» | «No entendí» junto al mensaje, al lado de «Responder» | RF-15 |
| PS-Captura señas/opciones | Captura con cámara | Indicador «Captura en LSM · etapa C» deshabilitado | La cámara corresponde a la etapa C |
| Videos de LSM | Persona señando | Silueta neutra con el icono de la entrada y etiqueta ámbar «Prueba · no es LSM» | No hay recursos validados (D1) |
| Ilustraciones de síntomas | Figuras en verde salvia | Iconos de línea provisionales | Faltan apoyos visuales validados |
| Catálogo | Solo síntomas | Además «Respuestas breves» marcadas «Provisional» | D7 |
| Pantallas con dos columnas | Siempre lado a lado | En pantallas angostas (modo de una pantalla) se apilan; el texto del médico va antes del video | Legibilidad a media pantalla |

## 3. Requisitos cubiertos en la etapa A

«Comprobado en laptops» significa comprobado **en una sola computadora** (modo de una pantalla y dos ventanas del
mismo navegador). Las pruebas con dos laptops corresponden a la etapa B.

| Requisito | Cobertura en A | Tableta Android |
|---|---|---|
| RF-16, RC-01 Aviso de alcance | Al iniciar, en español con recurso de prueba e indicación de que falta el validado. Botón «Alcance» durante la sesión | Pendiente en Android |
| RF-19 Catálogo del paciente | Varios síntomas e intensidad opcional 1–10 sin valor por defecto | Pendiente en Android |
| RF-03 Vista previa | Texto, recursos, intensidad y el texto exacto que leerá el médico. Bloqueo si falta recurso | Pendiente en Android |
| RF-04 Pendiente | El borrador vive solo en la vista del paciente | Pendiente en Android |
| RF-13 Descartar / modificar | «Cambiar selección» conserva la selección y «Descartar mensaje» la elimina | Pendiente en Android |
| RF-07 Confirmar | Entrega exacta y un solo envío | Pendiente en Android |
| RF-14 Búsqueda | Por parte del término, sin mayúsculas ni tildes, «Sin resultados», búsqueda vacía sin consulta | — (computadora) |
| RF-02 Revisar y enviar | Revisión previa, volver, enviar y bloqueo sin recurso | — |
| RI-01 Recurso asociado | Se muestra exactamente el recurso registrado. Nunca se sustituye | Pendiente en Android |
| RF-15 «No entendí» | Aviso vinculado al identificador del mensaje. Se marca como atendido con el siguiente envío | Pendiente en Android |
| RF-18 Cierre | Borra mensajes, avisos y borradores en ambas vistas. Rechaza envíos tardíos. La nueva sesión empieza vacía | Pendiente en Android |
| RF-20 Sesión compartida | Coordinador con identificadores de sesión, mensaje y aviso, validación de rol y acuses. **Solo en una computadora** | Pendiente (etapas B y E) |
| RF-01, RF-05, RF-17 Cámara | Solo lógica de estados con pruebas (captura, cancelar, procesando, no reconocido, resultados tardíos). Sin interfaz | Etapa C |
| RNF-01 Significado | No evaluado. Requiere la rúbrica y 30 intercambios | Etapa D |

## 4. Pruebas ejecutadas

**Entorno:** Windows 10 Pro 10.0.19045 · Node 22.15.0 · npm 10.9.2 · una sola computadora · navegador integrado de la
app de escritorio de Claude (Chromium) a 1366×768. No se probó con dos laptops, cámara ni Android.

### 4.1 Automáticas (`npm run check`)

Resultado: **46 de 46 pruebas pasan**, sin errores de tipos y con la compilación de producción correcta (última ejecución tras aplicar el estilo de Figma).

| Archivo | Qué comprueba |
|---|---|
| `src/nucleo/coordinador.test.ts` (16) | Entrega exacta, envío único, contenido distinto rechazado, bloqueo sin recurso en ambos modos, bloqueo de recursos de prueba en producto, recurso validado aceptado sin sustitución, intensidad 1–10 solo en dolor, permisos por rol, «No entendí» vinculado y atendido, acuses del destinatario, cierre con rechazo de envíos tardíos y sesión nueva vacía, otra sesión rechazada |
| `src/nucleo/turnoPaciente.test.ts` (11) | Selección múltiple, intensidad opcional (también en la revisión, con `envioId` nuevo), modificar y descartar, seleccionar no envía, reintento con el mismo `envioId`, cámara: cancelar sin procesar, reconocido a revisión, no reconocido con reintento o catálogo, resultados de otra captura descartados |
| `src/nucleo/busqueda.test.ts` (10) | Mayúsculas, tildes, coincidencia parcial, búsqueda vacía, «Sin resultados», ñ, política de recursos, integridad del catálogo |
| `src/modos/recorrido.test.tsx` (6) | Recorridos con las vistas reales (ver matriz) |
| `src/transporte/transporte.test.ts` (3) | Comandos entre ventanas, rol validado por canal, «sin conexión» sin coordinador, política estricta por defecto |

### 4.2 Matriz de casos de la etapa A

| Requisito | Caso | Resultado esperado | Resultado observado | Evidencia |
|---|---|---|---|---|
| RF-04 | Selección y revisión sin confirmar | El médico no ve el borrador | El médico mostraba «Todavía no hay mensajes» durante la revisión | Prueba de recorrido 1 + navegador (una pantalla y dos ventanas) |
| RF-07 | Doble toque en «Confirmar» | Un solo mensaje | «1 mensajes» (texto corregido después a «1 mensaje») y un solo mensaje en la conversación | Prueba de recorrido 1 + navegador |
| RF-19 | Dolor 7 de 10 + fiebre | El médico recibe la intensidad solo en el dolor | «Intensidad del dolor: 7 de 10» solo en el dolor de cabeza | Prueba de recorrido 1 + navegador |
| RF-19 | Dolor sin intensidad | No se transmite ningún valor | Sin texto de intensidad en el médico | Prueba de recorrido 2 |
| RF-13 | Modificar y descartar | Modificar conserva, descartar borra y no envía | Conforme | Prueba de recorrido 3 |
| RF-14 | «ALERGIA», «vomito», «cirugía» | Encuentra sin mayúsculas ni tildes y muestra «Sin resultados» | Conforme | Pruebas de búsqueda + navegador |
| RF-02 | Seleccionar sin enviar y después enviar | Seleccionar no envía. El paciente recibe exactamente la selección con su recurso | Conforme (recurso `REC-PRUEBA-MED-P-03` en el paciente) | Prueba de recorrido 1 + navegador |
| RF-02, RF-03 | Entrada sin recurso (MED-P-06, PAC-S-06) | Aviso y envío bloqueado | Conforme en ambas vistas | Prueba de recorrido 4 + navegador |
| Encargo §8 | Flujo de producto con recursos de prueba | Envío bloqueado | Conforme | Prueba de recorrido 5 |
| RF-15 | «No entendí» en la pregunta de alergia | El aviso señala ese mensaje | `data-aclaracion-de` igual al id del mensaje. El médico ve el texto correcto | Prueba de recorrido 1 + navegador |
| RF-15 | Elegir otra entrada tras el aviso | Se envía y el aviso queda atendido | «respondida con «¿Desde cuándo…?»» | Prueba de recorrido 1 + navegador |
| RF-16 | Consultar el alcance durante la revisión | No se pierde el borrador | Conforme | Prueba de recorrido 6 |
| RF-18 | Terminar y abrir una nueva consulta | Ambas vistas se vacían y la sesión nueva empieza vacía | Conforme | Prueba de recorrido 1 + navegador |
| RF-18, RF-20 | Envío tardío a una sesión cerrada | Rechazado | `sesion-cerrada` | Prueba del coordinador |
| RF-20 | Mensaje de otra sesión | Rechazado | `sesion-incorrecta` | Prueba del coordinador |
| RF-20 | Dos ventanas (médico y paciente) | Mismo recorrido entre ventanas | Sesión, confirmación y entrega funcionaron | Navegador, dos pestañas |

### 4.3 Verificación del estilo de Figma (07/11/2026)

Recorrido completo en el navegador integrado con el modo de una pantalla (1366×768) y con las ventanas
«médico» y «paciente» por separado: aviso de alcance, catálogo paginado, revisión con escala de dolor, confirmación,
«Mensaje del paciente» con la caja «7/10», «Buscar en el catálogo», confirmación del médico con recurso,
«Mensaje del médico», «No entendí» y aviso rosa. Ajustes hechos al verlo: la cinta «PRUEBA» se superpone al video,
el botón de reproducir va en la esquina, la revisión del médico limita el tamaño del recurso y la conversación del médico
tiene su propio desplazamiento.

### 4.4 Ajustes hechos tras probar en el navegador (primera versión)

- Algunos emoji (🫃, 😵‍💫, ⏻) no se ven en Windows 10. Se reemplazaron.
- La revisión del paciente se abría desplazada hacia abajo. Ahora empieza arriba.
- El botón «Enviar» del médico quedaba fuera de la vista. Ahora el recurso y los botones van lado a lado.
- «Elegir otra entrada» conservaba la búsqueda anterior. Ahora la limpia. Lo detectó una prueba automática.
- El contraste del botón «Elegir otra entrada» al pasar el ratón era insuficiente. Se corrigió.

## 5. Inventario de datos temporales (RF-18)

| Dónde | Qué guarda | Cuándo se borra |
|---|---|---|
| Memoria del coordinador (ventana del médico) | Mensajes confirmados, avisos y `envioId` | Al terminar la consulta. Solo quedan los identificadores de sesiones cerradas (sin contenido) para rechazar envíos tardíos, y se pierden al cerrar la ventana |
| Memoria de cada vista | Última instantánea y borrador del paciente | Al cambiar de sesión, porque la vista se desmonta por clave de sesión |
| Canal entre ventanas (BroadcastChannel) | Mensajes en tránsito, solo en memoria | No persiste |
| Disco, `localStorage`, `IndexedDB`, registros | **Nada.** El código no usa almacenamiento ni `console.log` | — |

Pendiente: revisar la caché del navegador o de Electron tras cerrar cuando se empaquete (etapa B) y los clips (etapa C).

## 6. Materiales y decisiones pendientes

- **Catálogo V1** aprobado: entradas del paciente y del médico, y qué puede responder el paciente a cada pregunta (§6.3).
- **Recursos en LSM validados** para cada entrada y para los controles del sistema. Ver [RECURSOS_LSM.md](RECURSOS_LSM.md).
- Validar los iconos de apoyo visual con personas Sordas (o sustituirlos por las ilustraciones del prototipo).
- Rúbrica de RNF-01 y protocolo de RNF-02.
- Decidir si se mantiene el grupo «Respuestas breves» (D7).
- Vocabulario y muestras autorizadas para el reconocedor (preparar en paralelo, §4 etapa C).

## 7. Registro de pruebas pendientes en Android (etapa E)

Todas las de RF-01, RF-03, RF-04, RF-05, RF-07, RF-13, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20 y RI-01 en la tableta:
captura, permisos y ciclo de vida de la cámara, catálogo táctil, envío, aclaración, reconexión y eliminación de datos.

## 8. Explicación de los módulos por el integrante

*Pendiente.* El encargo (§7) pide que el integrante explique cada módulo con sus palabras y que esa explicación se
revise contra el código. Ver la guía breve en el README.

## 9. Próxima tarea: etapa B (conectar dos laptops)

1. Añadir Electron con tres modos de arranque: médico, paciente y demostración. Mantener las vistas aisladas de Node.
2. En la laptop del médico, un servidor WebSocket en el proceso principal envuelve el `CoordinadorSesion` existente.
3. Crear `src/transporte/websocket.ts` con la misma interfaz `ConexionCliente`. Las vistas no cambian.
4. Vinculación: código corto o QR mostrado en el médico, con token por sesión y rol validado en el coordinador.
   Rechazar equipos ajenos y limitar a una pareja de dispositivos por sesión.
5. Proteger la conexión en la red local (TLS con certificado propio o cifrado del canal con el token de vinculación).
6. Desconexión y recuperación: reintento automático, reenvío de la instantánea al reconectar y conservación del
   `envioId` para no duplicar.
7. Registrar los sistemas operativos de ambas laptops y repetir la matriz 4.2 por Wi-Fi: ambos sentidos, equipo ajeno,
   caída de red, recuperación y ausencia de duplicados.
