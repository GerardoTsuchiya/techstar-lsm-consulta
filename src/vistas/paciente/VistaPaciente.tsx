import { useEffect, useId, useReducer, useRef, useState } from 'react';
import type { AdaptadorCamara } from '../../camara/adaptador';
import { crearCamaraNavegador } from '../../camara/camaraNavegador';
import { useAcuses, useSesion } from '../../cliente/useSesion';
import { generarId } from '../../nucleo/ids';
import { textosRevisados } from '../../nucleo/mensajes';
import { reducirTurno, turnoInicial } from '../../nucleo/turnoPaciente';
import type { Catalogo, Comando, InstantaneaSesion, MensajeMedico, MensajePaciente, Resultado } from '../../nucleo/tipos';
import { describirDiagnostico, esExperimental } from '../../reconocimiento/experimental/reconocedorExperimental';
import { reconocedorPorPolitica, type FabricaReconocedor } from '../../reconocimiento/reconocedor';
import type { ConexionCliente } from '../../transporte/tipos';
import { AvisoAlcance } from '../comunes/AvisoAlcance';
import { Cabecera, Pasos, TituloPantalla } from '../comunes/Cabecera';
import { Dialogo } from '../comunes/Dialogo';
import { IconoConversacion, IconoInfo, IconoListo, IconoReloj, IconoVideo } from '../comunes/Iconos';
import { AvisoCamara, PanelCaptura, PanelNoReconocido, PanelProcesando } from './PanelCaptura';
import { useCaptura } from './useCaptura';
import { MENSAJES_ERROR } from '../comunes/textos';
import { CatalogoPaciente } from './CatalogoPaciente';
import { ConversacionPaciente, EstadoEnvio, MensajeMedicoDestacado, RecordatorioMedico } from './MensajesPaciente';
import { RevisionPaciente } from './RevisionPaciente';

interface Props {
  conexion: ConexionCliente | null;
  catalogo: Catalogo;
  /** Cámara de este equipo (etapa C). Por omisión, la del navegador o Electron. Las pruebas usan una falsa. */
  crearCamara?: () => AdaptadorCamara;
  /** Reconocedor según la política de la sesión. Por omisión: simulador solo en desarrollo; en producto, ninguno. */
  crearReconocedor?: FabricaReconocedor;
}

/** Interfaz de la persona Sorda. Funciona igual con cualquier transporte. */
export function VistaPaciente({
  conexion,
  catalogo,
  crearCamara = crearCamaraNavegador,
  crearReconocedor = reconocedorPorPolitica,
}: Props) {
  const { instantanea, conectado, ultimaCerrada, enviar } = useSesion(conexion);

  if (!instantanea) {
    return (
      <section className="pantalla" aria-label="Vista del paciente">
        <Cabecera />
        <div className="espera">
          <span className="espera__icono">{ultimaCerrada ? <IconoListo /> : <IconoReloj />}</span>
          {!conectado ? (
            <p>Conectando con la computadora del médico…</p>
          ) : ultimaCerrada ? (
            <>
              <p className="espera__titulo">Consulta finalizada</p>
              <p>Se borraron los mensajes de esta consulta en esta pantalla.</p>
            </>
          ) : (
            <>
              <p className="espera__titulo">Te damos la bienvenida</p>
              <p>Esperando a que el personal médico inicie la consulta.</p>
            </>
          )}
        </div>
      </section>
    );
  }

  // La clave por sesión desmonta y borra todo el estado local al cambiar de sesión (RF-18).
  return (
    <SesionPaciente
      key={instantanea.sesionId}
      instantanea={instantanea}
      catalogo={catalogo}
      enviar={enviar}
      crearCamara={crearCamara}
      crearReconocedor={crearReconocedor}
    />
  );
}

function SesionPaciente(props: {
  instantanea: InstantaneaSesion;
  catalogo: Catalogo;
  enviar: (c: Comando) => Promise<Resultado>;
  crearCamara: () => AdaptadorCamara;
  crearReconocedor: FabricaReconocedor;
}) {
  const { instantanea, catalogo, enviar } = props;
  const { sesionId, politica, mensajes, aclaraciones } = instantanea;
  // Una cámara y un reconocedor por sesión: al cerrarla se desmontan y se liberan (RF-18).
  const [camara] = useState(() => props.crearCamara());
  const [reconocedor] = useState(() => props.crearReconocedor(politica, catalogo));
  const [avisoAbierto, setAvisoAbierto] = useState(true);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const [verConversacion, setVerConversacion] = useState(false);
  /** Último mensaje del médico que la persona ya atendió con «Responder» (solo en esta pantalla). */
  const [respondidoHasta, setRespondidoHasta] = useState<string | null>(null);
  const [turno, despachar] = useReducer(reducirTurno, turnoInicial);
  const [error, setError] = useState<string | null>(null);
  const enviando = useRef(false);
  const cuerpo = useRef<HTMLDivElement>(null);
  useAcuses(instantanea, 'paciente', enviar);
  const captura = useCaptura({ turno, despachar, camara, reconocedor, catalogo });
  // Solo modo desarrollo: distancia, umbral y tiempo del último resultado del reconocedor experimental.
  const detalleExperimental = esExperimental(reconocedor) ? describirDiagnostico(reconocedor.ultimoDiagnostico) : null;

  const ultimoMedico = [...mensajes].reverse().find((m): m is MensajeMedico => m.origen === 'medico');
  const ultimoPropio = [...mensajes].reverse().find((m): m is MensajePaciente => m.origen === 'paciente');
  // Mientras la cámara graba o se interpreta la seña, el mensaje nuevo del médico se anuncia arriba
  // sin ocultar la captura: la cámara nunca queda encendida detrás de otra pantalla (RF-17).
  const enCaptura = turno.fase === 'capturando' || turno.fase === 'procesando';
  const medicoPendiente = ultimoMedico !== undefined && ultimoMedico.id !== respondidoHasta;
  const mostrarMensajeMedico = medicoPendiente && !enCaptura;
  // Pregunta del médico que todavía no tiene respuesta: se recuerda en el catálogo mientras el paciente elige.
  const preguntaSinResponder = mensajes.at(-1)?.origen === 'medico' ? ultimoMedico : undefined;

  // Al cambiar de paso (catálogo ↔ captura ↔ revisión ↔ mensaje del médico) se muestra desde el principio.
  const paso = mostrarMensajeMedico ? 'medico' : turno.fase === 'enviando' ? 'revision' : turno.fase;
  useEffect(() => {
    cuerpo.current?.scrollTo?.({ top: 0 });
  }, [paso]);

  async function confirmar() {
    if (turno.fase !== 'revision' || enviando.current) return; // un solo envío por toque
    enviando.current = true;
    despachar({ tipo: 'confirmarIniciado' });
    const r = await enviar({
      tipo: 'confirmarMensajePaciente',
      sesionId,
      envioId: turno.envioId,
      via: turno.via,
      selecciones: turno.selecciones,
      textosRevisados: textosRevisados(catalogo, turno.selecciones),
    });
    enviando.current = false;
    if (r.ok) {
      setError(null);
      despachar({ tipo: 'confirmado' });
    } else {
      setError(MENSAJES_ERROR[r.error]);
      despachar({ tipo: 'confirmacionFallida' });
    }
  }

  async function noEntendi(mensajeId: string) {
    const r = await enviar({ tipo: 'solicitarAclaracion', sesionId, envioId: generarId('env'), mensajeId });
    setError(r.ok ? null : MENSAJES_ERROR[r.error]);
  }

  return (
    <section className="pantalla" aria-label="Vista del paciente">
      <Cabecera
        onFinalizar={() => setConfirmarCierre(true)}
        acciones={
          <>
            <button type="button" className="boton-cabecera" onClick={() => setAvisoAbierto(true)}>
              <IconoInfo /> Alcance
            </button>
            <button type="button" className="boton-cabecera" onClick={() => setVerConversacion(true)}>
              <IconoConversacion /> Conversación ({mensajes.length})
            </button>
          </>
        }
      />

      <div className="pantalla__cuerpo" ref={cuerpo}>
        {mostrarMensajeMedico ? (
          <>
            <TituloPantalla titulo="Mensaje del médico" rol="paciente" />
            <MensajeMedicoDestacado
              mensaje={ultimoMedico}
              catalogo={catalogo}
              politica={politica}
              avisoPendiente={aclaraciones.some((a) => a.mensajeId === ultimoMedico.id && !a.atendidaCon)}
              onNoEntendi={() => noEntendi(ultimoMedico.id)}
              onResponder={() => setRespondidoHasta(ultimoMedico.id)}
            />
          </>
        ) : (
          <>
            <TituloPantalla
              titulo="¿Esto es lo que quieres comunicar?"
              rol="paciente"
              izquierda={
                turno.fase === 'seleccion' ? (
                  <BotonCaptura
                    disponible={reconocedor !== null}
                    puedeIniciar={captura.puedeIniciar}
                    onIniciar={captura.iniciar}
                  />
                ) : undefined
              }
            >
              <Pasos actual={turno.fase === 'revision' ? 2 : turno.fase === 'enviando' ? 3 : 1} />
            </TituloPantalla>

            {enCaptura && medicoPendiente && (
              <p className="nota nota--info" role="status">
                Llegó un mensaje del médico: «{ultimoMedico.texto}». Lo verás completo al terminar la captura.
              </p>
            )}

            {turno.fase === 'capturando' && (
              <PanelCaptura
                camara={camara}
                estadoCamara={captura.estadoCamara}
                catalogo={catalogo}
                politica={politica}
                onListo={() => void captura.listo()}
                onCancelar={captura.cancelar}
                onCatalogo={captura.cancelar}
              />
            )}

            {turno.fase === 'procesando' && (
              <PanelProcesando
                capturaId={turno.capturaId}
                catalogo={catalogo}
                politica={politica}
                reconocedor={reconocedor}
                onCancelar={captura.cancelar}
              />
            )}

            {turno.fase === 'no-reconocido' && (
              <PanelNoReconocido
                experimental={reconocedor?.experimental === true}
                detalleExperimental={detalleExperimental}
                catalogo={catalogo}
                politica={politica}
                onReintentar={captura.iniciar}
                onCatalogo={captura.irAlCatalogo}
              />
            )}

            {turno.fase === 'seleccion' && (
              <>
                {captura.aviso && <AvisoCamara aviso={captura.aviso} onCerrar={captura.cerrarAviso} />}
                {error && (
                  <p className="nota nota--alerta" role="alert">
                    {error}
                  </p>
                )}
                <div className="catalogo-paciente__zona">
                  {/* Contexto junto al catálogo: la pregunta del médico que falta responder, con su video en grande
                      para no tener que recordarla; si no hay, lo último que dijo el paciente y si llegó. Con una
                      pregunta pendiente ya se sabe que el médico recibió el mensaje: todo el espacio es para el video. */}
                  {(ultimoPropio || preguntaSinResponder) && (
                    <div className="catalogo-paciente__contexto">
                      {preguntaSinResponder ? (
                        <RecordatorioMedico mensaje={preguntaSinResponder} catalogo={catalogo} politica={politica} />
                      ) : (
                        ultimoPropio && <EstadoEnvio mensaje={ultimoPropio} />
                      )}
                    </div>
                  )}
                  <CatalogoPaciente
                    catalogo={catalogo}
                    politica={politica}
                    selecciones={turno.selecciones}
                    onAlternar={(entradaId) => despachar({ tipo: 'alternarSeleccion', entradaId })}
                    onRevisar={() => {
                      setError(null);
                      despachar({ tipo: 'revisar', envioId: generarId('env') });
                    }}
                  />
                </div>
              </>
            )}

            {(turno.fase === 'revision' || turno.fase === 'enviando') && (
              <RevisionPaciente
                via={turno.via}
                simulado={turno.via === 'camara' && reconocedor?.simulado === true}
                experimental={turno.via === 'camara' && reconocedor?.experimental === true}
                detalleExperimental={detalleExperimental}
                catalogo={catalogo}
                politica={politica}
                selecciones={turno.selecciones}
                enviando={turno.fase === 'enviando'}
                error={error}
                onIntensidad={(entradaId, intensidad) =>
                  despachar({ tipo: 'fijarIntensidad', entradaId, intensidad, envioId: generarId('env') })
                }
                onConfirmar={confirmar}
                onModificar={() => {
                  setError(null);
                  despachar({ tipo: 'modificar' });
                }}
                onDescartar={() => {
                  setError(null);
                  despachar({ tipo: 'descartar' });
                }}
              />
            )}
          </>
        )}
      </div>

      {avisoAbierto && <AvisoAlcance catalogo={catalogo} politica={politica} onCerrar={() => setAvisoAbierto(false)} />}
      {verConversacion && (
        <Dialogo
          titulo="Conversación"
          ancho
          onCerrar={() => setVerConversacion(false)}
          acciones={
            <button type="button" className="boton boton--primario" onClick={() => setVerConversacion(false)} data-autofoco>
              Cerrar
            </button>
          }
        >
          <ConversacionPaciente instantanea={instantanea} catalogo={catalogo} onNoEntendi={noEntendi} />
        </Dialogo>
      )}
      {confirmarCierre && (
        <Dialogo
          titulo="¿Finalizar la consulta?"
          onCerrar={() => setConfirmarCierre(false)}
          acciones={
            <>
              <button type="button" className="boton boton--secundario" onClick={() => setConfirmarCierre(false)} data-autofoco>
                Seguir en la consulta
              </button>
              <button type="button" className="boton boton--peligro" onClick={() => void enviar({ tipo: 'cerrarSesion', sesionId })}>
                Terminar y borrar
              </button>
            </>
          }
        >
          <p>Se borrarán los mensajes de esta consulta en las dos pantallas.</p>
        </Dialogo>
      )}
    </section>
  );
}

/**
 * «Captura en LSM» (vía de la cámara, RF-17). Solo inicia con el catálogo sin opciones elegidas,
 * para no perder una selección. En el flujo de producto no hay reconocedor real todavía: el
 * botón se muestra deshabilitado con su explicación (el simulador nunca se ofrece ahí).
 */
function BotonCaptura(props: { disponible: boolean; puedeIniciar: boolean; onIniciar: () => void }) {
  const idMotivo = useId();
  const motivo = !props.disponible
    ? 'El reconocimiento en LSM todavía no está disponible.'
    : !props.puedeIniciar
      ? 'Quita las opciones elegidas para usar la cámara.'
      : null;
  return (
    <span className="via-camara__grupo">
      <button
        type="button"
        className="via-camara"
        disabled={motivo !== null}
        onClick={props.onIniciar}
        aria-describedby={motivo ? idMotivo : undefined}
      >
        <IconoVideo /> Captura en LSM
      </button>
      {motivo && (
        <span id={idMotivo} className="via-camara__motivo">
          {motivo}
        </span>
      )}
    </span>
  );
}
