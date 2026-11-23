# Organización del código

Guía breve de las carpetas y módulos, para que cada integrante pueda explicarlos con sus palabras.

## Los 7 módulos del MVP

En la entrega definimos el MVP en 7 módulos funcionales. El código no está organizado por módulo sino por capas
(siguiente sección), así que esta tabla indica dónde vive cada uno.

| # | Módulo | Dónde está en el código | Estado (23/11/2026) |
|---|---|---|---|
| 1 | Gestión de sesión | `src/nucleo/coordinador.ts`, `src/cliente/useSesion.ts`, `src/modos/` | Terminado: inicio, cierre y borrado de la consulta |
| 2 | Captura de señas | `src/camara/`, `src/vistas/paciente/PanelCaptura.tsx`, `src/vistas/paciente/useCaptura.ts` | Terminado. Falta probar con webcam física y en Android |
| 3 | Reconocimiento de LSM | `src/reconocimiento/` (simulado y `experimental/`) | Experimental, no validado: 8 señas, no reconoce a personas nuevas. Necesita muestras de personas Sordas |
| 4 | Catálogo de síntomas | `src/catalogo/`, `catalogo/ficticio-dev.json`, `src/nucleo/recursos.ts`, `src/vistas/paciente/CatalogoPaciente.tsx` | Código terminado. Faltan el Catálogo V1 aprobado y los videos en LSM validados |
| 5 | Revisión y confirmación | `src/nucleo/turnoPaciente.ts`, `src/vistas/paciente/RevisionPaciente.tsx`, `src/vistas/paciente/SelectorIntensidad.tsx` | Terminado |
| 6 | Comunicación y preguntas médicas | `src/vistas/medico/`, `src/nucleo/busqueda.ts`, `src/nucleo/mensajes.ts`, `src/vistas/paciente/MensajesPaciente.tsx` («No entendí») | Terminado |
| 7 | Sincronización y vinculación | `src/transporte/` (incl. `busqueda.ts`), `electron/servidor/` (incl. `busquedaMedico.ts`), `electron/busquedaPaciente.ts` | Terminado. Falta la prueba con dos laptops reales |

Piezas compartidas por todos los módulos: `electron/main.ts`, `electron/preload.ts` y `electron/permisos.ts` (ventana
aislada y permisos), `src/vistas/comunes/` (piezas de pantalla) y `src/nucleo/tipos.ts` (forma de los datos).

## Carpetas

```
electron/        App de escritorio (proceso principal de Electron, Node)
  main.ts          Modos, ventana aislada, permisos, IPC con la vista del médico
  permisos.ts      Qué permiso se concede a la vista (solo cámara sin micrófono, modos paciente y demo)
  preload.ts       Puente mínimo y aislado hacia la vista (window.techstar)
  argumentos.ts    Lee --modo, --recursos, --puerto, --solo-local, --reconocedor
  servidor/        Servidor WebSocket que envuelve al coordinador (laptop del médico)
src/
  nucleo/        Reglas de la sesión (TypeScript puro, sin React ni red)
  catalogo/      Carga y validación del catálogo; genera el inventario de recursos
  transporte/    Cómo viajan los mensajes entre vistas y coordinador
  cliente/       Conecta una vista con la sesión (hooks de React)
  camara/        Adaptador de cámara: interfaz y cámara real del navegador/Electron (etapa C)
  reconocimiento/ Interfaz del reconocedor, reconocedor SIMULADO y experimental/ (MediaPipe + DTW, no validado)
  herramientas/  Página de la herramienta de extracción de puntos (solo equipo, no es parte de la app)
  vistas/        Pantallas: paciente, médico y piezas comunes
  modos/         Modos de inicio (demostración, médico, paciente y los de red) y pantalla de inicio
catalogo/        Datos del catálogo (entradas y recursos), editables sin tocar código
public/recursos/ Archivos de los recursos en LSM (videos o imágenes), instalados con la app
public/modelos/  Modelos de MediaPipe y plantillas del reconocedor experimental (sin internet)
recursos-candidatos/ Procedencia, inventario y evaluación del reconocedor (los videos y puntos no se versionan)
scripts/         validar-catalogo, docs-recursos y evaluar-reconocedor (Node)
guias/           Guion de demostración, catálogo, reconocedor, prueba con dos laptops e inventario de recursos
```

## Qué hace cada módulo, en palabras sencillas

- **`nucleo/coordinador.ts`**: el «árbitro» de la consulta. Vive en la computadora del médico. Solo acepta
  mensajes confirmados. Revisa que vengan de la sesión correcta y del rol correcto, que tengan recurso permitido y que el
  texto sea el que el paciente revisó. Aplica cada envío una sola vez y borra todo al cerrar.
- **`nucleo/turnoPaciente.ts`**: los pasos del paciente (elegir → revisar → enviar, o capturar → procesar → revisar o
  «no reconocido»). Es el borrador, que nunca sale de la pantalla del paciente hasta confirmar. Descarta resultados de
  una captura cancelada o de otra captura.
- **`nucleo/recursos.ts`**: decide si un recurso en LSM se puede mostrar y enviar. Validado, sí. De prueba, solo en modo
  desarrollo. Sin recurso, nunca. Jamás pone otro recurso en su lugar.
- **`nucleo/busqueda.ts`**: busca en el catálogo por parte del término, sin importar mayúsculas ni tildes.
- **`nucleo/mensajes.ts`**: arma el texto en español de cada elemento («… Intensidad del dolor: 7 de 10.»), igual en las
  dos pantallas.
- **`nucleo/tipos.ts`**: la forma de los datos (entradas, mensajes, avisos, comandos) que comparten todas las partes.
- **`catalogo/catalogoFicticio.ts`**: carga `catalogo/ficticio-dev.json` y lo entrega a la app solo si pasa la
  validación. Si no la pasa, la app muestra los errores y no abre ninguna consulta.
- **`catalogo/validarCatalogo.ts`**: el «revisor» del archivo de datos. Rechaza IDs repetidos, recursos inexistentes,
  tipos desconocidos, textos vacíos, archivos de internet y recursos validados sin archivo o sin aprobación. También
  revisa que los archivos de `public/recursos/` existan y no estén dañados. `documentoRecursos.ts` arma el inventario.
- **`transporte/`**: el «cartero». Todos cumplen la misma interfaz (`tipos.ts`), por eso las vistas no cambian.
  `local.ts` lleva mensajes dentro de la misma ventana (modo de una pantalla). `broadcastChannel.ts` los lleva entre
  dos ventanas del mismo navegador. `websocket.ts` los lleva de la laptop del paciente a la del médico por Wi-Fi:
  se vincula con el código, reintenta si cae la red y reenvía lo pendiente sin duplicar. `ipcElectron.ts` comunica la
  vista del médico con el coordinador del proceso principal. `canalSeguro.ts` cifra y autentica cada mensaje con una
  clave que sale del código de vinculación. `protocoloRed.ts` define los mensajes de red y revisa su forma.
  `puente.ts` describe lo único que la app de escritorio expone a las vistas. `busqueda.ts` define cómo el equipo del
  paciente encuentra al médico en la red con solo el código (D56).
- **`electron/servidor/servidorRed.ts`**: la «portería» de la laptop del médico. Solo deja pasar a la laptop que
  conoce el código, y a una sola; le fija el rol «paciente», entrega sus comandos al coordinador y le reenvía los
  cambios. Si la conexión se queda callada, la cierra y espera a que vuelva.
- **`electron/main.ts`** y **`electron/preload.ts`**: arrancan la app en el modo pedido con la vista aislada de Node
  (sin `require`, con `contextIsolation` y `sandbox`) y sin navegación a otras páginas. `electron/permisos.ts` niega
  todo permiso salvo la cámara (solo video) para la ventana propia en los modos paciente y demostración.
- **`cliente/useSesion.ts`**: conecta una pantalla con el cartero, guarda en memoria lo último que llegó y avisa
  «recibido» cuando un mensaje se mostró.
- **`camara/adaptador.ts`**: el contrato de la cámara (iniciar, mostrar la imagen, «Listo», cancelar, liberar). La vista
  solo conoce este contrato; en la etapa E se cambiará por la cámara de la tableta sin tocar la vista.
- **`camara/camaraNavegador.ts`**: la cámara real. Pide solo video, enciende la cámara al empezar la captura y la apaga
  con «Listo», «Cancelar» o al cerrar. Arma el clip en memoria (máximo 15 s) y lo descarta al cancelar.
- **`reconocimiento/reconocedor.ts`**: el contrato del reconocedor (recibe el clip y responde «reconocido como X» o
  «desconocido»). Aquí se conectará el modelo real. `reconocedorPorPolitica` da el simulador solo en modo desarrollo.
- **`reconocimiento/reconocedorSimulado.ts`**: **no reconoce LSM**: espera a que una persona elija el resultado. Si se
  intenta crear en el flujo de producto, falla a propósito.
- **`reconocimiento/experimental/`**: el reconocedor experimental. `extractorMediaPipe.ts` reproduce el clip y saca los
  puntos de hombros y manos; `caracteristicas.ts` los vuelve números que no dependen del tamaño ni de la posición en la
  imagen; `clasificador.ts` busca la plantilla más parecida (DTW) y **rechaza** si no se parece lo suficiente o si dos
  señas quedan casi igual; `reconocedorExperimental.ts` lo une detrás del contrato del reconocedor (solo en modo
  desarrollo). `fabrica.ts` elige simulador o experimental.
- **`vistas/paciente/`**: catálogo paginado con tarjetas «Elegir/Elegido», revisión con «¿Cuánto te duele?»,
  confirmar o descartar, pantalla «Mensaje del médico» con «No entendí» y la conversación. `useCaptura.ts` une la
  cámara y el reconocedor con los pasos del turno; `PanelCaptura.tsx` dibuja «Captura en LSM», «Interpretando…», el
  aviso de seña no reconocida, el recuadro del simulador y la marca del reconocedor experimental.
- **`vistas/medico/`**: «Mensaje del paciente», avisos de «No entendí», «Buscar en el catálogo», revisión antes de
  enviar y cierre.
- **`vistas/comunes/`**: cabecera y pasos del prototipo, iconos (`Iconos.tsx` para la interfaz, `IconoEntrada.tsx`
  para el apoyo visual de cada entrada), el recurso en LSM (con sus tres estados), el aviso de alcance, los diálogos
  y la banda del modo.
- **`modos/`**: arma cada modo de inicio uniendo coordinador, transporte y vistas. `modosRed.tsx` añade la franja de
  vinculación del médico y la pantalla de conexión del paciente.

## Diseño

El estilo sigue el prototipo Figma «Pinkies», página V2: fondo crema `#FCF9F2`, verdes `#364C3F`/`#395443`,
salvia `#AEB6A9`/`#DEDFD6`, durazno para el mensaje a enviar, rojo `#B84A4B` para «Finalizar consulta»;
tipografías **Cal Sans** (títulos) e **Inter** (texto), empaquetadas localmente (funcionan sin internet).
Los apoyos visuales son iconos de línea de [Lucide](https://lucide.dev) (licencia ISC), provisionales y sin validar.
Algunas diferencias con Figma son intencionales, por requisitos del SRS. El color ámbar no es de Figma: marca los recursos de prueba
y el modo desarrollo.
