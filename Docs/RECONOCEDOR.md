# Reconocedor experimental de LSM · TechStar

**Fecha:** 20/11/2026 · **Estado:** experimental, **no validado**. Solo existe en **modo desarrollo** y la pantalla lo
marca siempre con «Reconocedor experimental · no validado». En el flujo de producto no hay reconocedor (D33).

> **En una frase:** el reconocedor funciona de punta a punta en la app de escritorio y rechaza lo que no conoce, pero
> con los datos disponibles (videos web, 1 o 2 personas por fuente) **casi no reconoce a otra persona**. Con una
> persona real frente a la cámara lo esperable es que responda «No reconocimos tu seña» la mayoría de las veces. Eso
> cumple RF-05 (nunca adivinar), pero **no acredita** que la app entienda LSM.

## 1. Vocabulario

8 señas del paciente, elegidas con el equipo entre las que tienen video en las fuentes. «Mareo» (PAC-S-06) se dejó
fuera a propósito: es la entrada sin recurso que usan las pruebas del bloqueo (D42).

| Entrada | Texto del catálogo | Seña en el sitio | ¿Qué cubre la seña? | Videos (fuente) |
|---|---|---|---|---|
| PAC-S-01 | Tengo dolor de cabeza. | «Dolor de cabeza» | Palabra suelta (concepto) | 2 (Iztacala) |
| PAC-S-04 | Tengo fiebre. | «Fiebre» | Palabra suelta (concepto) | 2 (Iztacala, Indiscapacidad) |
| PAC-S-05 | Tengo tos. | «Tos» | Palabra suelta (concepto) | 4 (2 Iztacala, 2 Indiscapacidad) |
| PAC-S-07 | Tengo náuseas. | «Náuseas» / «Asco (Náuseas)» | Palabra suelta (concepto) | 3 (2 Iztacala, 1 Indiscapacidad) |
| PAC-S-08 | Me siento muy cansado o cansada. | «Cansado» / «Cansancio» | Palabra suelta (concepto) | 2 (Iztacala, Indiscapacidad) |
| PAC-R-01 | Sí. | «Sí» | Mensaje completo | 1 (Sol Lara) |
| PAC-R-02 | No. | «No» | Mensaje completo | 1 (Sol Lara) |
| PAC-R-03 | No lo sé. | «No saber» | Palabra suelta (concepto) | 2 (Iztacala, Indiscapacidad) |

El catálogo tiene 22 entradas del paciente; el reconocedor cubre estas 8 (§6.3 del encargo: se registran por
separado). Inventario completo por video (fuente, permiso, seña, entrada, uso) en
[recursos-candidatos/inventario-reconocedor.json](../recursos-candidatos/inventario-reconocedor.json), sin videos.

## 2. Datos

- **Fuentes:** Iztacala Enseña (FES Iztacala, UNAM), Indiscapacidad CDMX (Portal LSM) y el canal de Sol Lara
  (Lsm_by_Sol). Procedencia de cada video en
  [recursos-candidatos/procedencia.json](../recursos-candidatos/procedencia.json).
- **Permiso:** según informó el equipo el 20/11/2026, las tres fuentes autorizaron usar sus videos **para entrenar** y
  **para mostrarlos en la app**. Falta archivar la constancia escrita en la trazabilidad del proyecto. El permiso no
  sustituye la revisión lingüística: los recursos siguen en estado `prueba`.
- **Personas:** 1 en Sol Lara; 1 o 2 en Iztacala y 1 o 2 en Indiscapacidad (según el equipo). Es decir, cada seña la
  hacen como mucho 2 o 3 personas, todas en videos de estudio (fondo liso, buena luz, encuadre fijo).
- **Expresiones desconocidas:** 77 videos de las mismas fuentes que **no** son del vocabulario (números, «Gracias»,
  «Hola», «Mareo», preguntas del médico…) para medir falsas aceptaciones. 4 videos se excluyeron porque contienen una
  seña del vocabulario dentro de una frase («¿Te duele la cabeza?», «¿Tienes fiebre?», «¿Tienes tos?», «¿Tienes
  náuseas?»).
- **Sin** muestras de la asociación de personas Sordas, **sin** grabaciones del equipo (se decidió no hacerlas) y
  **sin** movimientos cotidianos grabados con la laptop.
- Los videos viven en `recursos-candidatos/videos/` y los puntos extraídos en `recursos-candidatos/puntos/`, ambas
  **ignoradas por git**. Las capturas de consulta **nunca** se usan para entrenar (RF-18).

## 3. Método

1. **Puntos (MediaPipe Tasks Vision 1.2.2, Apache-2.0, sin internet):** Hand Landmarker (21 puntos por mano, hasta 2
   manos) y Pose Landmarker lite (solo los hombros). El código WebAssembly y los modelos van dentro de la app
   ([public/modelos/README.md](../public/modelos/README.md)). Se usa el **mismo extractor** para las plantillas y para
   el clip de la cámara: reproduce el video a 2× y analiza los cuadros que alcanza.
2. **Características por cuadro:** cada mano se sigue entre cuadros y se pone primero la dominante (la más activa).
   Por mano: presencia, posición de la muñeca respecto al centro de los hombros (en anchos de hombros) y forma (20
   puntos respecto a la muñeca, en largos de palma). Pesos fijos: presencia 0.7, posición 1, forma 0.35.
3. **Tramo activo:** del primer al último cuadro con una muñeca por encima de la posición de reposo (0.8 anchos de
   hombro bajo los hombros); se remuestrea a 20 cuadros.
4. **Clasificador:** vecino más cercano con **DTW** (banda de 5 cuadros) contra 34 plantillas (los 17 videos y su
   espejo, para personas zurdas o cámaras que voltean la imagen).
5. **Rechazo (RF-05):** responde «desconocido» si (a) no se vieron manos o hombros, (b) la distancia a la plantilla más
   cercana es mayor que **0.47**, o (c) la mejor seña no se distingue de la segunda (distancia mejor / segunda >
   **0.70**). Los umbrales se eligieron para maximizar aciertos con **cero** falsas aceptaciones, penalizando el doble
   una falsa aceptación que un acierto perdido.
6. **Dónde corre:** en el equipo del paciente (la ventana de la app), D34. El clip y sus puntos viven solo en memoria
   mientras se interpreta el turno; al médico solo llega el texto confirmado.

Código: `src/reconocimiento/experimental/` (extractor, características, clasificador y `ReconocedorExperimental`),
`scripts/evaluar-reconocedor.ts` y la herramienta `herramientas/extraer-puntos.html`.

## 4. Evaluación (preliminar)

**Protocolo.** (1) *Dejando uno fuera:* cada video del vocabulario se clasifica con las plantillas de los demás. Puede
quedar la misma persona en ambos lados, así que es optimista. (2) *Entre fuentes:* las plantillas son solo de la
**otra** fuente (otra persona): es lo más parecido a una persona nueva. (3) *Desconocidas:* los 77 videos se dividieron
en dos mitades; la A se usó para calibrar los umbrales y la B solo para medir. «Sí» y «No» tienen un solo video y **no
se pueden evaluar** por validación cruzada. Resultados completos por video en
[recursos-candidatos/evaluacion-reconocedor.json](../recursos-candidatos/evaluacion-reconocedor.json).

**Con los umbrales de la versión evaluada (distancia ≤ 0.47, margen ≤ 0.70):**

| Entrada | Dejando uno fuera: aciertos | Entre fuentes: aciertos | Confusiones |
|---|---|---|---|
| PAC-S-01 Dolor de cabeza | 0 de 2 | — (una sola fuente) | 0 |
| PAC-S-04 Fiebre | 0 de 2 | 0 de 2 | 0 |
| PAC-S-05 Tos | 2 de 4 | 0 de 4 | 0 |
| PAC-S-07 Náuseas | 0 de 3 | 0 de 3 | 0 |
| PAC-S-08 Cansado | 0 de 2 | 0 de 2 | 0 |
| PAC-R-03 No sé | 0 de 2 | 0 de 2 | 0 |
| PAC-R-01 Sí / PAC-R-02 No | no evaluable | no evaluable | — |
| **Total** | **2 de 15** | **0 de 13** | **0** |

Lo que no es acierto es **rechazo** («No reconocimos tu seña»): con estos umbrales nunca propuso una seña equivocada.

| Falsas aceptaciones de expresiones desconocidas | Resultado |
|---|---|
| Mitad A (calibración) | 0 de 39 |
| Mitad B (prueba) | 0 de 38 |

Los 2 aciertos son los dos videos de «Tos» de Iztacala, casi idénticos entre sí. **Sin umbral** (eligiendo siempre la
seña más parecida) el vecino más cercano acierta 8 de 15 dejando uno fuera y 6 de 13 entre fuentes (el azar sería
≈ 1 de 7), pero las distancias de los aciertos (1.2 a 2.5) se solapan con las de las expresiones desconocidas
(mínimo 0.87, mediana 2.07): no hay un umbral que acepte esos aciertos sin aceptar desconocidas.

**Compromiso con otros umbrales** (para justificar la elección; no son la versión evaluada):

| Distancia ≤ | Margen ≤ | Aciertos dejando uno fuera (de 15) | Confusiones | Aciertos entre fuentes (de 13) | Falsas aceptaciones (de 77) |
|---|---|---|---|---|---|
| **0.47** | **0.70** | **2** | **0** | **0** | **0** |
| 1.0 | 0.90 | 2 | 1 | 0 | 1 |
| 1.3 | 0.90 | 2 | 1 | 0 (1 confusión) | 4 |
| 1.5 | 0.90 | 3 | 3 | 0 (1 confusión) | 5 |
| 2.0 | 1.00 | 5 | 6 | 3 (3 confusiones) | 33 |

Antes de fijar el método se probaron, con los mismos videos y sin umbrales, otras 6 variantes (forma por extensión de
dedos, velocidad, solo la mano dominante, solo posición, otros pesos). Ninguna superó a la elegida, que era la fijada de
antemano.

**Tiempo de respuesta** (desde «Listo» hasta el resultado, `npm run electron:demo` en la computadora de desarrollo:
Windows 10 Pro 10.0.19045, Electron 45.3.3, GPU por WebGL): 2.9 s con un clip de 5.8 s, 4.0 s con 7.5 s y 3.9 s con
7.8 s. Es aproximadamente la mitad de la duración del clip más medio segundo. La pantalla de revisión y la de «No
reconocimos tu seña» muestran el tiempo, la distancia y el umbral de cada intento (solo modo desarrollo).

**Prueba de extremo a extremo en la app de escritorio** (20/11/2026). Se usó la cámara falsa de Chromium
(`--use-file-for-fake-video-capture`) con videos de las fuentes convertidos a 640×480, y la app se manejó con el
protocolo de depuración. Acredita la cadena completa en Electron (cámara → MediaRecorder → MediaPipe con `file://` y la
CSP → clasificador → revisión), **no la exactitud**: «Tos» también es una plantilla.

| Caso | Resultado esperado | Resultado observado |
|---|---|---|
| Video «Tos» (Iztacala) como cámara | Reconocido y en revisión, marcado experimental | «Esto es lo que entendimos de tu seña» → «Tos»; «Reconocedor experimental · no validado»; distancia 0.09; 2.9 s; el médico no ve nada hasta confirmar |
| Video «Gracias» (desconocida) | «No reconocimos tu seña» | Rechazo: distancia 2.54 > 0.47; 4.0 s |
| Video «Mareo» (desconocida, fuera del vocabulario) | «No reconocimos tu seña» | Rechazo: distancia 1.43 > 0.47; 3.9 s |
| Datos tras las pruebas | Nada guardado | Carpeta de datos de Electron: 65 archivos técnicos, ningún WebM ni resultado |

**Pendiente de probar:** una persona señando frente a una webcam física y en la laptop del paciente. No se hizo en esta
sesión (no hay cámara física conectada). Registrar ahí cuántas señas se reconocen y cuántas se rechazan.

## 5. Limitaciones

- **Muy pocos datos:** 1 a 4 videos por seña; «Sí» y «No», uno solo. Cada seña la hacen como mucho 2 o 3 personas.
- **Videos de estudio:** otra luz, fondo, ropa, encuadre o distancia a la cámara cambian los puntos.
- **Sin validación con personas Sordas** ni apoyo lingüístico: no se sabe si las variantes de las fuentes son las que
  usaría la persona usuaria, ni si la «palabra suelta» basta para el mensaje del catálogo (6 de 8 entradas).
- **No reconoce a una persona nueva:** 0 de 13 entre fuentes con los umbrales elegidos.
- **Umbrales calibrados con los mismos videos** (la mitad B de desconocidas es la única medición independiente).
- **Sin rostro:** las señas que dependen de la expresión facial o de los labios no se distinguen.
- **Una seña por clip**, aislada; no reconoce frases ni señas encadenadas.
- **Rendimiento:** medido en una sola computadora; en una laptop más lenta se analizan menos cuadros.

## 6. Cómo reproducirlo

```bash
npm run herramienta-puntos
```

Abrir `http://127.0.0.1:5174/herramientas/extraer-puntos.html` y pulsar «Extraer» (unos 15 minutos para 94 videos; necesita
`recursos-candidatos/videos/`, que se regenera con `recursos-candidatos/descargar.py`). Después:

```bash
npm run evaluar-reconocedor
```

Escribe `public/modelos/plantillas-lsm.json` y `recursos-candidatos/evaluacion-reconocedor.json` e imprime las tablas.
Para la demostración: `npm run electron:demo` (ya abre con `--reconocedor=experimental`; `electron:demo-simulado` abre
con el simulador). En el navegador, la pantalla de inicio permite elegir el reconocedor en modo desarrollo.

## 7. Qué haría falta para que reconozca de verdad

1. Muestras autorizadas de **varias personas Sordas** (idealmente de la asociación), con la laptop y en condiciones
   reales, separadas por persona entre entrenamiento y evaluación (§6.4 del encargo).
2. Acordar el vocabulario y las variantes con personas usuarias de LSM y apoyo lingüístico.
3. Con más datos, un clasificador entrenado (p. ej. una red pequeña sobre los mismos puntos) y rasgos del rostro.
4. Repetir esta evaluación por persona nueva y medir con movimientos cotidianos.
