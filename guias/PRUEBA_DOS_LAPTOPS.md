# Prueba con dos laptops (etapa B)

Protocolo para repetir el recorrido de la etapa A entre **dos laptops reales** por Wi-Fi local y registrar el
resultado. Duración aproximada: 40 minutos. Usar solo datos ficticios del catálogo de desarrollo.

Resultado de esta prueba: **pendiente** (aún no se ejecuta). Al terminar, copiar la tabla de §5 a
`Docs/ESTADO_ACTUAL.md` §4.6 (documento interno del equipo, no está en el repositorio).

## 1. Material

- **Laptop M** (médico): coordina la sesión. **Laptop P** (paciente).
- Una red Wi-Fi donde las laptops se vean entre sí. Las redes de la universidad o públicas suelen aislar los
  equipos («aislamiento de clientes»); si la vinculación no conecta, usar un **punto de acceso del celular** o un
  router propio.
- Opcional, para el caso «equipo ajeno»: una tercera computadora (o la misma laptop P con el código incorrecto).
- En las dos laptops: Node.js 22.13 o superior, npm y git.

## 2. Preparación (una vez por laptop)

```bash
git clone <URL del repositorio> techstar-lsm-consulta
cd techstar-lsm-consulta
npm ci
npm run check
```

El repositorio es privado: clonar con una cuenta que tenga acceso, o copiar la carpeta del proyecto **sin**
`node_modules/`, `dist/`, `dist-electron/` ni `Entrevistas/`. Las dos laptops deben tener la **misma versión** del
código (el mismo commit). Si el protocolo de red difiere, la vinculación responde «versiones distintas».

`npm ci` instala las versiones exactas de `package-lock.json` y descarga Electron 45.3.3 (unos 100 MB). `npm run check`
debe terminar sin errores (71 pruebas).

### Registrar el sistema operativo

En cada laptop, ejecutar y copiar la salida a la tabla de §5:

```bash
npm run info-equipo
```

Ejemplo de salida: `Sistema: Windows_NT 10.0.19045 (Windows 10 Pro)`, `Arquitectura: x64`, `Node: v22.15.0`.
La app también muestra «Este equipo: …» en la barra superior del médico y en la pantalla de conexión del paciente.
Para el nombre comercial y la versión:

| Sistema | Dónde verlo |
|---|---|
| Windows | `winver` (Win + R) o Configuración → Sistema → Información (edición, versión y compilación) |
| macOS | Menú Apple → Acerca de esta Mac, o `sw_vers` en Terminal |
| Linux | `cat /etc/os-release` |

Registrar también el modelo de la laptop y la red usada (Wi-Fi de casa, punto de acceso del celular, etc.).
No registrar nombres de usuario, nombres de equipo ni direcciones MAC.

## 3. Arranque y vinculación

1. **Laptop M:**

   ```bash
   npm run electron:medico
   ```

   - **Windows** mostrará «Firewall de Windows Defender bloqueó algunas características de Electron». Marcar solo
     **Redes privadas** y pulsar «Permitir acceso». La red Wi-Fi debe estar como **privada** (Configuración → Red e
     Internet → Wi-Fi → propiedades de la red → «Red privada»). No marcar «Redes públicas».
   - **macOS** preguntará si «Electron» puede aceptar conexiones entrantes: «Permitir».
   - En el panel «Vincular el equipo del paciente» aparece el **Código** (p. ej. `7KQ2M-9XD4T`) y, en letra pequeña
     debajo, la **Dirección** (p. ej. `192.168.1.20:47100 (Wi-Fi)`). Si hay varias direcciones, usar la del
     adaptador Wi-Fi; las de `vEthernet`, `WSL`, `VirtualBox` o VPN no sirven.
2. **Laptop P:**

   ```bash
   npm run electron:paciente
   ```

   Escribir solo el código que muestra la laptop M y pulsar «Vincular»; el equipo encuentra solo a la computadora del
   médico en la misma red (D56). Si no la encuentra, usar «Conectar escribiendo la dirección» con la dirección que
   aparece en pequeño bajo el código (basta con la IP; el puerto 47100 es el predeterminado). La búsqueda automática
   solo funciona con ese puerto: si M se abrió con `--puerto=N`, hay que escribir `IP:N`. La red debe permitir
   que los equipos se vean entre sí; en redes con aislamiento de clientes (algunas universidades y hospitales),
   compartir la red desde un celular. El código no distingue mayúsculas y acepta «O» por «0». Debe aparecer «Conectado con la computadora del médico» y,
   en la laptop M, «Laptop del paciente conectada (equipo XXXXXX)».

Si no conecta: comprobar que la laptop M muestra una dirección de la misma red que la laptop P (`ipconfig` en
Windows, `ipconfig getifaddr en0` en macOS), que el firewall permitió la conexión y que la red no aísla los equipos.

## 4. Casos

Seguir el [guion de demostración](GUION_DEMO.md) (pasos 2 a 9) entre las dos laptops y, además:

| # | Caso | Cómo hacerlo | Resultado esperado |
|---|---|---|---|
| B1 | Paciente → médico | Paciente: «Dolor de cabeza» + «Fiebre», intensidad 7, «Confirmar mensaje» con doble clic | Llega **un** mensaje a M con «7/10». P muestra «El médico lo recibió» |
| B2 | Borrador privado | Paciente en la revisión sin confirmar | M sigue en «Todavía no hay mensajes» |
| B3 | Médico → paciente | M: buscar `alergia` → «Mostrar al paciente» → «Enviar al paciente» | P muestra «Mensaje del médico». M pasa de «Enviado» a «Se mostró en la pantalla del paciente» |
| B4 | No entendí | P: «No entendí» | M muestra el aviso rosa con el texto de ese mensaje |
| B5 | Equipo ajeno (código) | En una tercera computadora (o en P tras «Desvincular»), `npm run electron:paciente`, «Conectar escribiendo la dirección» con la dirección de M y un código inventado | «El código de vinculación no es correcto.» M: «Equipos rechazados: 1 (último: código incorrecto)» |
| B6 | Equipo ajeno (pareja ocupada) | Tercera computadora con el **código correcto** (búsqueda automática o dirección) mientras P está vinculada | «La computadora del médico ya está vinculada con otro equipo.» P sigue conectada |
| B7 | Caída de red y recuperación | Apagar el Wi-Fi de **P** 15 s y volver a encenderlo | P: franja ámbar «Se perdió la conexión…» y después «Conectado…». M: «desconectada · esperando…» y después «conectada». La conversación sigue igual |
| B8 | Envío del médico durante la caída (RF-20) | Con el Wi-Fi de P apagado, M envía «¿Desde cuándo…?» | M muestra «Enviado · esperando que se muestre» (**no** «Se mostró») mientras P esté fuera. Al volver P, lo muestra y M cambia a «Se mostró…» |
| B9 | Envío del paciente durante la caída (sin duplicados) | P revisa «Tos», apaga su Wi-Fi, pulsa «Confirmar», enciende el Wi-Fi antes de 10 s | Llega **un solo** mensaje «Tengo tos.» a M. Si pasan más de 10 s, P ve «Sin conexión…» y al confirmar otra vez llega **uno** |
| B10 | Caída en la laptop del médico | Apagar el Wi-Fi de **M** 15 s y encenderlo | Igual que B7 (puede tardar hasta unos 10 s en reconectar) |
| B11 | Cierre durante la caída (envío tardío) | P revisa «Tos» y apaga el Wi-Fi; P pulsa «Confirmar»; M «Finalizar consulta» → «Terminar y borrar»; encender el Wi-Fi de P | M no recibe «Tos». P muestra «Consulta finalizada» y nada de la consulta anterior |
| B12 | Nueva consulta | M: «Nueva consulta» | Las dos pantallas empiezan vacías: «Conversación (0)» y «Mensaje del paciente (0)» |
| B13 | Recarga de la ventana del paciente | P: Ctrl+R (Cmd+R en macOS) | M muestra el código de nuevo; P escribe solo el código y vuelve a entrar (misma laptop) |
| B14 | Desvincular | M: «Desvincular» → «Desvincular y crear código nuevo» | P vuelve a la pantalla de conexión con «terminó la vinculación». El código anterior ya no sirve |
| B15 | Respaldo en una pantalla | En cualquiera: `npm run electron:demo` | Las dos interfaces lado a lado, sin red |
| B16 | Búsqueda automática | P abre `npm run electron:paciente` y escribe solo el código | P: «Computadora del médico encontrada en esta red»; al vincular queda conectado |
| B17 | Médico cerrado | P con la app del médico cerrada; después abrir la app de M y pulsar «Buscar de nuevo» | P: «No encontramos la computadora del médico…» con «Buscar de nuevo» y «Escribir la dirección»; al abrir M y buscar de nuevo, aparece |
| B18 | Código equivocado | P escribe un código inventado con M abierta | «Hay computadoras de médico en esta red, pero ninguna tiene este código.» M no suma «equipos rechazados» |
| B19 | Dos médicos en la red | Tercera computadora con `npm run electron:medico`; P escribe el código de M | P se vincula con su médico según el código; la tercera computadora no registra rechazos |
| B20 | Respaldo con la dirección | P: «Conectar escribiendo la dirección», con la dirección pequeña de M y el código | Conectado; «Buscar automáticamente» regresa a la búsqueda |
| B21 | Red de la universidad | Repetir B16 en la red de la universidad y anotar el resultado | Anotar si la búsqueda llega; si no, si llega con la dirección (B20); si no, usar el punto de acceso de un celular |

## 5. Registro

| Campo | Laptop M (médico) | Laptop P (paciente) |
|---|---|---|
| Fecha y responsables (códigos del equipo) | | |
| Modelo de laptop | | |
| Salida de `npm run info-equipo` | | |
| Edición y versión (winver / Acerca de esta Mac) | | |
| «Este equipo» que muestra la app | | |
| Red usada | | |

| # | Resultado (conforme / no conforme / no ejecutado) | Observaciones (qué se vio, tiempos de reconexión) |
|---|---|---|
| B1 | | |
| B2 | | |
| B3 | | |
| B4 | | |
| B5 | | |
| B6 | | |
| B7 | | |
| B8 | | |
| B9 | | |
| B10 | | |
| B11 | | |
| B12 | | |
| B13 | | |
| B14 | | |
| B15 | | |
| B16 | | |
| B17 | | |
| B18 | | |
| B19 | | |
| B20 | | |
| B21 | | |

Tomar capturas de pantalla de B5, B7 (las dos franjas) y B8 como evidencia; no deben mostrar datos personales.
Cualquier diferencia entre lo enviado y lo recibido es un **incidente**: anotar el mensaje exacto.

## 6. Después de la prueba

- Cerrar las dos apps. Los mensajes viven solo en memoria y desaparecen al cerrar.
- Opcional (revisión de temporales, RF-18): la app guarda cachés de Chromium sin contenido de la consulta en
  `%APPDATA%\techstar-lsm-consulta\` (Windows) o `~/Library/Application Support/techstar-lsm-consulta/` (macOS).
  Se pueden borrar sin problema.
- Si el firewall de Windows guardó una regla para Electron y se quiere quitar: Panel de control → Firewall de Windows
  Defender → «Permitir una aplicación…» → Electron.
