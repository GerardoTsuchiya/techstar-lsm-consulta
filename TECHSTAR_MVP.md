# TechStar · Encargo de desarrollo del MVP

Revisión 4 · 7 de noviembre de 2026. Colocar `TECHSTAR_MVP.md` en la raíz del repositorio. Usar esta revisión como punto de entrada para desarrollo.

## 1. Entrega académica y destino del MVP

**Acuerdo para la entrega académica.** Preparar dos laptops conectadas por Wi-Fi local. Una presenta la interfaz de la persona Sorda y utiliza su cámara. La otra presenta la interfaz del personal médico y coordina la sesión. Como respaldo, permitir mostrar ambas interfaces en una sola pantalla. El equipo todavía carece de una tableta Android, por lo que la adaptación e instalación en Android se realizarán en una etapa posterior.

**Destino del MVP definido en el SRS.**

Una persona Sorda usa una **tableta Android** en una consulta médica general. Puede expresar su mensaje frente a la cámara de la tableta o seleccionar síntomas en el Catálogo V1. En ambos casos revisa la propuesta con apoyos accesibles y decide si la confirma. Solo entonces aparece en español en la **computadora del personal médico**. El médico busca una pregunta o respuesta del catálogo, revisa el texto y su recurso en LSM y la envía. La persona puede responder o pedir que se lo expliquen otra vez. Los dos equipos comparten una sesión por Wi-Fi local.

La entrega académica debe demostrar ambas vías del paciente —cámara con reconocimiento limitado y catálogo—, revisión, confirmación, respuesta del médico, aclaración y cierre en los equipos disponibles. La presentación en una pantalla sirve como respaldo del recorrido. Registrar qué pruebas se ejecutaron con dos laptops y cuáles con una sola. La comprobación del MVP en tableta Android queda pendiente hasta disponer del equipo. Si faltan muestras, recursos validados o reconocimiento funcional, registrar esas limitaciones con precisión.

## 2. Documentos que guían el trabajo

- [SRS de TechStar, versión 1.6](https://docs.google.com/document/d/1QcqPJeJ0EHnufYkqIT4cTzr4bgD8jqTERs9ecDjTPts/edit). Consultar la ficha de cada requisito para sus condiciones de aceptación y dependencias.
- [Lista consolidada, versión 1.5](https://docs.google.com/document/d/1yiOXvg5VLLY9koJMFxD-k92k5SsqHNL-Qr9X5SzxPgo/edit). Hay 25 requisitos, de los cuales 17 están aprobados por el equipo. La aprobación del alcance y la validación con usuarios se registran por separado.
- [Prototipo Pinkies, página V2](https://www.figma.com/proto/fMscHZxwPWKCcrneuXGSHQ/Pinkies?node-id=42-741&page-id=12%3A11). Usarlo como referencia visual de lectura. Aplicar los acuerdos más recientes cuando una pantalla anterior muestre otro flujo.
- Las fuentes de elicitación y los códigos de participantes se conservan en la trazabilidad formal. Para documentación de desarrollo usar solo códigos y ejemplos ficticios. Evitar subir transcripciones al repositorio.

Si el entorno carece de acceso a Drive, trabajar con las copias vigentes en `docs/requisitos/` y registrar sus versiones. Si falta una decisión sobre contenidos, avanzar en el código independiente y dejar registrada la decisión pendiente. No editar el SRS, la lista ni Figma como consecuencia de implementar una función.

Este encargo incorpora el acuerdo reciente sobre los equipos de la entrega académica. En la matriz de pruebas, indicar «comprobado en laptops» y «pendiente en Android» cuando corresponda a requisitos que mencionan tableta. La equivalencia del flujo en laptops permite avanzar, pero la evidencia de Android requiere ejecutarlo en ese dispositivo.

## 3. Recorrido y condiciones de aceptación

| Parte del recorrido | Implementación y comprobación | SRS |
|---|---|---|
| Abrir consulta | Mostrar el aviso de alcance en español y con recurso validado en LSM. Explicar que el apoyo abarca el Catálogo V1 en consulta general y que hay situaciones que requieren intérprete. Dar acceso al aviso durante la sesión. | RF-16, RC-01 |
| Elegir síntomas | Mostrar recursos en LSM y apoyos visuales para elegir uno o varios síntomas sin depender de leer español. En los síntomas de dolor permitir intensidad opcional de 1 a 10. Al omitirla se conserva sin valor. | RF-19, RI-01 |
| Capturar | Indicar cuándo la cámara está activa. «Listo» finaliza el clip y pide reconocimiento. «Cancelar» detiene la adquisición, descarta el clip sin procesarlo y mantiene disponible el catálogo en la misma sesión. | RF-17, RF-01 |
| Interpretar | Si la expresión corresponde a una entrada reconocida del V1, producir su texto como candidato pendiente. Ante una expresión desconocida, mostrar el aviso accesible y ofrecer reintento o catálogo. | RF-01, RF-05 |
| Revisar | Para ambas vías, mostrar al paciente el texto, los datos y los recursos validados asociados. Distinguir visualmente confirmar y descartar. Descartar desde el catálogo permite regresar, modificar y revisar de nuevo. | RF-03, RF-04, RF-13, RI-01 |
| Confirmar | Entregar al médico exactamente el contenido revisado en español. Mantener borradores y candidatos fuera de la vista del médico. Un doble toque o un reintento debe producir un solo envío. | RF-07, RF-20 |
| Responder desde la computadora | Buscar por parte del término en español sin distinguir mayúsculas ni tildes. Mostrar «Sin resultados» cuando corresponda. Al seleccionar una pregunta o respuesta, revisar texto y recurso LSM. Permitir volver o enviar. Si falta el recurso validado, avisar y bloquear ese envío. La interfaz del paciente muestra el mismo contenido revisado en su laptop durante la entrega y en la tableta en la etapa Android. | RF-14, RF-02, RI-01 |
| Pedir aclaración | Junto al mensaje recibido, ofrecer «No entendí» con apoyo visual y recurso validado en LSM. El médico recibe un aviso vinculado a ese mensaje y puede elegir otra entrada del catálogo. Basta con señalar el mensaje completo. | RF-15, RF-20 |
| Cerrar | Eliminar mensajes y capturas temporales de ambos equipos y componentes de procesamiento controlados por la app, incluyendo la tableta al incorporar Android. Liberar cámara, cancelar transferencias y descartar resultados tardíos. Comprobar que otra sesión empieza vacía. | RF-18, RF-20 |
| Evaluar el significado | Comparar 30 intercambios de ambos sentidos con mensajes de referencia. Aplicar una rúbrica acordada antes de la prueba. El criterio del SRS exige cero cambios clínicamente relevantes en esos 30 casos. | RNF-01 |

**Desarrollo posterior.** RF-06 (reproducción de voz), RF-08 (nueva captura específica tras descartar una vista previa), RF-09 a RF-12 (flujo de voz del médico), RNF-02 (meta propuesta de usabilidad) y RNF-03 (catálogo local sin internet) figuran como propuestos. El reintento tras una expresión *no reconocida* sí está aprobado en RF-05. Mantener la evaluación de accesibilidad aunque el umbral de RNF-02 siga propuesto. Impresión, receta impresa, historial clínico, dictado libre y traducción abierta quedan para decisiones posteriores.

## 4. Implementación por etapas

| Etapa | Trabajo | Evidencia para cerrar la etapa |
|---|---|---|
| A. Primera conversación en escritorio | Inspeccionar el repositorio. Implementar sesión compartida y dos vistas en una ventana. Completar selección de síntomas, revisión, confirmación, respuesta del médico, aclaración y cierre. Usar recursos de prueba claramente identificados para desarrollar si faltan recursos validados. | Arrancar desde el README. Demostrar que el borrador queda en la vista del paciente, que la respuesta llega al destinatario y que el aviso señala el mensaje correcto. Probar también descarte, entrada sin recurso y nueva sesión. |
| B. Conectar dos laptops | Ejecutar la vista del paciente en una laptop y la del médico en otra. Vincularlas y repetir el recorrido A por Wi-Fi local. Limitar acceso a la pareja de dispositivos y a la sesión. | Registrar los sistemas operativos de ambas laptops. Probar ambos sentidos, equipo ajeno, caída de red, recuperación y ausencia de duplicados. |
| C. Cámara y reconocimiento limitado | Probar con la cámara de la laptop del paciente inicio, «Listo» y cancelación. En modo de una pantalla, usar la cámara de esa computadora. Integrar captura, procesamiento y revisión del candidato real. Preparar vocabulario, muestras y evaluación **desde A**, en paralelo al catálogo. | Probar un caso reconocido, uno desconocido, cancelación, cámara denegada y cierre durante procesamiento. Documentar modelo, vocabulario y resultados observados. |
| D. Verificación de la entrega académica | Ejecutar los casos aplicables del SRS con el catálogo aprobado y las dos laptops vinculadas. Ensayar también el respaldo de dos interfaces en una pantalla. Evaluar significado, presentación de recursos, alcance, comprensión de controles y limpieza. | Matriz con resultado, entorno y evidencia de cada caso. Identificar las comprobaciones pendientes en Android y las que dependan de materiales o sesiones con usuarios. |
| E. Adaptación y comprobación en Android | Cuando se disponga de tableta, instalar la interfaz del paciente, adaptar cámara, permisos y ciclo de vida, vincularla con la computadora y repetir los recorridos y pruebas. | Evidencia en tableta real de captura, reconocimiento, catálogo, envío, aclaración, reconexión y eliminación de datos. Revisar los criterios pendientes del MVP. |

## 5. Arquitectura de partida

Conservar lo que ya funcione en el repositorio. Si se inicia desde cero, la propuesta de partida es Electron para la ejecución en las laptops y React + TypeScript para las vistas. Preparar modos de inicio «médico», «paciente» y «demostración en una pantalla», reutilizando las mismas reglas de sesión. La laptop del médico aloja el coordinador y la del paciente se conecta a él. En la etapa E se propone Capacitor para instalar la vista del paciente en Android. Mantener separadas la interfaz, las reglas de sesión, el transporte, el catálogo y la cámara. Verificar versiones compatibles antes de fijarlas y guardar el archivo de bloqueo de dependencias.

La computadora coordina la sesión y puede alojar el reconocedor. Representar explícitamente los estados de captura, procesamiento, revisión, confirmación y cierre. Distinguir borrador y mensaje confirmado. Asociar mensajes, capturas y avisos mediante identificadores de sesión, mensaje y captura. Procesar un clip en la computadora no autoriza mostrarlo al médico.

En modo de una computadora, escuchar en loopback. Para la red local, vincular los dispositivos, validar el rol y la sesión en el coordinador, proteger la conexión y probar desconexión y reconexión. WebSocket para eventos y una transferencia separada y limitada para clips son opciones técnicas. Evitar reenvíos de sesiones cerradas. En Electron mantener las vistas aisladas de Node. Encapsular el acceso a cámara detrás de un adaptador y comprobar permisos, formatos y ciclo de vida en el hardware de destino.

Trabajar con ejemplos ficticios. Mantener los datos clínicos en memoria o en temporales controlados. Inventariar todos los temporales y revisar archivos, cachés y registros tras cerrar. Las capturas de consulta se destinan solo a la interpretación del turno. Excluirlas de entrenamiento, telemetría y evidencias del proyecto.

## 6. Recursos en LSM y preparación del reconocedor

1. Inventariar las entradas candidatas del paciente y del médico. Para cada entrada registrar ID, significado, texto en español, tipo, recurso asociado, procedencia, condiciones de uso, revisión lingüística y estado de reproducción. Añadir los recursos del aviso de alcance, revisión, cancelación, aclaración y expresión desconocida.
2. Usar [Iztacala Enseña](https://www.iztacalaensena.org/) como una fuente candidata del plan original. Antes de utilizar un recurso en el producto, comprobar que corresponde al mensaje completo, que funciona en la aplicación y que el uso previsto está permitido. Registrar la aprobación de la asociación entrada–recurso. Si la reproducción depende de internet, probar también el fallo. Un archivo de prueba puede servir para comprobar la interfaz sin acreditar la comprensión en LSM.
3. Definir qué expresiones se evaluarán y qué respuestas puede dar el paciente a cada pregunta del recorrido. Acordar vocabulario y variantes con personas usuarias de LSM y apoyo lingüístico. Registrar por separado las entradas disponibles en el catálogo y las que cubre realmente el reconocedor.
4. Para entrenamiento y evaluación utilizar muestras autorizadas para ese fin. Separar personas o sesiones entre entrenamiento y evaluación y mantener cada clip en un solo conjunto. Incluir movimientos cotidianos y expresiones fuera de vocabulario. Si se usa MediaPipe, elegir las características necesarias para el movimiento, rostro y cuerpo según las expresiones.
5. Registrar resultados por expresión, falsas aceptaciones de expresiones desconocidas y tiempo de respuesta. Acordar y documentar el criterio de reconocimiento de la versión evaluada. La prueba de 30 intercambios de RNF-01 mide conservación de significado en el flujo, no determina por sí sola la precisión del modelo.

## 7. Cómo comprobar y documentar el avance

- Automatizar transiciones donde un error cambia lo comunicado: mostrar solo lo confirmado, descartar un borrador, cancelar sin procesar, bloquear entradas sin recurso validado, vincular aclaraciones y rechazar mensajes duplicados o de otra sesión.
- En la prueba de significado registrar por caso el mensaje de referencia, sentido, elementos que deben conservarse, resultado observado y cambio encontrado. Según el caso revisar negación, lado del cuerpo, intensidad, duración, alergias o cantidades. Marcar como incidente cualquier diferencia que cambie el significado según la rúbrica acordada.
- Probar cámara, red local, reproducción, instalación y eliminación en equipos reales. Si aparece un impedimento, distinguir «bloqueado», «pendiente de probar» y «probado». Un simulador, un video reproducible y un recurso validado acreditan aspectos distintos.
- Mantener `README.md` con instalación, comandos y demostración. En `docs/ESTADO_ACTUAL.md` registrar etapa, requisitos cubiertos, pruebas ejecutadas con su entorno, materiales pendientes y próxima tarea. Usar una matriz breve con requisito, caso, resultado esperado, resultado observado y evidencia. Para documentación de aprendizaje, dejar que el integrante explique cada módulo con sus palabras y revisar esa explicación contra el código.
- Cerrar la preparación de la entrega académica al verificar los recorridos y pruebas previstos en las laptops y ensayar el modo de respaldo. Mantener un registro específico de pruebas pendientes de Android. El cierre del MVP definido en el SRS requiere satisfacer también los criterios en la tableta y la computadora. Registrar por separado cualquier validación con participantes que siga pendiente.

## 8. Primer encargo para el agente de desarrollo

> Lee TECHSTAR_MVP.md y las instrucciones del repositorio. Revisa el código existente, el SRS y la lista consolidada disponibles. Implementa la etapa A reutilizando lo que ya funciona. Completa un recorrido de ida y vuelta con catálogo, revisión accesible, confirmación, respuesta del médico, «No entendí» y cierre. Separa las vistas del transporte y prepara los modos médico, paciente y demostración en una pantalla. La etapa B conectará dos laptops por Wi-Fi local. La etapa C usará la cámara de la laptop del paciente. Reserva la instalación y las pruebas de Android para la etapa E, cuando haya una tableta disponible. Usa datos ficticios. Si faltan recursos validados, prueba la lógica con datos de prueba identificados, bloquea el envío de entradas sin recurso validado en el flujo de producto y documenta qué falta para la demostración real. Al terminar ejecuta las pruebas y la compilación disponibles, deja instrucciones para abrir la aplicación y registra el siguiente paso hacia la etapa B.
