# LSM Consulta · TechStar

Apoyo a la comunicación entre una persona Sorda usuaria de LSM y el personal médico durante una consulta general.
MVP académico de *Aseguramiento de la Calidad del Software* (2026-2).

**Estado:** etapa A terminada: primera conversación en escritorio, en una sola computadora.
Detalle, pruebas y pendientes en [Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md).

> **Catálogo ficticio y recursos de prueba.** Ningún recurso está validado en LSM. Los marcadores con la etiqueta
> ámbar «Prueba · no es LSM» (silueta neutra en lugar de un video) solo sirven para probar la interfaz. Inventario en
> [Docs/RECURSOS_LSM.md](Docs/RECURSOS_LSM.md).

## Requisitos

- Node.js **22.13 o superior** (probado con 22.15.0) y npm.
- Un navegador moderno: Chrome, Edge o Firefox.

## Instalación y arranque

```bash
npm install
```

```bash
npm run dev
```

Abrir **http://127.0.0.1:5173** en el navegador. El servidor solo escucha en esta computadora.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://127.0.0.1:5173 |
| `npm test` | Ejecuta las pruebas automáticas (46) |
| `npm run typecheck` | Revisa los tipos de TypeScript |
| `npm run build` | Revisa los tipos y genera la versión de producción en `dist/` |
| `npm run preview` | Sirve `dist/` en http://127.0.0.1:4173 |
| `npm run check` | Tipos, pruebas y compilación (lo que hay que correr antes de entregar) |

## Modos de inicio

En la pantalla de inicio se elige la política de recursos y el modo:

| Modo | Dirección | Uso |
|---|---|---|
| Demostración en una pantalla | `?modo=demo&recursos=desarrollo` | Las dos interfaces lado a lado. **Respaldo de la entrega** |
| Médico | `?modo=medico&recursos=desarrollo` | Aloja el coordinador de la sesión. Abrir primero |
| Paciente | `?modo=paciente` | Se conecta a la ventana del médico en el mismo navegador y la misma computadora |

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

**Dos ventanas en la misma computadora:** abrir el modo **Médico** y luego el modo **Paciente** en otra pestaña del
mismo navegador y repetir los pasos. Así se ensaya la separación que la etapa B hará entre dos laptops.

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
src/
  nucleo/        Reglas de la sesión (TypeScript puro, sin React ni red)
  catalogo/      Catálogo ficticio y textos del aviso de alcance
  transporte/    Cómo viajan los mensajes entre vistas y coordinador
  cliente/       Conecta una vista con la sesión (hooks de React)
  camara/        Interfaz del adaptador de cámara (etapa C)
  vistas/        Pantallas: paciente, médico y piezas comunes
  modos/         Modos de inicio (demostración, médico y paciente) y pantalla de inicio
Docs/            Documentos de referencia (SRS, lista), estado actual e inventario de recursos
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
- **`transporte/`**: el «cartero». `local.ts` lleva mensajes dentro de la misma ventana (modo de una pantalla).
  `broadcastChannel.ts` los lleva entre dos ventanas del mismo navegador. La etapa B añadirá `websocket.ts` para dos
  laptops, con la misma interfaz (`tipos.ts`).
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
- **`modos/`**: arma cada modo de inicio uniendo coordinador, transporte y vistas.

## Privacidad

- Todo se guarda en memoria. No hay `localStorage`, archivos ni registros con contenido. Al terminar la consulta se
  borra en ambas vistas.
- Usar solo datos ficticios.
- La carpeta `Entrevistas/` está excluida en `.gitignore` y no debe subirse al repositorio.

## Pendiente

- **Etapa B:** Electron, conexión por Wi-Fi entre dos laptops con vinculación, caída y recuperación de red.
- **Etapa C:** cámara de la laptop del paciente y reconocimiento limitado.
- **Etapa D:** verificación de la entrega (incluye RNF-01 con 30 intercambios).
- **Etapa E:** tableta Android.
- Catálogo V1 aprobado y recursos en LSM validados.

Ver [Docs/ESTADO_ACTUAL.md](Docs/ESTADO_ACTUAL.md) §9 para los pasos de la etapa B.
