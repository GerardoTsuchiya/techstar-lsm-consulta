# Modelos del reconocedor experimental

Archivos que carga el reconocedor experimental (solo modo desarrollo) **sin internet**. Ver
[Docs/RECONOCEDOR.md](../../Docs/RECONOCEDOR.md).

| Archivo | Qué es | Procedencia | Licencia | SHA-256 |
|---|---|---|---|---|
| `hand_landmarker.task` | MediaPipe Hand Landmarker (float16, versión 1): 21 puntos por mano | `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task` (descargado el 20/11/2026) | Apache-2.0 (Google, MediaPipe) | `fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1` |
| `pose_landmarker_lite.task` | MediaPipe Pose Landmarker lite (float16, versión 1): se usan solo los hombros | `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task` (descargado el 20/11/2026) | Apache-2.0 (Google, MediaPipe) | `59929e1d1ee95287735ddd833b19cf4ac46d29bc7afddbbf6753c459690d574a` |
| `plantillas-lsm.json` | Plantillas (características numéricas, sin imágenes) de 17 videos web de 8 señas y sus espejos, con los umbrales de rechazo | Generado por `npm run evaluar-reconocedor` a partir de videos de Iztacala Enseña, Indiscapacidad CDMX y Sol Lara, con permiso de entrenamiento | Uso del proyecto (derivado de videos con permiso de sus fuentes) | — |

El código WebAssembly de MediaPipe no se guarda aquí: se copia de `node_modules/@mediapipe/tasks-vision/wasm`
(versión 1.2.2, Apache-2.0) a `mediapipe/` al compilar (`vite.mediapipe.ts`).
