# TechStar · LSM Consulta

Prototipo para apoyar la comunicación entre una persona Sorda que usa Lengua de Señas Mexicana (LSM) y el médico
durante una consulta general. Lo desarrollamos para la materia Aseguramiento de la Calidad del Software (UABC, 2026-2).

Es una app de escritorio hecha con Electron y React. Tiene una vista para el médico y otra para el paciente, que se
pueden abrir en la misma computadora o en dos laptops conectadas a la misma red Wi-Fi.


## Requisitos

- [Node.js](https://nodejs.org) 22 (22.13 o posterior) o 24 en adelante. Nosotros lo probamos con la 22.15. npm viene
  incluido con Node.
- Windows 10/11, macOS o Linux.
- Git, si van a clonar el repositorio (también se puede descargar como ZIP).

Para saber qué versión de Node tienen instalada:

```bash
node --version
```

## Descargar

Con Git:

```bash
git clone https://github.com/GerardoTsuchiya/techstar-lsm-consulta.git
cd techstar-lsm-consulta
```

Sin Git: en GitHub, botón verde **Code → Download ZIP**. Descompriman el archivo y abran una terminal dentro de la
carpeta.

## Instalar

```bash
npm ci
```

La primera instalación tarda algunos minutos porque descarga Electron.

## Ejecutar

### En una sola computadora

```bash
npm run electron:demo
```

Abre una ventana con las vistas del médico y del paciente lado a lado, sin necesidad de red. Es la manera más directa
de probar el prototipo y la que usamos como respaldo en la presentación.

También funciona en el navegador:

```bash
npm run dev
```

Después entren a http://127.0.0.1:5173, elijan «Modo desarrollo» y luego «Demostración en una pantalla».

### En dos laptops

Ambas laptops tienen que estar en la misma red Wi-Fi y tener el proyecto instalado.

1. En la laptop del médico:

   ```bash
   npm run electron:medico
   ```

   Si Windows pide permiso en el firewall, permitan el acceso solo en redes privadas. En el panel «Vincular el equipo del paciente»
   aparece el código de vinculación de 10 caracteres y, en letra pequeña debajo, la dirección de la laptop (por ejemplo
   `192.168.1.20:47100`).

2. En la laptop del paciente:

   ```bash
   npm run electron:paciente
   ```

   Escriban solo el código que muestra la laptop del médico y pulsen «Vincular». El equipo encuentra solo a la
   computadora del médico en la misma red (D56). Si no la encuentra, usen «Conectar escribiendo la dirección» con la
   dirección que aparece en pequeño bajo el código.

3. Al conectarse, el paciente ve «Conectado con la computadora del médico» y el médico «Laptop del paciente
   conectada». A partir de ahí ya se puede hacer la consulta.

Si no logran conectarse, lo más probable es que la red de la universidad tenga aislados los equipos entre sí. En ese
caso, conecten ambas laptops al punto de acceso de un celular. La red debe permitir que los equipos se vean entre sí;
en redes con aislamiento de clientes (algunas universidades y hospitales), comparte la red desde un celular. El protocolo completo de esta prueba está en
[guias/PRUEBA_DOS_LAPTOPS.md](guias/PRUEBA_DOS_LAPTOPS.md).

## Prueba rápida

1. Médico: «Iniciar consulta». Paciente: «Entendido, continuar».
2. Paciente: elegir «Dolor de cabeza» y «Fiebre», pulsar «Revisar selección», indicar intensidad 7 y «Confirmar
   mensaje».
3. Médico: buscar `alergia`, pulsar «Mostrar al paciente» en la pregunta y después «Enviar al paciente».
4. Paciente: pulsar «No entendí». Al médico le aparece un aviso para que elija otra frase.
5. Médico: «Finalizar consulta» → «Terminar y borrar». Las dos vistas se vacían.

El guion completo, con los casos de error y la captura con cámara, está en [guias/GUION_DEMO.md](guias/GUION_DEMO.md).

## Comandos

| Comando | Para qué sirve |
|---|---|
| `npm run electron:demo` | Médico y paciente en una ventana, con el reconocedor experimental de señas |
| `npm run electron:demo-simulado` | Igual, pero el resultado de la cámara lo elige manualmente quien dirige la prueba |
| `npm run electron:medico` | Abre la app en modo médico (laptop del médico) |
| `npm run electron:paciente` | Abre la app en modo paciente (laptop del paciente) |
| `npm run electron:medico-local` | Modo médico accesible solo desde esta computadora, para probar ambos modos en la misma máquina; el paciente encuentra al médico en `127.0.0.1` con solo el código |
| `npm run dev` | Versión de navegador en http://127.0.0.1:5173 |
| `npm test` | Ejecuta las pruebas automáticas |
| `npm run check` | Revisión completa: tipos de TypeScript, catálogo, pruebas y compilación. Conviene correrlo antes de subir cambios |
| `npm run validar-catalogo` | Revisa que el catálogo no tenga errores |

## Cámara y reconocimiento de señas

En la vista del paciente hay un botón «Captura en LSM» que graba un clip de hasta 15 segundos. El reconocedor que
incluimos es experimental: solo conoce 8 señas, y con personas que no aparecen en los videos de entrenamiento casi
nunca acierta, así que lo normal es que responda «No reconocimos tu seña». Los resultados de su evaluación están en
[guias/RECONOCEDOR.md](guias/RECONOCEDOR.md).

En Windows, si la cámara no enciende, revisen *Configuración › Privacidad › Cámara* y activen el acceso para
aplicaciones de escritorio.

## Editar el catálogo

Las frases y sus videos están en [catalogo/ficticio-dev.json](catalogo/ficticio-dev.json) y se pueden modificar sin
tocar código:

1. Editen el archivo; lo más sencillo es copiar una entrada parecida y cambiarle los datos.
2. Corran `npm run validar-catalogo` y corrijan lo que marque.
3. Corran `npm run docs-recursos` para actualizar el inventario [guias/RECURSOS_LSM.md](guias/RECURSOS_LSM.md).

La descripción de cada campo y los pasos para registrar un video validado están en [guias/CATALOGO.md](guias/CATALOGO.md).

## Privacidad

- La información de la consulta solo se guarda en memoria y se borra al terminarla. No se crean archivos ni registros.
- Entre las dos laptops, los mensajes viajan cifrados; solo la laptop que conoce el código de vinculación puede leerlos.
- El clip de la cámara no se guarda ni se envía a la laptop del médico.
- Usen solo datos ficticios. La carpeta `Entrevistas/` no se sube al repositorio.

## Estado

- Terminado: la consulta completa en una pantalla, la conexión entre dos laptops y la captura con cámara.
- Pendiente: hacer la prueba con dos laptops reales, conseguir videos en LSM validados y muestras para entrenar el
  reconocedor, y la versión para tableta Android.

La organización del código está explicada en [guias/MODULOS.md](guias/MODULOS.md).
