# Guion de demostración

Recorrido para probar la app de principio a fin. Para instalarla y abrirla, ver el [README](../README.md).

1. `npm run dev` → abrir http://127.0.0.1:5173 → «Modo desarrollo» → **Demostración en una pantalla**.
2. **Médico:** «Iniciar consulta». **Paciente:** aparece «Alcance de este apoyo» → «Entendido, continuar». En modo
   desarrollo la primera pantalla es la cámara («Captura en LSM»): pulsar «Elegir lo que sientes» para ir al catálogo.
3. **Paciente:** «Elegir» en «Dolor de cabeza» y en «Fiebre» → «Revisar selección (2)». En la revisión, en
   «¿Cuánto te duele?», elegir **7** (empieza en «–/10»: sin valor por defecto).
   *Comprobar:* el médico todavía no ve nada.
4. **Paciente:** «Cambiar selección» para volver con la selección intacta, y «Revisar selección» otra vez. Después
   «Confirmar mensaje» (prueben un doble clic: llega un solo mensaje).
5. **Médico:** buscar `ALERGIA` → «Mostrar al paciente» en «¿Tiene alergia a algún medicamento?» → revisar texto y
   recurso → «Enviar al paciente».
   Antes de escribir, el médico ya ve «Sugeridas por los síntomas» (por ejemplo, con «Fiebre»: «¿Ha tenido
   escalofríos?») y «Preguntas generales». Elegir una abre la misma revisión antes de enviar.
6. **Paciente:** aparece «Mensaje del médico»; pulsar **«No entendí»**. **Médico:** aparece el aviso rosa con ese mismo
   mensaje → «Elegir otra entrada» → buscar `desde` → enviar. El aviso queda marcado como respondido.
   **Paciente:** «Responder» vuelve al catálogo; «Conversación» muestra el historial.
7. **Entrada sin recurso:** médico, buscar `vomito` → «Enviar» bloqueado. Paciente, «Mareo» (sin recurso) →
   «Revisar selección» → «Confirmar» bloqueado → «Descartar mensaje».
8. **Sugerida sin recurso:** paciente, confirmar «Dolor de estómago» → el médico ve «¿Ha tenido vómito?» entre las
   sugeridas, con «Sin recurso»; al elegirla, la revisión explica el bloqueo y «Enviar» queda desactivado.
9. **Sin resultados:** médico, buscar `cirugía`.
10. **Cierre:** «Finalizar consulta» → «Terminar y borrar». Ambas pantallas se vacían → «Nueva consulta» empieza vacía.
11. Opcional: volver al inicio con «Flujo de producto» y comprobar que todo envío queda bloqueado.

**Dos laptops:** vincularlas (ver «Dos laptops» en el [README](../README.md#en-dos-laptops)) y repetir los pasos, cada participante en su laptop. **Dos procesos en
una computadora:** `npm run electron:medico-local` y `npm run electron:paciente` escribiendo solo el código (el equipo del paciente encuentra al médico en `127.0.0.1`).
Con `electron:paciente` la cámara usa el reconocedor experimental, con los puntos en vivo; con
`npm run electron:paciente-simulado`, el simulador (en ambos casos, solo si el médico abrió en modo desarrollo:
`electron:medico` y `electron:medico-local` ya lo hacen).
**Dos pestañas del navegador:** modo **Médico** y luego **Paciente** en otra pestaña (como en la etapa A).

## Captura en LSM (etapa C)

> **Dos reconocedores, solo en modo desarrollo.** El **experimental** (`npm run electron:demo`) analiza el clip con
> MediaPipe y lo compara con plantillas de 8 señas sacadas de videos web: Dolor de cabeza, Fiebre, Tos, Náuseas,
> Cansado, Sí, No y No sé. **No está validado**: con una persona nueva casi siempre responde «No reconocimos tu seña»
> (resultados en [RECONOCEDOR.md](RECONOCEDOR.md)). El **simulador** (`npm run electron:demo-simulado`) no
> analiza el clip: **quien dirige la prueba** elige «reconocido como…» o «desconocido» en un recuadro ámbar. En el
> **flujo de producto** no hay ninguno: «Captura en LSM» aparece deshabilitado con «El reconocimiento en LSM todavía no
> está disponible».

**Dónde funciona la cámara.** En la app de escritorio (`npm run electron:demo` o `electron:paciente`): Electron concede
**solo la cámara, sin micrófono**, a su propia ventana; el modo médico no tiene cámara. En Windows, además, debe estar
activado *Configuración › Privacidad › Cámara › Permitir que las aplicaciones de escritorio accedan a la cámara*.
En el navegador (`npm run dev`) el navegador pide permiso; el panel del navegador de la app de Claude la bloquea siempre
(sirve para ver el aviso de cámara denegada).

**Demostración (modo desarrollo, una pantalla):**

1. `npm run electron:demo` → **Médico:** «Iniciar consulta» → **Paciente:** «Entendido, continuar».
2. **Paciente:** la cámara se abre sola al cerrar el aviso («Captura en LSM»). El recuadro del video muestra
   «● Cámara activa» y el tiempo (máximo 15 s).
   Con el reconocedor experimental, sobre la imagen se dibujan los puntos de las manos y los hombros que analiza, y
   debajo dice cuántos ve («Puntos que analiza el reconocedor: Manos: 2 · Hombros: sí»). «Manos: 0» suele ser poca luz.
   *Comprobar:* el médico no ve nada.
3. **«Cancelar»:** la cámara se apaga y se vuelve al catálogo; no se pide reconocimiento.
4. Otra vez «Captura en LSM», hacer una seña del vocabulario de frente, con hombros y manos a la vista, y **«Listo»:**
   «Interpretando tu seña… La cámara ya está apagada.» y la marca «Reconocedor experimental · no validado». En unos
   segundos (más o menos la mitad de lo que duró el clip):
   - si la reconoce, **Paciente:** «Esto es lo que entendimos de tu seña», la marca experimental, la distancia, el
     umbral y el tiempo. Confirmar → el médico recibe el texto marcado «· cámara»;
   - si no, aviso «No reconocimos tu seña» con el motivo («no se parece lo suficiente…», «no se vieron las manos»…),
     «Intentar de nuevo» o «Elegir lo que sientes». **Es el resultado más probable** y es el comportamiento correcto
     (RF-05: nunca adivinar).
5. Una seña que no está en el vocabulario (p. ej. «Gracias») debe terminar en «No reconocimos tu seña».
   Con `electron:demo-simulado`, los pasos 4 y 5 se hacen eligiendo el resultado en el recuadro del simulador.
6. Cierre durante el procesamiento: «Listo» y, sin elegir resultado, el médico pulsa «Finalizar consulta» →
   «Terminar y borrar». La pantalla del paciente se vacía; la nueva consulta empieza sin nada pendiente.

Reglas: la captura solo empieza con el catálogo sin opciones elegidas (para no perder una selección); la propuesta de
la cámara se confirma o se descarta (no hay «Cambiar selección»); si llega un mensaje del médico durante la captura, se
anuncia arriba sin ocultar la cámara.
