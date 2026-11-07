import { useRef, useState } from 'react';
import { useAcuses, useSesion } from '../../cliente/useSesion';
import { generarId, idCorto } from '../../nucleo/ids';
import type { Catalogo, Comando, InstantaneaSesion, MensajeMedico, Resultado } from '../../nucleo/tipos';
import type { ConexionCliente } from '../../transporte/tipos';
import { Cabecera, TituloPantalla } from '../comunes/Cabecera';
import { Dialogo } from '../comunes/Dialogo';
import { IconoCheck, IconoPregunta, IconoVideo } from '../comunes/Iconos';
import { MENSAJES_ERROR } from '../comunes/textos';
import { CatalogoMedico } from './CatalogoMedico';
import { ConversacionMedico } from './ConversacionMedico';

interface Props {
  conexion: ConexionCliente | null;
  catalogo: Catalogo;
}

/** Interfaz del personal médico. En las laptops, esta computadora aloja el coordinador. */
export function VistaMedico({ conexion, catalogo }: Props) {
  const { instantanea, ultimaCerrada, enviar } = useSesion(conexion);
  const [error, setError] = useState<string | null>(null);

  if (!instantanea) {
    const iniciar = async () => {
      const r = await enviar({ tipo: 'iniciarSesion' });
      setError(r.ok ? null : MENSAJES_ERROR[r.error]);
    };
    return (
      <section className="pantalla" aria-label="Vista del personal médico">
        <Cabecera />
        <div className="pantalla__cuerpo">
          <TituloPantalla titulo={ultimaCerrada ? 'Consulta finalizada' : 'Comencemos la consulta'} rol="medico" />
          <div className="dos-columnas">
            <div className="panel-salvia panel-salvia--centrado">
              <span className="camara-espera">
                <IconoVideo />
              </span>
              <p className="panel-salvia__nota">
                {ultimaCerrada ? 'Cámara y mensajes liberados' : 'Coloque la pantalla del paciente de forma que pueda verla y usar los controles.'}
              </p>
            </div>
            <div className="tarjeta-crema espera-medico">
              {ultimaCerrada ? (
                <>
                  <h3 className="tarjeta-crema__titulo">Consulta finalizada</h3>
                  <p>Se eliminaron los mensajes y avisos de la sesión en las dos pantallas.</p>
                </>
              ) : (
                <>
                  <h3 className="tarjeta-crema__titulo">Preparación</h3>
                  <p>No hay una consulta activa. Al iniciarla, el paciente verá primero el aviso de alcance.</p>
                </>
              )}
              {error && (
                <p className="nota nota--alerta" role="alert">
                  {error}
                </p>
              )}
              <button type="button" className="boton boton--primario boton--alto" onClick={iniciar}>
                <span className="boton__circulo">
                  <IconoCheck />
                </span>
                {ultimaCerrada ? 'Nueva consulta' : 'Iniciar consulta'}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <SesionMedico key={instantanea.sesionId} instantanea={instantanea} catalogo={catalogo} enviar={enviar} />;
}

function SesionMedico(props: {
  instantanea: InstantaneaSesion;
  catalogo: Catalogo;
  enviar: (c: Comando) => Promise<Resultado>;
}) {
  const { instantanea, catalogo, enviar } = props;
  const { sesionId, politica, mensajes, aclaraciones } = instantanea;
  const [consulta, setConsulta] = useState('');
  const [seleccionId, setSeleccionId] = useState<string | null>(null);
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resaltado, setResaltado] = useState<string | null>(null);
  const [confirmarCierre, setConfirmarCierre] = useState(false);
  const enviandoRef = useRef(false);
  const busqueda = useRef<HTMLInputElement>(null);
  useAcuses(instantanea, 'medico', enviar);

  const pendientes = aclaraciones.filter((a) => !a.atendidaCon);
  const delPaciente = mensajes.filter((m) => m.origen === 'paciente').length;

  function seleccionar(id: string | null) {
    setError(null);
    setSeleccionId(id);
    // Un identificador por revisión: un doble clic en «Enviar» no duplica.
    setEnvioId(id ? generarId('env') : null);
  }

  async function enviarSeleccion() {
    if (!seleccionId || !envioId || enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    const r = await enviar({ tipo: 'enviarEntradaMedico', sesionId, envioId, entradaId: seleccionId });
    enviandoRef.current = false;
    setEnviando(false);
    if (r.ok) {
      seleccionar(null);
      setResaltado(null);
    } else {
      setError(MENSAJES_ERROR[r.error]);
    }
  }

  return (
    <section className="pantalla" aria-label="Vista del personal médico">
      <Cabecera
        onFinalizar={() => setConfirmarCierre(true)}
        acciones={
          <span className="cabecera__sesion">
            Sesión <code title={sesionId}>{idCorto(sesionId)}</code>
          </span>
        }
      />

      <div className="pantalla__cuerpo">
        <TituloPantalla titulo="Consulta en curso" rol="medico" />

        {pendientes.length > 0 && (
          <div className="alertas" role="alert">
            {pendientes.map((a) => {
              const m = mensajes.find((x) => x.id === a.mensajeId) as MensajeMedico | undefined;
              return (
                <div key={a.id} className="alerta-aclaracion" data-aclaracion-de={a.mensajeId}>
                  <span className="alerta-aclaracion__icono">
                    <IconoPregunta tamano={20} />
                  </span>
                  <div className="alerta-aclaracion__texto">
                    <strong>El paciente no entendió:</strong> «{m?.texto ?? '—'}»
                  </div>
                  <div className="alerta-aclaracion__acciones">
                    <button type="button" className="boton boton--chico boton--claro" onClick={() => setResaltado(a.mensajeId)}>
                      Ver mensaje
                    </button>
                    <button
                      type="button"
                      className="boton boton--chico boton--primario"
                      onClick={() => {
                        seleccionar(null);
                        setConsulta('');
                        setResaltado(a.mensajeId);
                        setTimeout(() => busqueda.current?.focus(), 0);
                      }}
                    >
                      Elegir otra entrada
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="dos-columnas dos-columnas--medico">
          <div className="panel-salvia panel-salvia--hilo">
            <h3 className="panel-salvia__titulo">Mensaje del paciente ({delPaciente})</h3>
            <ConversacionMedico instantanea={instantanea} catalogo={catalogo} resaltado={resaltado} />
          </div>
          <div className="tarjeta-crema">
            <CatalogoMedico
              ref={busqueda}
              catalogo={catalogo}
              politica={politica}
              consulta={consulta}
              onConsulta={setConsulta}
              seleccionId={seleccionId}
              onSeleccionar={seleccionar}
              enviando={enviando}
              error={error}
              onEnviar={enviarSeleccion}
            />
          </div>
        </div>
      </div>

      {confirmarCierre && (
        <Dialogo
          titulo="¿Finalizar la consulta?"
          onCerrar={() => setConfirmarCierre(false)}
          acciones={
            <>
              <button type="button" className="boton boton--secundario" onClick={() => setConfirmarCierre(false)} data-autofoco>
                Cancelar
              </button>
              <button type="button" className="boton boton--peligro" onClick={() => void enviar({ tipo: 'cerrarSesion', sesionId })}>
                Terminar y borrar
              </button>
            </>
          }
        >
          <p>Se eliminarán los mensajes y avisos de esta sesión en las dos pantallas. La siguiente consulta empezará vacía.</p>
        </Dialogo>
      )}
    </section>
  );
}
