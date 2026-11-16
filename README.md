# LSM Consulta · TechStar

Apoyo a la comunicación entre una persona Sorda usuaria de LSM y el personal médico durante una consulta general.
MVP académico de *Aseguramiento de la Calidad del Software* (2026-2).

**Estado:** etapa B implementada: app de escritorio (Electron) con modos médico, paciente y demostración, y
conexión entre dos laptops por Wi-Fi local con vinculación, canal cifrado y recuperación ante caídas de red.
Probada en **una** computadora con dos procesos; la prueba con **dos laptops reales** está pendiente
([Docs/PRUEBA_DOS_LAPTOPS.md](Docs/PRUEBA_DOS_LAPTOPS.md)). Detalle, pruebas y pendientes en
[Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md).

> **Catálogo ficticio y recursos de prueba.** Ningún recurso está validado en LSM. Los marcadores con la etiqueta
> ámbar «Prueba · no es LSM» (silueta neutra en lugar de un video) solo sirven para probar la interfaz. Inventario en
> [Docs/RECURSOS_LSM.md](Docs/RECURSOS_LSM.md).

## Requisitos

- Node.js **22.13 o superior** (probado con 22.15.0) y npm.
- Para la app de escritorio: Windows 10/11, macOS o Linux. `npm ci` descarga **Electron 45.3.3** (Chromium 156,
  Node 24.22 interno; exige Node ≥ 22.12 para instalarse).
- Para el modo navegador: Chrome, Edge o Firefox.

## Instalación

```bash
npm ci
```

(`npm ci` respeta las versiones exactas de `package-lock.json`; `npm install` también sirve.)

## Arranque

**App de escritorio (etapa B, dos laptops).** En la laptop del médico:

```bash
npm run electron:medico
```

En la laptop del paciente:

```bash
npm run electron:paciente
```

**Respaldo en una pantalla (sin red):**

```bash
npm run electron:demo
```

**En el navegador (como en la etapa A):**

```bash
npm run dev
```

Abrir **http://127.0.0.1:5173**. El servidor de desarrollo solo escucha en esta computadora.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run electron:medico` | Compila y abre la app en modo **médico**: coordinador + servidor de red en el puerto 47100 |
| `npm run electron:paciente` | Compila y abre la app en modo **paciente**: pantalla para vincularse con el médico |
| `npm run electron:demo` | Compila y abre las dos interfaces en una pantalla (sin red). **Respaldo** |
| `npm run electron:medico-local` | Médico escuchando solo en 127.0.0.1 (pruebas con dos procesos en una computadora) |
| `npm run info-equipo` | Muestra sistema operativo, arquitectura y versión de Node (para registrar las laptops) |
| `npm run dev` | Servidor de desarrollo en http://127.0.0.1:5173 (modo navegador) |
| `npm test` | Ejecuta las pruebas automáticas (71) |
| `npm run typecheck` | Revisa los tipos de TypeScript (vistas y proceso principal de Electron) |
| `npm run build` | Revisa los tipos y genera la versión de producción en `dist/` |
| `npm run build:electron` | Genera `dist/` y el proceso principal y preload de Electron en `dist-electron/` |
| `npm run preview` | Sirve `dist/` en http://127.0.0.1:4173 |
| `npm run check` | Tipos, pruebas y compilaciones (lo que hay que correr antes de entregar) |

Opciones de la app de escritorio (después de `--`, p. ej. `npm run electron:medico -- --puerto=47200`):
`--recursos=desarrollo|producto` (sin la opción o con otro valor: producto), `--puerto=N` (médico; el paciente lo
escribe junto a la IP), `--solo-local`. Los scripts `electron:medico` y `electron:demo` ya usan `--recursos=desarrollo`
porque todavía no hay recursos validados.

## Cómo vincular las dos laptops

1. **Laptop del médico:** `npm run electron:medico`. La primera vez, Windows pregunta por el firewall: permitir solo
   en **redes privadas** (macOS: «Permitir» conexiones entrantes). La franja superior muestra la **Dirección**
   (`192.168.1.20:47100 (Wi-Fi)`) y el **Código** de 10 caracteres (`7KQ2M-9XD4T`).
2. **Laptop del paciente:** `npm run electron:paciente`. El personal escribe la dirección (basta con la IP) y el
   código y pulsa «Vincular». No distingue mayúsculas y acepta «O» por «0».
3. Listo: el paciente ve «Conectado con la computadora del médico» y el médico «Laptop del paciente conectada».
   Ya se puede seguir el guion de demostración.

- **Una sola pareja:** tras vincularse, cualquier otro equipo se rechaza aunque conozca el código. Un equipo con otro
  código también se rechaza. El médico ve «Equipos rechazados: N».
- **Caída de red:** las dos apps reintentan solas. Al volver, el paciente recibe el estado actual de la consulta; lo que
  quedó a medio enviar se reenvía sin duplicarse. Si pasan más de 10 s, el envío avisa «Sin conexión…» y se puede
  confirmar otra vez (tampoco se duplica).
- **Si la ventana del paciente se recarga:** recargar (Ctrl+R) conserva la identidad del equipo: basta con escribir otra
  vez dirección y código (el médico los muestra mientras el paciente está desconectado). Si se **cerró** la app del
  paciente, el médico pulsa «Desvincular» para generar un código nuevo.
- **Red Wi-Fi:** las redes de la universidad suelen aislar los equipos. Si no conecta, usar el punto de acceso de un
  celular. Protocolo completo y registro de resultados: [Docs/PRUEBA_DOS_LAPTOPS.md](Docs/PRUEBA_DOS_LAPTOPS.md).

## Modos de inicio

En la pantalla de inicio se elige la política de recursos y el modo:

| Modo | App de escritorio | Navegador | Uso |
|---|---|---|---|
| Demostración en una pantalla | `npm run electron:demo` | `?modo=demo&recursos=desarrollo` | Las dos interfaces lado a lado, sin red. **Respaldo de la entrega** |
| Médico | `npm run electron:medico` | `?modo=medico&recursos=desarrollo` | Aloja el coordinador. En Electron lo ofrece a la red local; en el navegador, a otra pestaña |
| Paciente | `npm run electron:paciente` | `?modo=paciente` | En Electron se vincula por Wi-Fi con la laptop del médico; en el navegador, con la pestaña del médico |
| Paciente por red (navegador) | — | `?modo=paciente-red` | Página del paciente en el navegador que se vincula con la app del médico (pruebas) |

En el navegador, la pantalla de inicio permite elegir política de recursos y modo.

`recursos=desarrollo` permite recursos de prueba. `recursos=producto` (o cualquier otro valor) solo envía entradas
con recurso validado; como hoy no hay ninguno, todo queda bloqueado, que es lo esperado.

## Guion de demostración (5 minutos)

1. `npm run dev` → abrir http://127.0.0.1:5173 → «Modo desarrollo» → **Demostración en una pantalla**.
2. **Médico:** «Iniciar consulta». **Paciente:** aparece «Alcance de este apoyo» → «Entendido, continuar».
3. **Paciente:** «Elegir» en «Dolor de cabeza» y en «Fiebre» → «Revisar selección (2)». En la revisión, en
   «¿Cuánto te duele?», elegir **7** (empieza en «–/10»: sin valor por defecto).
   *Comprobar:* el médico todavía no ve nada.
4. **Paciente:** «Cambiar selección» para volver con la selección intacta, y «Revisar selección» otra vez. Después
   «Confirmar mensaje» (prueben un doble clic: llega un solo mensaje).
5. **Médico:** buscar `ALERGIA` → «Mostrar al paciente» en «¿Tiene alergia a algún medicamento?» → revisar texto y
   recurso → «Enviar al paciente».
6. **Paciente:** aparece «Mensaje del médico»; pulsar **«No entendí»**. **Médico:** aparece el aviso rosa con ese mismo
   mensaje → «Elegir otra entrada» → buscar `desde` → enviar. El aviso queda marcado como respondido.
   **Paciente:** «Responder» vuelve al catálogo; «Conversación» muestra el historial.
7. **Entrada sin recurso:** médico, buscar `vomito` → «Enviar» bloqueado. Paciente, «Mareo» (sin recurso) →
   «Revisar selección» → «Confirmar» bloqueado → «Descartar mensaje».
8. **Sin resultados:** médico, buscar `cirugía`.
9. **Cierre:** «Finalizar consulta» → «Terminar y borrar». Ambas pantallas se vacían → «Nueva consulta» empieza vacía.
10. Opcional: volver al inicio con «Flujo de producto» y comprobar que todo envío queda bloqueado.

**Dos laptops:** vincularlas (sección anterior) y repetir los pasos, cada participante en su laptop. **Dos procesos en
una computadora:** `npm run electron:medico-local` y `npm run electron:paciente` con la dirección `127.0.0.1`.
**Dos pestañas del navegador:** modo **Médico** y luego **Paciente** en otra pestaña (como en la etapa A).

## Diseño

El estilo sigue el prototipo Figma «Pinkies», página V2: fondo crema `#FCF9F2`, verdes `#364C3F`/`#395443`,
salvia `#AEB6A9`/`#DEDFD6`, durazno para el mensaje a enviar, rojo `#B84A4B` para «Finalizar consulta»;
tipografías **Cal Sans** (títulos) e **Inter** (texto), empaquetadas localmente (funcionan sin internet).
Los apoyos visuales son iconos de línea de [Lucide](https://lucide.dev) (licencia ISC), provisionales y sin validar.
Las diferencias intencionales con Figma (por requisitos del SRS) están en
[Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md) §2.1. El color ámbar no es de Figma: marca los recursos de prueba
y el modo desarrollo.

## Cómo está organizado

```
electron/        App de escritorio (proceso principal de Electron, Node)
  main.ts          Modos, ventana aislada, permisos, IPC con la vista del médico
  preload.ts       Puente mínimo y aislado hacia la vista (window.techstar)
  argumentos.ts    Lee --modo, --recursos, --puerto, --solo-local
  servidor/        Servidor WebSocket que envuelve al coordinador (laptop del médico)
src/
  nucleo/        Reglas de la sesión (TypeScript puro, sin React ni red)
  catalogo/      Catálogo ficticio y textos del aviso de alcance
  transporte/    Cómo viajan los mensajes entre vistas y coordinador
  cliente/       Conecta una vista con la sesión (hooks de React)
  camara/        Interfaz del adaptador de cámara (etapa C)
  vistas/        Pantallas: paciente, médico y piezas comunes
  modos/         Modos de inicio (demostración, médico, paciente y los de red) y pantalla de inicio
Docs/            Documentos de referencia (SRS, lista), estado actual, inventario de recursos y prueba con dos laptops
```

### Qué hace cada módulo, en palabras sencillas

- **`nucleo/coordinador.ts`**: el «árbitro» de la consulta. Vive en la computadora del médico. Solo acepta
  mensajes confirmados. Revisa que vengan de la sesión correcta y del rol correcto, que tengan recurso permitido y que el
  texto sea el que el paciente revisó. Aplica cada envío una sola vez y borra todo al cerrar.
- **`nucleo/turnoPaciente.ts`**: los pasos del paciente (elegir → revisar → enviar). Es el borrador, que nunca sale de
  la pantalla del paciente hasta confirmar. Ya incluye los pasos de cámara (capturar, cancelar, procesar) para la etapa C.
- **`nucleo/recursos.ts`**: decide si un recurso en LSM se puede mostrar y enviar. Validado, sí. De prueba, solo en modo
  desarrollo. Sin recurso, nunca. Jamás pone otro recurso en su lugar.
- **`nucleo/busqueda.ts`**: busca en el catálogo por parte del término, sin importar mayúsculas ni tildes.
- **`nucleo/mensajes.ts`**: arma el texto en español de cada elemento («… Intensidad del dolor: 7 de 10.»), igual en las
  dos pantallas.
- **`nucleo/tipos.ts`**: la forma de los datos (entradas, mensajes, avisos, comandos) que comparten todas las partes.
- **`catalogo/catalogoFicticio.ts`**: las entradas de prueba y sus recursos de prueba. Aquí se cambiarán por el
  Catálogo V1 aprobado.
- **`transporte/`**: el «cartero». Todos cumplen la misma interfaz (`tipos.ts`), por eso las vistas no cambian.
  `local.ts` lleva mensajes dentro de la misma ventana (modo de una pantalla). `broadcastChannel.ts` los lleva entre
  dos ventanas del mismo navegador. `websocket.ts` los lleva de la laptop del paciente a la del médico por Wi-Fi:
  se vincula con el código, reintenta si cae la red y reenvía lo pendiente sin duplicar. `ipcElectron.ts` comunica la
  vista del médico con el coordinador del proceso principal. `canalSeguro.ts` cifra y autentica cada mensaje con una
  clave que sale del código de vinculación. `protocoloRed.ts` define los mensajes de red y revisa su forma.
  `puente.ts` describe lo único que la app de escritorio expone a las vistas.
- **`electron/servidor/servidorRed.ts`**: la «portería» de la laptop del médico. Solo deja pasar a la laptop que
  conoce el código, y a una sola; le fija el rol «paciente», entrega sus comandos al coordinador y le reenvía los
  cambios. Si la conexión se queda callada, la cierra y espera a que vuelva.
- **`electron/main.ts`** y **`electron/preload.ts`**: arrancan la app en el modo pedido con la vista aislada de Node
  (sin `require`, con `contextIsolation` y `sandbox`), sin permisos de cámara ni navegación a otras páginas.
- **`cliente/useSesion.ts`**: conecta una pantalla con el cartero, guarda en memoria lo último que llegó y avisa
  «recibido» cuando un mensaje se mostró.
- **`camara/adaptador.ts`**: el contrato que cumplirá la cámara real (iniciar, «Listo», cancelar, liberar). Hoy dice «no
  disponible».
- **`vistas/paciente/`**: catálogo paginado con tarjetas «Elegir/Elegido», revisión con «¿Cuánto te duele?»,
  confirmar o descartar, pantalla «Mensaje del médico» con «No entendí» y la conversación.
- **`vistas/medico/`**: «Mensaje del paciente», avisos de «No entendí», «Buscar en el catálogo», revisión antes de
  enviar y cierre.
- **`vistas/comunes/`**: cabecera y pasos del prototipo, iconos (`Iconos.tsx` para la interfaz, `IconoEntrada.tsx`
  para el apoyo visual de cada entrada), el recurso en LSM (con sus tres estados), el aviso de alcance, los diálogos
  y la banda del modo.
- **`modos/`**: arma cada modo de inicio uniendo coordinador, transporte y vistas. `modosRed.tsx` añade la franja de
  vinculación del médico y la pantalla de conexión del paciente.

## Privacidad

- Todo se guarda en memoria. No hay `localStorage`, archivos ni registros con contenido. Al terminar la consulta se
  borra en ambas vistas.
- Por la red, el contenido viaja cifrado y autenticado (AES-GCM con clave derivada del código de vinculación). Un
  equipo sin el código no puede leerlo ni enviar mensajes.
- La app de escritorio usa una sesión de Chromium en memoria. En disco solo quedan cachés técnicas de Chromium sin
  contenido de la consulta (`%APPDATA%\techstar-lsm-consulta\`); ver [Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md) §5.
- Usar solo datos ficticios.
- La carpeta `Entrevistas/` está excluida en `.gitignore` y no debe subirse al repositorio.

## Pendiente

- **Etapa B:** ejecutar la prueba con dos laptops reales y registrar sus sistemas operativos
  ([Docs/PRUEBA_DOS_LAPTOPS.md](Docs/PRUEBA_DOS_LAPTOPS.md)).
- **Etapa C:** cámara de la laptop del paciente y reconocimiento limitado.
- **Etapa D:** verificación de la entrega (incluye RNF-01 con 30 intercambios).
- **Etapa E:** tableta Android.
- Catálogo V1 aprobado y recursos en LSM validados.

Ver [Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md) §9 para la próxima tarea.
