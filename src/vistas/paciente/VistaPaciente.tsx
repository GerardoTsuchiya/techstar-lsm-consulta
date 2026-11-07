import { useEffect, useReducer, useRef, useState } from 'react';
import { useAcuses, useSesion } from '../../cliente/useSesion';
import { generarId } from '../../nucleo/ids';
import { textosRevisados } from '../../nucleo/mensajes';
import { reducirTurno, turnoInicial } from '../../nucleo/turnoPaciente';
import type { Catalogo, Comando, InstantaneaSesion, MensajeMedico, MensajePaciente, Resultado } from '../../nucleo/tipos';
import type { ConexionCliente } from '../../transporte/tipos';
import { AvisoAlcance } from '../comunes/AvisoAlcance';
import { Cabecera, Pasos, TituloPantalla } from '../comunes/Cabecera';
import { Dialogo } from '../comunes/Dialogo';
import { IconoConversacion, IconoInfo, IconoListo, IconoReloj, IconoVideo } from '../comunes/Iconos';
import { MENSAJES_ERROR } from '../comunes/textos';
import { CatalogoPaciente } from './CatalogoPaciente';
import { ConversacionPaciente, EstadoEnvio, MensajeMedicoDestacado } from './MensajesPaciente';
import { RevisionPaciente } from './RevisionPaciente';

interface Props {
  conexion: ConexionCliente | null;
  catalogo: Catalogo;
}

/** Interfaz de la persona Sorda. Funciona igual con cualquier transporte. */
export function VistaPaciente({ conexion, catalogo }: Props) {
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
  return <SesionPaciente key={instantanea.sesionId} instantanea={instantanea} catalogo={catalogo} enviar={enviar} />;
}

function SesionPaciente(props: {
  instantanea: InstantaneaSesion;
  catalogo: Catalogo;
  enviar: (c: Comando) => Promise<Resultado>;
}) {
  const { instantanea, catalogo, enviar } = props;
  const { sesionId, politica, mensajes, aclaraciones } = instantanea;
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

  const ultimoMedico = [...mensajes].reverse().find((m): m is MensajeMedico => m.origen === 'medico');
  const ultimoPropio = [...mensajes].reverse().find((m): m is MensajePaciente => m.origen === 'paciente');
  const mostrarMensajeMedico = ultimoMedico !== undefined && ultimoMedico.id !== respondidoHasta;

  // Al cambiar de paso (catálogo ↔ revisión ↔ mensaje del médico) se muestra desde el principio.
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
      via: 'catalogo',
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
                <button type="button" className="via-camara" disabled title="Se integra en la etapa C">
                  <IconoVideo /> Captura en LSM · etapa C
                </button>
              }
            >
              <Pasos actual={turno.fase === 'seleccion' ? 1 : turno.fase === 'enviando' ? 3 : 2} />
            </TituloPantalla>

            {turno.fase === 'seleccion' && (
              <>
                {ultimoPropio && <EstadoEnvio mensaje={ultimoPropio} />}
                {error && (
                  <p className="nota nota--alerta" role="alert">
                    {error}
                  </p>
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
              </>
            )}

            {(turno.fase === 'revision' || turno.fase === 'enviando') && (
              <RevisionPaciente
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
