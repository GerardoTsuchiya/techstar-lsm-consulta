# Estado actual · TechStar (LSM Consulta)

**Fecha:** 16/11/2026 · **Etapa:** C, primera parte (cámara y reconocedor simulado) · **Estado:** captura con la
cámara implementada y probada en **una** computadora (Electron con una cámara del sistema, navegador con cámara
bloqueada y pruebas automáticas con cámara falsa). **El reconocimiento es simulado**: falta el modelo real, el
vocabulario y las muestras autorizadas (§2.3, §4.7, §6). La etapa B sigue **pendiente de probar en dos laptops**
(protocolo en [PRUEBA_DOS_LAPTOPS.md](PRUEBA_DOS_LAPTOPS.md)). La etapa A sigue vigente (§2 a §4.4). Las etapas D y E
siguen pendientes.

En este documento: **probado** = ejecutado y conforme, con el entorno indicado; **pendiente de probar en dos laptops** =
implementado y probado en una computadora, falta la evidencia con dos equipos reales por Wi-Fi; **pendiente en
Android** = requiere la tableta (etapa E).

> En Windows, `docs/` y `Docs/` son la misma carpeta. Este archivo vive en `Docs/` junto a las copias de los documentos.

## 1. Documentos de referencia usados

| Documento | Versión | Ubicación local | Nota |
|---|---|---|---|
| Encargo `TECHSTAR_MVP.md` | Revisión 4 · 07/11/2026 | raíz | Punto de entrada |
| SRS | 1.6 · 04/11/2026 | `Docs/ACS_SRS_TechStar.pdf` | El pie de página dice «Versión 1.5». La copia en `Presentacion 4 Nov/` es idéntica (misma suma) |
| Lista consolidada | 1.5 · 04/11/2026 | `Docs/ACS_LISTA-CONSOLIDADA-REQUERIMIENTOS_TechStar.pdf` | El pie de página dice «Versión 1.4» |
| Prototipo Figma «Pinkies» V2 | Consultado el 07/11/2026 | enlace del encargo | Revisado con la sesión del equipo, **solo lectura** (no se editó). Se tomaron colores, tipografías, escala tipográfica, radios y distribución de las pantallas PS-*/PM-*. Ver §2.1 |
| Protocolo de la prueba con dos laptops | 16/11/2026 | `Docs/PRUEBA_DOS_LAPTOPS.md` | Casos B1–B15 y registro de sistemas operativos (etapa B) |

No se consultaron entrevistas: no fue necesario aclarar el origen de ningún requisito. El encargo apunta a
`docs/requisitos/`, pero las copias vigentes están en `Docs/` y no se movieron.

## 2. Decisiones tomadas

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
| PS-Captura señas/opciones | Captura con cámara | Panel «Captura en LSM» con video en espejo, «● Cámara activa» y tiempo, «Cancelar» y «Listo» lado a lado; «Interpretando tu seña…»; aviso «No reconocimos tu seña» con «Intentar de nuevo» y «Elegir lo que sientes» | Etapa C. Se agregaron el tiempo máximo (15 s), «La cámara ya está apagada» y el aviso de privacidad (RF-17, RF-18). En modo desarrollo se ve además el recuadro ámbar del simulador, que no es de Figma |
| Videos de LSM | Persona señando | Silueta neutra con el icono de la entrada y etiqueta ámbar «Prueba · no es LSM» | No hay recursos validados (D1) |
| Ilustraciones de síntomas | Figuras en verde salvia | Iconos de línea provisionales | Faltan apoyos visuales validados |
| Catálogo | Solo síntomas | Además «Respuestas breves» marcadas «Provisional» | D7 |
| Pantallas con dos columnas | Siempre lado a lado | En pantallas angostas (modo de una pantalla) se apilan; el texto del médico va antes del video | Legibilidad a media pantalla |

### 2.2 Decisiones de la etapa B (16/11/2026)

| # | Decisión | Motivo |
|---|---|---|
| D14 | **Electron 45.3.3** (Chromium 156, Node 24.22 interno) y **ws 8.23.0**, fijados exactos en `package.json` y `package-lock.json`. Tipos: `@types/node` 24.19.2 (Node de Electron) y `@types/ws` 8.18.2 | Electron 45 es la línea estable vigente; su instalación exige Node ≥ 22.12 (esta PC: 22.15.0). ws 8.23.0 es la versión vigente de la línea 8 (se publicó junto con parches de las líneas 5, 6 y 7). Se comprobaron fechas y requisitos en npm el 16/11/2026 |
| D15 | Tres modos de arranque por línea de órdenes (`--modo=medico\|paciente\|demo`). Cada modo abre `dist/index.html` con su vista; el modo demo no abre ningún puerto | §5 del encargo. El respaldo en una pantalla no depende de la red |
| D16 | Vistas aisladas: `contextIsolation`, `sandbox`, sin `nodeIntegration`, sesión de Chromium **en memoria**, sin navegación ni ventanas nuevas, todos los permisos denegados, política de contenido (CSP) en la versión compilada. La vista solo ve `window.techstar` (preload) | §5 del encargo: mantener las vistas aisladas de Node. Comprobado: `typeof require === 'undefined'` en la vista |
| D17 | En el modo médico, el `CoordinadorSesion` vive en el **proceso principal**. La vista del médico le habla por IPC (`ipcElectron.ts`) y la del paciente por WebSocket (`websocket.ts`). El coordinador no cambió | El encargo pide el servidor en el proceso principal. Las vistas siguen usando `ConexionCliente` |
| D18 | `websocket.ts` corre en la **vista** (WebSocket del navegador) y no en el proceso principal del paciente | El mismo transporte servirá en la tableta Android (Capacitor, etapa E), que es una vista web |
| D19 | **Vinculación con código tecleado** de 10 caracteres (Crockford base32, 50 bits) que muestra el médico junto a su dirección IP. **No se usa QR** | El QR requiere la cámara de la laptop del paciente, que corresponde a la etapa C. El código se teclea en segundos y no depende de hardware |
| D20 | **Protección del canal sin certificados:** el código deriva una clave (PBKDF2-SHA-256, 210 000 iteraciones fijas en el código) y cada conexión deriva dos claves AES-256-GCM con HKDF y números aleatorios de ambos lados. Cada trama lleva contador: se rechaza si está alterada, repetida o fuera de orden. Quien no conoce el código no puede leer ni enviar | §5: proteger la conexión en la red local. TLS con certificado propio obligaría a distribuir y fijar certificados en cada laptop. WebCrypto existe igual en Electron, el navegador, Node y Android. Limitación: no es un PAKE; con la conversación capturada, un atacante podría intentar adivinar el código fuera de línea (50 bits × 210 000 iteraciones lo hace impracticable para una consulta) |
| D21 | **Una sola pareja:** el primer equipo que se vincula queda registrado (`dispositivoId` generado por la app al abrir, solo en memoria). Otro equipo se rechaza aunque tenga el código («pareja ocupada»). «Desvincular» libera la pareja y genera código nuevo | §4 fila B: limitar el acceso a la pareja de dispositivos. El identificador no se guarda en disco: si la app del paciente se cierra, el médico desvincula |
| D22 | El servidor **fija el rol**: por la red solo entra «paciente» (un saludo con rol «médico» se rechaza) y los comandos pasan por el coordinador como «paciente». Antes se revisa la forma de cada comando (`esComando`); uno malformado responde `comando-invalido` | El coordinador valida rol y sesión (D3); la red no puede elegir su rol |
| D23 | **Recuperación:** reintento automático (0,25 s → 3 s), latidos cada 2 s y red «muda» detectada a los 6 s por ambos lados. Al reconectar, el coordinador reenvía la instantánea. Lo que quedó sin respuesta se reenvía con el mismo `envioId` (el coordinador lo aplica una vez) durante 10 s; después responde «sin conexión» y el usuario puede reintentar (mismo `envioId`) | §4 fila B y RF-20: caída de red, recuperación y ausencia de duplicados, sin informar entregas que no ocurrieron |
| D24 | Ajuste en `useSesion` (no en las vistas): un acuse fallido por falta de conexión se repite con la siguiente instantánea; y si al reconectar ya no hay consulta, la vista muestra «Consulta finalizada» | Detectados en la prueba con dos procesos: sin el primero, un mensaje podía quedarse sin «Recibido» tras una caída; sin el segundo, el paciente no sabía que la consulta terminó si el aviso de cierre llegó durante la caída |
| D25 | El código sigue visible en el médico mientras la laptop vinculada esté desconectada, con la indicación de volver a escribirlo | Detectado en la prueba: al recargar la ventana del paciente hay que teclearlo otra vez. Solo sirve a la misma laptop (D21) |
| D26 | Puerto predeterminado **47100** (`--puerto=N` lo cambia). El médico muestra cada IPv4 con el nombre del adaptador (`192.168.1.20:47100 (Wi-Fi)`) | Facilita elegir la red correcta cuando hay adaptadores virtuales (WSL, VPN) |
| D27 | No se empaqueta un instalador (`.exe`/`.dmg`); se ejecuta desde el código con `npm ci` y los scripts `electron:*` | Evita firmar y distribuir binarios en la etapa académica. Queda como opción si la entrega lo requiere |

### 2.3 Decisiones de la etapa C, primera parte (16/11/2026)

| # | Decisión | Motivo |
|---|---|---|
| D28 | **Cámara con API web estándar** (`getUserMedia` solo video, 640×480 ideal, 30 fps, cámara frontal; `MediaRecorder` en WebM) detrás de `AdaptadorCamara` (`src/camara/`). Las vistas nunca llaman a `getUserMedia` | §5 del encargo: encapsular la cámara. Funciona igual en el navegador y en Electron; en la etapa E se cambia por la cámara de la tableta sin tocar la vista |
| D29 | La cámara **se enciende al pulsar «Captura en LSM» y se apaga** con «Listo», «Cancelar», al cerrar la sesión (la vista se desmonta) y al salir de la página (`pagehide`). Entre capturas está apagada. Si se cancela mientras se pide el permiso, la cámara se apaga en cuanto llega | RF-17 y RF-18: indicar cuándo está activa y liberarla. Así nunca queda encendida detrás de otra pantalla |
| D30 | **Clip solo en memoria**, máximo **15 s**: al llegar al límite se deja de grabar y se pide «Listo» o «Cancelar». Tras entregarlo al reconocedor no se guarda referencia; al cancelar se descarta sin entregarse | RF-18 y §5: capturas solo para interpretar el turno, nunca para entrenamiento ni evidencias. El límite acota la memoria |
| D31 | **Electron concede solo `media` con video** (nunca micrófono ni otros permisos) a la ventana propia con la página `file://`, y solo en los modos **paciente** y **demo**. El modo médico sigue sin permisos (`electron/permisos.ts`, con pruebas) | §5: vistas aisladas y permisos mínimos. La cámara de la entrega es la de la laptop del paciente |
| D32 | **Reconocedor simulado** (`ReconocedorSimulado`): no lee el clip; espera a que el operador elija «reconocido como X» (solo entradas del paciente) o «desconocido». Lanza un error si se crea fuera de `desarrollo`. En pantalla: recuadro ámbar «Simulador · no es reconocimiento real» y etiqueta «Resultado simulado» en la revisión | No hay modelo, vocabulario ni muestras autorizadas (§6 del encargo). Permite probar la interfaz sin presentar nada como reconocimiento real |
| D33 | **En el flujo de producto no hay reconocedor**: «Captura en LSM» aparece deshabilitado con «El reconocimiento en LSM todavía no está disponible». La interfaz `Reconocedor` queda lista para el modelo real (`reconocedorPorPolitica`) | El simulador nunca debe estar disponible en el producto |
| D34 | El reconocimiento corre **en el equipo del paciente** (el clip no viaja). Al médico solo llega el texto confirmado, como en el catálogo | Con el simulador no hace falta enviar el clip. Dónde correrá el modelo real (laptop del paciente o computadora del médico con una transferencia limitada) queda pendiente (§6) |
| D35 | El coordinador y el protocolo aceptan `via: 'camara'` con **todas** las validaciones de siempre (rol, sesión, tipo de entrada, recurso, intensidad, contenido revisado, envío único) y además exigen **una sola entrada** por la cámara; una vía desconocida se rechaza (`comando-invalido`) | RF-01 sin relajar ninguna regla. Un reconocimiento produce un candidato |
| D36 | La captura solo inicia con el catálogo **sin opciones elegidas**; la propuesta de la cámara **se confirma o se descarta** (sin «Cambiar selección»; RF-08 está propuesto). La intensidad del dolor puede indicarse en la revisión, como en el catálogo | Evita perder una selección. Igual revisión para ambas vías (RF-03) |
| D37 | **«Cancelar» también durante el procesamiento**: deja de esperar el resultado (aborta el reconocimiento) y vuelve al catálogo. Cualquier resultado tardío se descarta | RF-17 y RF-18: nada procesado tras cancelar aparece en pantalla |
| D38 | Si llega un **mensaje del médico durante la captura**, se anuncia arriba («Llegó un mensaje del médico: «…»») sin ocultar la cámara; se ve completo al terminar o cancelar | RF-17: la cámara activa siempre está a la vista. El texto se muestra, así que el acuse «Recibido» sigue siendo cierto (RF-20) |
| D39 | Recurso de prueba nuevo `REC-PRUEBA-SIS-CANCELAR` para el control «Cancelar» (en `catalogo/ficticio-dev.json`) | §6.1 pide recursos de los controles de cancelación |

### 2.4 Videos en LSM de fuentes externas (16/11/2026)

| # | Decisión | Motivo |
|---|---|---|
| D40 | **13 videos de Iztacala Enseña** conectados a sus recursos `REC-PRUEBA-*` (mismo ID), copiados a `public/recursos/` con el ID de la entrada: PAC-S-01, -03, -04, -05, -07, -08, PAC-R-03, MED-P-02 a MED-P-05, «No entendí» e intensidad del dolor. Siguen en **estado `prueba`**: en el flujo de producto continúan bloqueados | No hay revisión lingüística, permiso de uso ni aprobación registrada (§6.2); marcarlos `validado` sería inventar esa aprobación. Inventario completo y procedencia en [recursos-candidatos/](../recursos-candidatos/README.md) |
| D41 | No se conectaron: PAC-S-02 (no existe la seña «estómago»; «Dolor» solo cambia el sentido), MED-P-01 (no hay «desde cuándo»), MED-R-01 a MED-R-04 (requieren combinar varias señas y la app muestra un solo recurso), PAC-R-01/02 («Sí» y «No» no están en ninguna fuente), los avisos del sistema y «Confirmar/Descartar» | Solo se conectó un video si transmite el mensaje o su concepto sin cambiar el sentido |
| D42 | PAC-S-06 y MED-P-06 **siguen sin recurso a propósito** aunque hay candidatos («Mareo», «¿Vomitaste?») | Son las entradas que prueban el bloqueo en las pruebas automáticas y en el recorrido. Si se conectan, hay que mover ese papel a otra entrada |
| D43 | Un recurso de prueba **con archivo** se reproduce en modo desarrollo con la etiqueta ámbar «Prueba · LSM sin validar» (en tarjetas: «Sin validar»); el marcador sin archivo sigue como silueta «Prueba · no es LSM». Si el archivo falla: «Recurso dañado o faltante», igual que un validado | Distingue LSM real sin validar de un marcador que no es LSM, sin presentarlo como validado |
| D44 | Los videos se muestran con `object-fit: contain` (antes `cover`). Dentro de la tarjeta del paciente (un `<button>`) el video corre solo, en bucle y sin controles, y el clic elige la tarjeta | Los videos de Iztacala son verticales: `cover` recortaba las manos. Un `<video controls>` dentro de un botón no es válido y su clic también elegía la tarjeta |
| D45 | **11 respuestas breves nuevas del paciente** (17/11/2026), cada una con su video de Iztacala como recurso de prueba: tiempo para «¿Desde cuándo?» (PAC-R-04 a -08: desde hoy, ayer, antier, hace una semana, hace un mes), frecuencia (PAC-R-09 «A veces», PAC-R-10 «Nunca») y medicamentos para las preguntas de alergia y tratamiento (PAC-R-11 a -14: analgésico, antibiótico, jarabe, vitaminas). Van en el grupo provisional «Respuestas breves» (D7) | Ninguna fuente tiene «Sí» ni «No». Como el paciente puede elegir varias tarjetas, «Tengo fiebre.» + «Desde ayer.» llega en un solo mensaje sin cambiar código. Las de tiempo muestran solo la seña («Ayer», «Semana»), sin «desde»/«hace»: revisión lingüística pendiente. Decidir qué respuestas quedan en el Catálogo V1 sigue siendo §6.3 |
| D46 | **«Sí» (PAC-R-01) y «No» (PAC-R-02)** conectados con videos del canal de YouTube de Sol Lara (Lsm_by_Sol), propuestos por el equipo (17/11/2026). Recurso de prueba, como los demás; el video trae el logo «By Sol» y el subtítulo de la palabra, que no tapan las manos | Eran las dos respuestas breves sin video: no existen en Iztacala ni en Indiscapacidad. Es una **fuente individual**, no institucional: para validarlos hace falta el permiso de la autora y, con más razón, la revisión lingüística |

## 3. Requisitos cubiertos en la etapa A

Tabla de la etapa A: «comprobado» significa comprobado **en una sola computadora** (modo de una pantalla y dos
ventanas del mismo navegador). La cobertura de la etapa B está en §3.1.

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
| RF-01, RF-05, RF-17 Cámara | Solo lógica de estados con pruebas (captura, cancelar, procesando, no reconocido, resultados tardíos). Sin interfaz. **Etapa C: ver §3.2** | Etapa C |
| RNF-01 Significado | No evaluado. Requiere la rúbrica y 30 intercambios | Etapa D |

### 3.1 Cobertura de la etapa B (dos laptops)

| Requisito / encargo | Qué se implementó | Una computadora (dos procesos) | Dos laptops | Tableta Android |
|---|---|---|---|---|
| RF-20 Sesión compartida por la red | Servidor WebSocket en la laptop del médico; transporte WebSocket en la del paciente; identificadores de sesión, mensaje y envío conservados | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| §4 B: vinculación y pareja de dispositivos | Código, pareja única, rechazo de código incorrecto, de pareja ocupada y de rol «médico» por la red | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| §5: proteger la conexión | Canal cifrado y autenticado (D20) | **Probado** (pruebas automáticas) | Pendiente de probar en dos laptops | Pendiente en Android |
| §4 B: caída de red y recuperación | Reintento, latidos, instantánea al reconectar, reenvío sin duplicados | **Probado** con proxy (corte y red muda) | Pendiente (apagar Wi-Fi real) | Pendiente en Android |
| RF-07 Un solo envío por la red | `envioId` conservado en reintentos y reenvíos | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| RF-18, RF-20 Envío tardío tras cierre | Rechazado por el coordinador al reconectar (`sesion-cerrada`) | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| RF-20 Sin «Recibido» falso | «Recibido» solo con acuse; acuse repetido tras caída (D24) | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| RF-04, RF-15, RF-19 y resto del recorrido A por la red | Mismas vistas y reglas que en A | **Probado** | Pendiente de probar en dos laptops | Pendiente en Android |
| §5: modo de una pantalla | `electron:demo` sin red y `npm run dev` en el navegador | **Probado** | — | — |
| §4 B: registrar sistemas operativos | `npm run info-equipo` y «Este equipo» en la app | Registrado: Windows 10 Pro 10.0.19045 (x64) | Pendiente | — |

### 3.2 Cobertura de la etapa C, primera parte (cámara)

| Requisito | Qué se implementó | Una computadora | Laptop del paciente vinculada | Tableta Android |
|---|---|---|---|---|
| RF-17 Capturar | «Captura en LSM», «● Cámara activa» con tiempo, «Listo» (termina el clip, apaga la cámara y pide reconocimiento) y «Cancelar» (apaga, descarta sin reconocer, catálogo disponible) | **Probado** con una cámara del sistema en Electron (§4.7) y con cámara falsa | Pendiente de probar en dos laptops | Pendiente en Android |
| RF-01 Interpretar (reconocido) | Candidato pendiente de revisión con `via: 'camara'`; el coordinador lo acepta con las mismas reglas | **Probado** con el reconocedor **simulado**. Sin modelo real | Pendiente | Pendiente en Android |
| RF-05 Expresión desconocida | Aviso accesible (`role="alert"`) con recurso **de prueba**, «Intentar de nuevo» y «Elegir lo que sientes» | **Probado** con el simulador | Pendiente | Pendiente en Android |
| RF-03, RF-04, RF-07 para la cámara | Misma revisión, borrador solo en el paciente, envío único | **Probado** | Pendiente | Pendiente en Android |
| RF-18 Cámara y clips | Clip en memoria; cámara liberada al cancelar, al terminar la consulta (también durante captura y procesamiento) y al salir; resultados tardíos descartados; nada en disco | **Probado** (§4.7) | Pendiente | Pendiente en Android |
| §4 C: cámara denegada | Aviso con indicación de permisos; catálogo disponible | **Probado** en el navegador (cámara bloqueada) y con cámara falsa | Pendiente | Pendiente en Android |
| §4 C: modelo, vocabulario y resultados | **No hay modelo**. Interfaz `Reconocedor` lista | **Bloqueado**: faltan vocabulario y muestras autorizadas | — | — |

## 4. Pruebas ejecutadas

**Entorno etapa A (07/11/2026):** Windows 10 Pro 10.0.19045 · Node 22.15.0 · npm 10.9.2 · una sola computadora ·
navegador integrado de la app de escritorio de Claude (Chromium) a 1366×768.

**Entorno etapa B (16/11/2026):** la misma computadora (Windows 10 Pro 10.0.19045, x64, Node 22.15.0) · Electron 45.3.3
(Chromium 156.0.8078.100, Node 24.22.3) · dos procesos de Electron (médico con `--solo-local` y paciente) · proxy TCP
local (127.0.0.1:47101 → 47100) para simular corte y red muda · navegador integrado como tercer equipo. No se probó
con dos laptops, cámara ni Android. No se probó la escucha en la red local (`0.0.0.0`) porque abre el aviso del
firewall de Windows, que corresponde aceptar a la persona usuaria.

**Entorno etapa C (16/11/2026):** la misma computadora (Windows 10 Pro 10.0.19045, x64, Node 22.15.0) · Electron 45.3.3
en modo demostración manejado por el protocolo de depuración de Chromium · cámaras que ve Windows: **«Iriun Webcam»**
(controlador de cámara **virtual** de la app Iriun; la app del celular no estaba abierta, por lo que entrega una imagen
fija «Please start Iriun Webcam») y «GENERAL WEBCAM» (webcam USB física, **desconectada**: estado «Unknown») ·
permiso de Windows «Cámara» en «Allow» · navegador integrado de la app de Claude (bloquea la cámara).

### 4.1 Automáticas (`npm run check`)

Resultado (16/11/2026, etapa C): **127 de 127 pruebas pasan** (46 de la etapa A + 25 de la etapa B + 34 de la etapa C +
22 del catálogo editable, trabajo paralelo), sin errores de tipos y con las compilaciones correctas. Resultado de la
etapa B: 71 de 71. Las pruebas de red se repitieron 5 veces seguidas sin fallos.

| Archivo | Qué comprueba |
|---|---|
| `src/nucleo/coordinador.test.ts` (20) | Entrega exacta, envío único, contenido distinto rechazado, bloqueo sin recurso en ambos modos, bloqueo de recursos de prueba en producto, recurso validado aceptado sin sustitución, intensidad 1–10 solo en dolor, permisos por rol, «No entendí» vinculado y atendido, acuses del destinatario, cierre con rechazo de envíos tardíos y sesión nueva vacía, otra sesión rechazada |
| `src/nucleo/turnoPaciente.test.ts` (15) | Selección múltiple, intensidad opcional (también en la revisión, con `envioId` nuevo), modificar y descartar, seleccionar no envía, reintento con el mismo `envioId`, cámara: cancelar sin procesar, reconocido a revisión, no reconocido con reintento o catálogo, resultados de otra captura descartados; **etapa C**: cancelar durante el procesamiento, aviso tardío de otra captura ignorado, no inicia con opciones elegidas, propuesta de la cámara sin «modificar» y confirmada con `via: 'camara'` |
| `src/nucleo/busqueda.test.ts` (10) | Mayúsculas, tildes, coincidencia parcial, búsqueda vacía, «Sin resultados», ñ, política de recursos, integridad del catálogo |
| `src/modos/recorrido.test.tsx` (6) | Recorridos con las vistas reales (ver matriz) |
| `src/transporte/transporte.test.ts` (3) | Comandos entre ventanas, rol validado por canal, «sin conexión» sin coordinador, política estricta por defecto |
| `electron/servidor/servidorRed.test.ts` (14) | **Etapa B**, servidor y transporte WebSocket reales en 127.0.0.1: vinculación y rol fijado a «paciente», equipo ajeno con código incorrecto (rechazo sin reintento ni datos), pareja ocupada, rol «médico» rechazado, cliente sin cifrar desconectado, misma laptop vuelve a entrar, desvincular y código nuevo, reconexión con instantánea y sin «Recibido» falso, respuesta perdida sin duplicado, doble envío durante la caída = 1 mensaje, red muda detectada, envío tardío tras cierre rechazado, «sin conexión» sin servidor, argumentos de arranque |
| `src/transporte/canalSeguro.test.ts` (7) | **Etapa B**: código y normalización, cifrado en ambos sentidos, otro código no lee, trama alterada/repetida/fuera de orden rechazada, sentidos separados, dirección del WebSocket, forma de los comandos |
| `src/modos/modosRed.test.tsx` (4) | **Etapa B**: validación del formulario de vinculación, transporte IPC del médico, acuse repetido tras caída, cierre perdido durante la caída |
| `src/nucleo/coordinador.test.ts` (4 de las 20) | **Etapa C**: `via: 'camara'` aceptada y entregada una vez; recurso, intensidad, tipo, entrada, contenido, rol y sesión se validan igual; producto bloquea recursos de prueba; una sola entrada por la cámara y vía desconocida rechazada |
| `src/modos/captura.test.tsx` (10) | **Etapa C**, vistas reales + coordinador real + cámara falsa + simulador: inicio y «Listo» con caso reconocido y envío `cámara`; desconocido con reintento y catálogo; «Cancelar» sin reconocimiento; «Cancelar» durante el procesamiento con resultado tardío descartado; cámara denegada; cámara desconectada; cierre durante el procesamiento (cámara liberada, reconocimiento abortado, sesión nueva vacía); mensaje del médico durante la captura; no inicia con opciones elegidas; sin simulador en producto |
| `src/camara/camaraNavegador.test.ts` (9) | **Etapa C**, adaptador real con getUserMedia y MediaRecorder simulados: solo video, «activa», imagen conectada, «Listo» entrega el clip y apaga; «Cancelar» descarta; cancelar mientras termina; denegada / sin cámara / ocupada; sin `mediaDevices`; permiso concedido tras cancelar → se apaga; desconexión; límite de 15 s; nueva captura descarta la anterior |
| `src/reconocimiento/reconocedor.test.ts` (4) | **Etapa C**: simulador imposible en producto; vocabulario = entradas del paciente; espera la decisión del operador para la captura en curso; abortar descarta decisiones tardías |
| `electron/permisos.test.ts` (3) | **Etapa C**: cámara solo para la ventana propia `file://` en paciente y demo; negada al médico, a otro contenido, al micrófono y a cualquier otro permiso |

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

### 4.5 Matriz de la etapa B en una computadora (16/11/2026)

Dos procesos de Electron recién compilados (`npm run electron:medico-local` y `electron . --modo=paciente`); el paciente
se conecta a través del proxy para poder cortar la red. Se manejaron con el protocolo de depuración de Chromium y se
leyó el texto de cada pantalla. Capturas tomadas durante la prueba (no se versionan).

| Requisito | Caso | Resultado esperado | Resultado observado | Evidencia |
|---|---|---|---|---|
| §4 B | Equipo ajeno: código incorrecto | Rechazo, sin datos de la consulta | Paciente: «El código de vinculación no es correcto.» Médico: «Equipos rechazados: 1 (último: código incorrecto)» | Dos procesos + prueba automática |
| §4 B | Vinculación con el código en minúsculas y «O» por «0» | Conecta | «Conectado con la computadora del médico» / «Laptop del paciente conectada (equipo A5E396)» | Dos procesos |
| §4 B | Equipo ajeno con el código correcto (navegador como tercer equipo) | Rechazo por pareja ocupada | «La computadora del médico ya está vinculada con otro equipo.»; la laptop vinculada siguió conectada | Navegador + dos procesos + prueba automática |
| RF-04 | Revisión sin confirmar | El médico no ve el borrador | «Mensaje del paciente (0)» durante la revisión | Dos procesos |
| RF-07, RF-19 | Dolor 7/10 + fiebre con doble clic en «Confirmar» | Un mensaje con la intensidad | «Mensaje del paciente (1)», «7/10» solo en el dolor; el paciente vio «El médico lo recibió» | Dos procesos |
| §4 B, RF-20 | Corte de red; el médico envía «¿Tiene alergia…?» durante el corte | Ambos muestran la caída; el médico ve «Enviado», no «Recibido» | Paciente: «Se perdió la conexión… Reintentando…». Médico: «desconectada · esperando…» y «Enviado · esperando que se muestre» | Dos procesos + capturas |
| §4 B | Red restaurada | Reconecta solo y recibe lo pendiente | En menos de 4 s: paciente «Mensaje del médico» con la pregunta; médico «Se mostró en la pantalla del paciente» | Dos procesos |
| §4 B, RF-15 | Red muda (sin cierre) y «No entendí» durante la falla | Detección y una sola solicitud al reconectar | Ambos detectaron la caída entre 1 y 7 s; tras restaurar, un solo aviso «El paciente no entendió: «¿Tiene alergia…?»» | Dos procesos |
| RF-15 | «Elegir otra entrada» → «¿Desde cuándo…?» | Aviso atendido | «respondida con «¿Desde cuándo tiene este síntoma?»», 0 avisos pendientes | Dos procesos |
| RF-18, RF-20 | Corte; el paciente confirma «Tos»; el médico termina la consulta; red restaurada | Envío tardío rechazado | El médico quedó en «Consulta finalizada» sin «Tos»; la pantalla del paciente se vació | Dos procesos + prueba automática |
| RF-18 | Cierre durante la caída (tras D24) | El paciente sabe que terminó | «Consulta finalizada · Se borraron los mensajes de esta consulta en esta pantalla.» | Dos procesos |
| RF-18 | Nueva consulta | Las dos vistas vacías | «Conversación (0)» y «Mensaje del paciente (0)» | Dos procesos |
| §4 B | Recarga de la ventana del paciente | El médico muestra el código; la misma laptop vuelve a entrar | «Si la laptop del paciente se reinició o recargó, vuelve a escribir 127.0.0.1:47100 y el código…»; reconectó | Dos procesos |
| §5 | Vista aislada | Sin Node en la vista | `typeof require` = `undefined`, `isSecureContext` = `true`, solo `window.techstar` | Dos procesos |
| §5 | Modo demostración en Electron | Recorrido en una pantalla sin red | Mensaje confirmado; ningún puerto 47100 abierto | Proceso demo |
| §5 | `npm run dev` y modo demo en el navegador | Siguen funcionando | Demo cargada sin errores de consola; pruebas de recorrido de la etapa A conformes | Navegador + pruebas |
| RF-18 | Archivos de Electron tras cerrar | Sin contenido de la consulta | Ningún archivo contiene textos, códigos ni identificadores de sesión (búsqueda en `%APPDATA%\techstar-lsm-consulta\`) | §5 |

### 4.6 Prueba con dos laptops reales

**Pendiente de probar en dos laptops.** La ejecutará el equipo siguiendo [PRUEBA_DOS_LAPTOPS.md](PRUEBA_DOS_LAPTOPS.md)
(casos B1–B15) y copiará aquí la tabla de registro con los sistemas operativos de ambas laptops.

| Laptop | Sistema operativo | Modelo | Red | Fecha |
|---|---|---|---|---|
| M (médico) | *pendiente* | | | |
| P (paciente) | *pendiente* | | | |

### 4.7 Matriz de la etapa C con hardware real (16/11/2026)

Lo que acredita cada prueba: con **Electron** se ejercitó la cadena real (permiso de Electron → `getUserMedia` →
controlador de cámara de Windows → `MediaRecorder`) con la cámara virtual «Iriun Webcam», que entrega una imagen fija.
**No se probó una webcam física** (la USB estaba desconectada) ni una persona señando: eso no cambia la lógica, pero
queda pendiente para acreditar formato, iluminación y encuadre en la laptop del paciente. Con el **navegador** se probó
el permiso denegado real. El reconocimiento fue **siempre simulado**. Capturas de pantalla tomadas durante la prueba,
fuera del repositorio (no se versionan).

| Requisito | Caso | Resultado esperado | Resultado observado | Evidencia |
|---|---|---|---|---|
| RF-17 | «Captura en LSM» en `electron:demo` | Cámara encendida e indicada | «● Cámara activa 0:03 / 0:15»; pista «Iriun Webcam» `live`, 640×480 a 30 fps, **0 pistas de audio**; video reproduciéndose | Electron + captura de pantalla |
| RF-17 | «Listo» | Cámara apagada y reconocimiento pedido | Pista `ended`; «Interpretando tu seña… La cámara ya está apagada.»; recuadro del simulador visible | Electron |
| RF-01, RF-04 | Simulador «reconocido como Fiebre» | Candidato solo en el paciente; al confirmar llega una vez con vía cámara | Revisión «Esto es lo que entendimos de tu seña» + «Resultado simulado»; el médico no lo veía; tras confirmar: «Paciente · confirmado 01:17 a.m. · cámara — Tengo fiebre.» | Electron |
| RF-17 | «Cancelar» durante la captura | Cámara apagada, sin reconocimiento, catálogo disponible | Pista `ended`, sin video ni simulador, catálogo visible, botón de captura habilitado | Electron |
| RF-05 | Simulador «desconocido» | Aviso con recurso, reintento o catálogo | «No reconocimos tu seña… No se envió nada.» con `REC-PRUEBA-SIS-DESCONOCIDA`; «Intentar de nuevo» volvió a encender la cámara (`live`) | Electron + captura |
| RF-17 | Seguir grabando 15 s | Deja de grabar y pide «Listo» o «Cancelar» | «Cámara activa 0:15 / 0:15» y «Llegaste al máximo de 15 segundos. Pulsa «Listo» o «Cancelar».» | Electron + captura |
| RF-18 | El paciente termina la consulta **durante la captura** | Cámara liberada | Pista `ended`, 0 videos, «Consulta finalizada» | Electron |
| RF-18 | El médico termina la consulta **durante el procesamiento** | Reconocimiento abortado, sin resultado tardío | Simulador y «Interpretando» desaparecen; «Consulta finalizada» | Electron + prueba automática |
| RF-18 | Nueva consulta | Empieza vacía | «Conversación (0)», médico «Todavía no hay mensajes», sin revisión pendiente | Electron |
| RF-18 | Cerrar la ventana con la cámara encendida | La app termina y suelta la cámara | Electron salió con código 0; ningún proceso `electron` vivo | Electron |
| RF-18 | Almacenamiento tras las capturas | Nada guardado | `localStorage` 0, `sessionStorage` 0, IndexedDB 0; en `%APPDATA%\techstar-lsm-consulta\demo\` (64 archivos técnicos) **ningún** archivo con cabecera WebM ni con textos de la consulta | Electron + búsqueda en disco |
| §4 C | Cámara denegada (navegador) | Aviso y catálogo disponible | «No hay permiso para usar la cámara. Para usarla, permite la cámara en el navegador o en Windows…»; catálogo usable | Navegador integrado + captura |
| Diseño | Panel de captura a media pantalla (modo demo, 1366×860) | «Cancelar» y «Listo» visibles sin desplazarse | Al principio quedaban debajo del video; se limitó la altura del video y se pusieron lado a lado. Comprobado visible después | Electron + capturas |

## 5. Inventario de datos temporales (RF-18)

| Dónde | Qué guarda | Cuándo se borra |
|---|---|---|
| Memoria del coordinador (ventana del médico) | Mensajes confirmados, avisos y `envioId` | Al terminar la consulta. Solo quedan los identificadores de sesiones cerradas (sin contenido) para rechazar envíos tardíos, y se pierden al cerrar la ventana |
| Memoria de cada vista | Última instantánea y borrador del paciente | Al cambiar de sesión, porque la vista se desmonta por clave de sesión |
| Canal entre ventanas (BroadcastChannel) | Mensajes en tránsito, solo en memoria | No persiste |
| Proceso principal de Electron (laptop del médico) | Coordinador (como arriba), código y sal de vinculación, identificador de la laptop vinculada | Al cerrar la app. Los mensajes, al terminar la consulta |
| Transporte WebSocket (laptop del paciente) | Última instantánea, solicitudes pendientes (máx. 10 s) y clave derivada del código | Al desconectar o cerrar la app |
| Red local | Tramas cifradas; en claro solo el saludo (números aleatorios, versión) y el motivo de un rechazo | No persiste |
| Disco de Electron (`%APPDATA%\techstar-lsm-consulta\<modo>\`) | Cachés técnicas de Chromium (GPU, shaders, `Local State`, bases vacías). La vista usa una sesión **en memoria** | Persisten. Revisadas el 16/11/2026 tras una consulta completa: **ningún archivo contiene mensajes, códigos ni identificadores de sesión**. Se pueden borrar |
| Disco, `localStorage`, `IndexedDB`, registros | **Nada** de la consulta. El código no usa almacenamiento ni `console.log`; el proceso principal no registra contenido | — |
| Memoria de la vista del paciente: clip de la cámara (etapa C) | Trozos `Blob` del clip en curso (máx. 15 s, solo video) | Al cancelar o liberar se descartan. Con «Listo» se arma un `Blob`, se entrega al reconocedor del mismo equipo y no se guarda referencia. Al cerrar la sesión o la app, la cámara se libera. Comprobado en disco el 16/11/2026: sin archivos WebM (§4.7) |
| Reconocedor simulado | Solo el identificador de la captura pendiente (no lee el clip) | Al decidir, al cancelar o al cerrar la sesión |

Pendiente: revisar los temporales en las dos laptops y, cuando exista, los del modelo real.

## 6. Materiales y decisiones pendientes

- **Catálogo V1** aprobado: entradas del paciente y del médico, y qué puede responder el paciente a cada pregunta (§6.3).
- **Recursos en LSM validados** para cada entrada y para los controles del sistema. Ver [RECURSOS_LSM.md](RECURSOS_LSM.md).
  Hay 26 videos conectados como recursos de prueba: 24 de Iztacala Enseña y «Sí»/«No» de Sol Lara (D40, D45, D46). Para validarlos falta: **permiso de uso por
  escrito** de la fuente, **revisión lingüística** (la mayoría muestra solo el concepto, p. ej. «Fiebre» para «Tengo
  fiebre»), aprobación entrada–recurso y probar la reproducción en **Electron** y en **Android**. Faltan por grabar o
  conseguir «estómago» y los avisos del sistema (D41).
- Validar los iconos de apoyo visual con personas Sordas (o sustituirlos por las ilustraciones del prototipo).
- Rúbrica de RNF-01 y protocolo de RNF-02.
- Decidir si se mantiene el grupo «Respuestas breves» (D7).
- **Etapa C (reconocimiento real):** elegir el **modelo** (p. ej. MediaPipe con características de manos, rostro y
  cuerpo según las expresiones) y dónde corre (laptop del paciente o computadora del médico con transferencia
  limitada, D34); acordar el **vocabulario** y las variantes con personas usuarias de LSM y apoyo lingüístico, y
  registrar por separado las entradas del catálogo y las que cubre el reconocedor (§6.3 del encargo); conseguir
  **muestras autorizadas** para entrenar y evaluar, separadas por persona o sesión, con movimientos cotidianos y
  expresiones fuera de vocabulario (§6.4); acordar el criterio de reconocimiento y registrar resultados por expresión,
  falsas aceptaciones y tiempo de respuesta (§6.5). Hasta entonces solo hay simulador.
- **Etapa C (cámara):** repetir §4.7 con una **webcam física** (o la app Iriun abierta) y una persona señando, y en la
  laptop del paciente vinculada por Wi-Fi (`electron:paciente`). Recursos en LSM validados para «Captura en LSM»,
  «Cancelar», los avisos de cámara y «No reconocimos tu seña».
- **Etapa B:** ejecutar la prueba con dos laptops (§4.6) y registrar sus sistemas operativos. Comprobar la escucha en la
  red local con el aviso del firewall y en la red Wi-Fi que se usará en la entrega.
- Decidir si se necesita un instalador empaquetado para la entrega (D27).

## 7. Registro de pruebas pendientes en Android (etapa E)

Todas las de RF-01, RF-03, RF-04, RF-05, RF-07, RF-13, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20 y RI-01 en la tableta:
captura, permisos y ciclo de vida de la cámara, catálogo táctil, envío, aclaración, reconexión y eliminación de datos.
De la etapa C, en la tableta: implementación de `AdaptadorCamara` con la cámara frontal (Capacitor), permiso de cámara
de Android, liberar la cámara al pasar a segundo plano o bloquear la pantalla, formato que acepte el reconocedor y
casos de §4.7.
De la etapa B, en la tableta: vinculación con el código, WebCrypto en la vista de Capacitor, conexión `ws://` en la red
local (permisos de tráfico sin TLS en Android), reconexión al suspender y reanudar la app o al cambiar de red, y
rechazo de un segundo equipo.

## 8. Explicación de los módulos por el integrante

*Pendiente.* El encargo (§7) pide que el integrante explique cada módulo con sus palabras y que esa explicación se
revise contra el código. Ver la guía breve en el README.

## 9. Próxima tarea

1. **Cerrar la etapa B:** ejecutar [PRUEBA_DOS_LAPTOPS.md](PRUEBA_DOS_LAPTOPS.md) con dos laptops reales, registrar sus
   sistemas operativos y copiar los resultados a §4.6. Si algo falla, anotarlo como incidente con el caso (B1–B15).
2. **Etapa C, segunda parte (reconocimiento real):** con el vocabulario acordado y las muestras autorizadas (§6),
   implementar un `Reconocedor` real en `src/reconocimiento/`, decidir dónde corre (D34) y evaluarlo. Repetir §4.7 con
   una webcam física y en la laptop del paciente vinculada. La captura, los permisos, el ciclo de vida de la cámara y la
   revisión ya están hechos y probados con el simulador.
