# Estado actual · TechStar (LSM Consulta)

**Fecha:** 16/11/2026 · **Etapa:** B (conectar dos laptops) · **Estado de la etapa:** implementada y **probada en una
computadora** con dos procesos de Electron y un proxy que simula la red. **Pendiente de probar en dos laptops** reales
(protocolo en [PRUEBA_DOS_LAPTOPS.md](PRUEBA_DOS_LAPTOPS.md)). La etapa A sigue vigente (§2 a §4.4). Las etapas C a E
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
| PS-Captura señas/opciones | Captura con cámara | Indicador «Captura en LSM · etapa C» deshabilitado | La cámara corresponde a la etapa C |
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
| RF-01, RF-05, RF-17 Cámara | Solo lógica de estados con pruebas (captura, cancelar, procesando, no reconocido, resultados tardíos). Sin interfaz | Etapa C |
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

## 4. Pruebas ejecutadas

**Entorno etapa A (07/11/2026):** Windows 10 Pro 10.0.19045 · Node 22.15.0 · npm 10.9.2 · una sola computadora ·
navegador integrado de la app de escritorio de Claude (Chromium) a 1366×768.

**Entorno etapa B (16/11/2026):** la misma computadora (Windows 10 Pro 10.0.19045, x64, Node 22.15.0) · Electron 45.3.3
(Chromium 156.0.8078.100, Node 24.22.3) · dos procesos de Electron (médico con `--solo-local` y paciente) · proxy TCP
local (127.0.0.1:47101 → 47100) para simular corte y red muda · navegador integrado como tercer equipo. No se probó
con dos laptops, cámara ni Android. No se probó la escucha en la red local (`0.0.0.0`) porque abre el aviso del
firewall de Windows, que corresponde aceptar a la persona usuaria.

### 4.1 Automáticas (`npm run check`)

Resultado (16/11/2026): **71 de 71 pruebas pasan** (46 de la etapa A + 25 de la etapa B), sin errores de tipos
(vistas y proceso principal) y con las compilaciones de la vista y de Electron correctas. Las pruebas de red se
repitieron 5 veces seguidas sin fallos.

| Archivo | Qué comprueba |
|---|---|
| `src/nucleo/coordinador.test.ts` (16) | Entrega exacta, envío único, contenido distinto rechazado, bloqueo sin recurso en ambos modos, bloqueo de recursos de prueba en producto, recurso validado aceptado sin sustitución, intensidad 1–10 solo en dolor, permisos por rol, «No entendí» vinculado y atendido, acuses del destinatario, cierre con rechazo de envíos tardíos y sesión nueva vacía, otra sesión rechazada |
| `src/nucleo/turnoPaciente.test.ts` (11) | Selección múltiple, intensidad opcional (también en la revisión, con `envioId` nuevo), modificar y descartar, seleccionar no envía, reintento con el mismo `envioId`, cámara: cancelar sin procesar, reconocido a revisión, no reconocido con reintento o catálogo, resultados de otra captura descartados |
| `src/nucleo/busqueda.test.ts` (10) | Mayúsculas, tildes, coincidencia parcial, búsqueda vacía, «Sin resultados», ñ, política de recursos, integridad del catálogo |
| `src/modos/recorrido.test.tsx` (6) | Recorridos con las vistas reales (ver matriz) |
| `src/transporte/transporte.test.ts` (3) | Comandos entre ventanas, rol validado por canal, «sin conexión» sin coordinador, política estricta por defecto |
| `electron/servidor/servidorRed.test.ts` (14) | **Etapa B**, servidor y transporte WebSocket reales en 127.0.0.1: vinculación y rol fijado a «paciente», equipo ajeno con código incorrecto (rechazo sin reintento ni datos), pareja ocupada, rol «médico» rechazado, cliente sin cifrar desconectado, misma laptop vuelve a entrar, desvincular y código nuevo, reconexión con instantánea y sin «Recibido» falso, respuesta perdida sin duplicado, doble envío durante la caída = 1 mensaje, red muda detectada, envío tardío tras cierre rechazado, «sin conexión» sin servidor, argumentos de arranque |
| `src/transporte/canalSeguro.test.ts` (7) | **Etapa B**: código y normalización, cifrado en ambos sentidos, otro código no lee, trama alterada/repetida/fuera de orden rechazada, sentidos separados, dirección del WebSocket, forma de los comandos |
| `src/modos/modosRed.test.tsx` (4) | **Etapa B**: validación del formulario de vinculación, transporte IPC del médico, acuse repetido tras caída, cierre perdido durante la caída |

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

Pendiente: revisar los temporales en las dos laptops y los clips de la cámara (etapa C).

## 6. Materiales y decisiones pendientes

- **Catálogo V1** aprobado: entradas del paciente y del médico, y qué puede responder el paciente a cada pregunta (§6.3).
- **Recursos en LSM validados** para cada entrada y para los controles del sistema. Ver [RECURSOS_LSM.md](RECURSOS_LSM.md).
- Validar los iconos de apoyo visual con personas Sordas (o sustituirlos por las ilustraciones del prototipo).
- Rúbrica de RNF-01 y protocolo de RNF-02.
- Decidir si se mantiene el grupo «Respuestas breves» (D7).
- Vocabulario y muestras autorizadas para el reconocedor (preparar en paralelo, §4 etapa C).
- **Etapa B:** ejecutar la prueba con dos laptops (§4.6) y registrar sus sistemas operativos. Comprobar la escucha en la
  red local con el aviso del firewall y en la red Wi-Fi que se usará en la entrega.
- Decidir si se necesita un instalador empaquetado para la entrega (D27).

## 7. Registro de pruebas pendientes en Android (etapa E)

Todas las de RF-01, RF-03, RF-04, RF-05, RF-07, RF-13, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20 y RI-01 en la tableta:
captura, permisos y ciclo de vida de la cámara, catálogo táctil, envío, aclaración, reconexión y eliminación de datos.
De la etapa B, en la tableta: vinculación con el código, WebCrypto en la vista de Capacitor, conexión `ws://` en la red
local (permisos de tráfico sin TLS en Android), reconexión al suspender y reanudar la app o al cambiar de red, y
rechazo de un segundo equipo.

## 8. Explicación de los módulos por el integrante

*Pendiente.* El encargo (§7) pide que el integrante explique cada módulo con sus palabras y que esa explicación se
revise contra el código. Ver la guía breve en el README.

## 9. Próxima tarea

1. **Cerrar la etapa B:** ejecutar [PRUEBA_DOS_LAPTOPS.md](PRUEBA_DOS_LAPTOPS.md) con dos laptops reales, registrar sus
   sistemas operativos y copiar los resultados a §4.6. Si algo falla, anotarlo como incidente con el caso (B1–B15).
2. **Etapa C (cámara y reconocimiento limitado):** implementar el adaptador de cámara (`src/camara/adaptador.ts`) en
   la laptop del paciente, conceder solo el permiso de cámara a la ventana del paciente en `electron/main.ts`
   (hoy todos se niegan), conectar los estados de captura ya probados en `turnoPaciente.ts` y decidir dónde se procesa
   el clip (en la laptop del paciente o enviado de forma limitada al médico, sin mostrarlo). Preparar vocabulario y
   muestras autorizadas.
