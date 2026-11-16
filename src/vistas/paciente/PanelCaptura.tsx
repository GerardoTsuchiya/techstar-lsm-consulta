import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { AdaptadorCamara, EstadoCamara } from '../../camara/adaptador';
import { buscarEntrada, recursoDeSistema } from '../../nucleo/recursos';
import type { Catalogo, PoliticaRecursos } from '../../nucleo/tipos';
import type { Reconocedor } from '../../reconocimiento/reconocedor';
import { esSimulado, type ReconocedorSimulado } from '../../reconocimiento/reconocedorSimulado';
import {
  IconoCargando,
  IconoCheck,
  IconoChevron,
  IconoMatraz,
  IconoReintentar,
  IconoVideoApagado,
  IconoX,
} from '../comunes/Iconos';
import { RecursoLSM } from '../comunes/RecursoLSM';
import { tituloDe } from '../comunes/textos';
import type { AvisoCaptura } from './useCaptura';

/** Panel «Captura en LSM»: cámara activa, «Listo» y «Cancelar» (RF-17). */
export function PanelCaptura(props: {
  camara: AdaptadorCamara;
  estadoCamara: EstadoCamara;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const { camara, estadoCamara, catalogo, politica } = props;
  const video = useRef<HTMLVideoElement>(null);
  const activa = estadoCamara === 'activa';
  const segundos = useSegundosActiva(activa);
  const maximo = Math.round(camara.duracionMaximaMs / 1000);
  const enLimite = activa && maximo > 0 && segundos >= maximo;

  useEffect(() => {
    if (!video.current) return;
    return camara.mostrarEn(video.current);
  }, [camara]);

  return (
    <div className="captura dos-columnas" aria-label="Captura en LSM">
      <div className="panel-salvia captura__panel">
        <h3 className="panel-salvia__titulo">Captura en LSM</h3>
        <div className={`captura__video ${activa ? 'captura__video--activa' : ''}`}>
          {/* Imagen en espejo, como en una videollamada. Sin audio: no se pide el micrófono. */}
          <video ref={video} autoPlay muted playsInline aria-label="Imagen de tu cámara" />
          {!activa && (
            <span className="captura__encendiendo" role="status">
              <IconoCargando />
              Encendiendo la cámara…
            </span>
          )}
          {/* RF-17: indica cuándo la cámara está activa. */}
          <span className="indicador-camara" role="status">
            {activa && (
              <>
                <span className="indicador-camara__punto" aria-hidden="true" />
                Cámara activa
                {maximo > 0 && (
                  <span className="indicador-camara__tiempo" aria-hidden="true">
                    {reloj(Math.min(segundos, maximo))} / {reloj(maximo)}
                  </span>
                )}
              </>
            )}
          </span>
        </div>
      </div>

      <div className="tarjeta-crema captura__acciones">
        <p className="captura__instruccion">Haz tu seña frente a la cámara. Cuando termines, pulsa «Listo».</p>
        {/* Cancelar y Listo se distinguen por color, icono, texto y posición, como descartar y confirmar. */}
        <div className="captura__botones">
          <BotonCancelar catalogo={catalogo} politica={politica} onCancelar={props.onCancelar} />
          <button type="button" className="boton boton--primario boton--alto" onClick={props.onListo} disabled={!activa}>
            <span className="boton__circulo">
              <IconoCheck />
            </span>
            Listo
          </button>
        </div>
        {enLimite && (
          <p className="nota nota--info" role="status">
            Llegaste al máximo de {maximo} segundos. Pulsa «Listo» o «Cancelar».
          </p>
        )}
        <p className="captura__privacidad">
          La imagen no se guarda y el médico no la ve. Solo se usa para interpretar este mensaje.
        </p>
      </div>
    </div>
  );
}

/** «Listo» ya se pulsó: la cámara está apagada y se espera el resultado. */
export function PanelProcesando(props: {
  capturaId: string;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  reconocedor: Reconocedor | null;
  onCancelar: () => void;
}) {
  const { catalogo, politica, reconocedor } = props;
  return (
    <div className="captura dos-columnas" aria-label="Interpretando la seña">
      <div className="panel-salvia panel-salvia--centrado captura__panel">
        <span className="captura__procesando" role="status">
          <IconoCargando />
          <span className="panel-salvia__titulo">Interpretando tu seña…</span>
        </span>
        <span className="captura__apagada">
          <IconoVideoApagado tamano={16} /> La cámara ya está apagada.
        </span>
      </div>
      <div className="tarjeta-crema captura__acciones">
        <p className="captura__instruccion">En un momento verás lo que entendimos para que lo revises.</p>
        <p className="captura__privacidad">Nada se envía al médico hasta que confirmes.</p>
        <BotonCancelar catalogo={catalogo} politica={politica} onCancelar={props.onCancelar} />
        {esSimulado(reconocedor) && <OperadorSimulado reconocedor={reconocedor} capturaId={props.capturaId} catalogo={catalogo} />}
      </div>
    </div>
  );
}

/** Aviso accesible de expresión desconocida con reintento o catálogo (RF-05). */
export function PanelNoReconocido(props: {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  onReintentar: () => void;
  onCatalogo: () => void;
}) {
  const { catalogo, politica } = props;
  return (
    <div className="captura dos-columnas" aria-label="Seña no reconocida">
      <div className="panel-salvia panel-salvia--centrado captura__panel">
        <RecursoLSM
          disponibilidad={recursoDeSistema(catalogo, 'expresionDesconocida', politica)}
          icono="desconocida"
          tamano="grande"
          etiqueta="No reconocimos tu seña"
        />
      </div>
      <div className="tarjeta-crema captura__acciones">
        <div role="alert" className="captura__aviso">
          <h3 className="tarjeta-crema__titulo">No reconocimos tu seña</h3>
          <p>Puede que no esté en el catálogo o que no se haya visto bien. No se envió nada.</p>
        </div>
        <button type="button" className="boton boton--primario boton--alto" onClick={props.onReintentar}>
          <IconoReintentar /> Intentar de nuevo
        </button>
        <button type="button" className="boton boton--secundario boton--alto" onClick={props.onCatalogo}>
          Elegir lo que sientes <IconoChevron />
        </button>
      </div>
    </div>
  );
}

const TEXTO_AVISO: Record<AvisoCaptura, { titulo: string; detalle: string }> = {
  denegada: {
    titulo: 'No hay permiso para usar la cámara.',
    detalle:
      'Para usarla, permite la cámara en el navegador o en Windows (Configuración › Privacidad › Cámara). Mientras tanto, puedes elegir lo que sientes en el catálogo.',
  },
  'no-disponible': {
    titulo: 'No se encontró una cámara en este equipo.',
    detalle: 'Puedes elegir lo que sientes en el catálogo.',
  },
  ocupada: {
    titulo: 'La cámara está en uso por otra aplicación.',
    detalle: 'Ciérrala e intenta de nuevo, o elige lo que sientes en el catálogo.',
  },
  error: {
    titulo: 'La cámara dejó de responder. Se descartó la captura.',
    detalle: 'Intenta de nuevo o elige lo que sientes en el catálogo.',
  },
  'sin-clip': {
    titulo: 'No se pudo grabar la seña.',
    detalle: 'Intenta de nuevo o elige lo que sientes en el catálogo.',
  },
  'fallo-reconocimiento': {
    titulo: 'No se pudo interpretar la seña. No se envió nada.',
    detalle: 'Intenta de nuevo o elige lo que sientes en el catálogo.',
  },
};

/** Aviso sobre el catálogo cuando la cámara no se pudo usar. El catálogo sigue disponible. */
export function AvisoCamara({ aviso, onCerrar }: { aviso: AvisoCaptura; onCerrar: () => void }) {
  const t = TEXTO_AVISO[aviso];
  return (
    <div className="nota nota--alerta aviso-camara" role="alert" data-aviso-camara={aviso}>
      <IconoVideoApagado />
      <span>
        <strong>{t.titulo}</strong> {t.detalle}
      </span>
      <button type="button" className="aviso-camara__cerrar" onClick={onCerrar} aria-label="Cerrar aviso">
        <IconoX />
      </button>
    </div>
  );
}

function BotonCancelar(props: { catalogo: Catalogo; politica: PoliticaRecursos; onCancelar: () => void }) {
  return (
    <button type="button" className="boton boton--quitar boton--alto captura__cancelar" onClick={props.onCancelar}>
      <RecursoLSM
        disponibilidad={recursoDeSistema(props.catalogo, 'cancelarCaptura', props.politica)}
        icono="cancelar-captura"
        tamano="mini"
        etiqueta="Cancelar"
      />
      <IconoX /> Cancelar
    </button>
  );
}

/**
 * ⚠ Solo modo desarrollo. Controles del operador del reconocedor SIMULADO.
 * No es reconocimiento real: una persona elige el resultado para probar la interfaz.
 */
function OperadorSimulado(props: { reconocedor: ReconocedorSimulado; capturaId: string; catalogo: Catalogo }) {
  const { reconocedor, capturaId, catalogo } = props;
  const pendiente = useSyncExternalStore(
    (fn) => reconocedor.alPendiente(fn),
    () => reconocedor.capturaPendiente,
  );
  const [entradaId, setEntradaId] = useState(reconocedor.vocabulario[0] ?? '');
  const espera = pendiente === capturaId;

  return (
    <section className="simulador" aria-label="Simulador del reconocimiento (modo desarrollo)">
      <p className="simulador__titulo">
        <IconoMatraz /> Simulador · no es reconocimiento real
      </p>
      <p className="simulador__texto">
        El clip no se analiza. Quien dirige la prueba elige el resultado para probar la interfaz. Nunca aparece en el
        flujo de producto.
      </p>
      <label className="simulador__campo">
        Reconocido como
        <select value={entradaId} onChange={(e) => setEntradaId(e.target.value)}>
          {reconocedor.vocabulario.map((id) => {
            const entrada = buscarEntrada(catalogo, id);
            return (
              <option key={id} value={id}>
                {entrada ? tituloDe(entrada) : id}
              </option>
            );
          })}
        </select>
      </label>
      <div className="simulador__botones">
        <button
          type="button"
          className="boton boton--chico simulador__boton"
          disabled={!espera || !entradaId}
          onClick={() => reconocedor.elegir(capturaId, { tipo: 'reconocido', entradaId })}
        >
          Simular «reconocido»
        </button>
        <button
          type="button"
          className="boton boton--chico simulador__boton"
          disabled={!espera}
          onClick={() => reconocedor.elegir(capturaId, { tipo: 'desconocido' })}
        >
          Simular «desconocido»
        </button>
      </div>
    </section>
  );
}

function useSegundosActiva(activa: boolean): number {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    setSegundos(0);
    if (!activa) return;
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 250);
    return () => clearInterval(id);
  }, [activa]);
  return segundos;
}

function reloj(s: number): string {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
