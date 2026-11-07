import { textoDeItem } from '../../nucleo/mensajes';
import { buscarEntrada, recursoDeSistema, resolverRecurso } from '../../nucleo/recursos';
import type { Catalogo, InstantaneaSesion, MensajeMedico, MensajePaciente, PoliticaRecursos } from '../../nucleo/tipos';
import { IconoDobleCheck, IconoEnviado, IconoPregunta, IconoVideo } from '../comunes/Iconos';
import { RecursoLSM } from '../comunes/RecursoLSM';
import { horaCorta } from '../comunes/textos';

/** Botón «No entendí» con apoyo visual y recurso (RF-15), o el aviso ya enviado. */
function NoEntendi(props: { catalogo: Catalogo; politica: PoliticaRecursos; avisoPendiente: boolean; onNoEntendi: () => void }) {
  if (props.avisoPendiente) {
    return (
      <p className="nota nota--info" role="status">
        <IconoEnviado /> Le avisamos al médico que no entendiste este mensaje.
      </p>
    );
  }
  return (
    <button type="button" className="boton boton--no-entendi" onClick={props.onNoEntendi}>
      <RecursoLSM
        disponibilidad={recursoDeSistema(props.catalogo, 'noEntendi', props.politica)}
        icono="no-entendi"
        tamano="mini"
        etiqueta="No entendí"
      />
      <span className="boton__circulo boton__circulo--info">
        <IconoPregunta />
      </span>
      No entendí
    </button>
  );
}

/**
 * Pantalla «Mensaje del médico» del prototipo: recurso a la izquierda, texto grande a la derecha.
 * Diferencia con Figma: añade «No entendí» (RF-15) junto al mensaje, al lado de «Responder».
 */
export function MensajeMedicoDestacado(props: {
  mensaje: MensajeMedico;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  avisoPendiente: boolean;
  onNoEntendi: () => void;
  onResponder: () => void;
}) {
  const { mensaje: m, catalogo, politica } = props;
  const entrada = buscarEntrada(catalogo, m.entradaId);
  // Se muestra exactamente el recurso registrado en el mensaje enviado (RI-01).
  const recurso = resolverRecurso(catalogo, m.recursoId, politica);
  return (
    <div className="dos-columnas mensaje-medico" data-mensaje={m.id}>
      <div className="panel-salvia">
        <h3 className="panel-salvia__titulo">Mensaje en LSM</h3>
        <RecursoLSM disponibilidad={recurso} icono={entrada?.icono} tamano="ancho" etiqueta={m.texto} />
      </div>
      <div className="tarjeta-crema mensaje-medico__tarjeta">
        <span className="mensaje-medico__hora">Médico · {horaCorta(m.enviadoEn)}</span>
        <p className="mensaje-medico__texto">{m.texto}</p>
        <div className="mensaje-medico__acciones">
          <NoEntendi catalogo={catalogo} politica={politica} avisoPendiente={props.avisoPendiente} onNoEntendi={props.onNoEntendi} />
          <button type="button" className="boton boton--primario boton--alto" onClick={props.onResponder}>
            <IconoVideo /> Responder
          </button>
        </div>
      </div>
    </div>
  );
}

/** Estado del último mensaje enviado por el paciente. «Recibido» solo con acuse (RF-20). */
export function EstadoEnvio({ mensaje }: { mensaje: MensajePaciente }) {
  return (
    <div className="estado-envio" role="status">
      <span className="estado-envio__rotulo">Tu último mensaje · {horaCorta(mensaje.confirmadoEn)}</span>
      <span className="estado-envio__texto">
        {mensaje.items.map(textoDeItem).join(' · ')}
      </span>
      <span className={`estado-envio__estado ${mensaje.recibidoEn ? 'estado-envio__estado--ok' : ''}`}>
        {mensaje.recibidoEn ? <IconoDobleCheck /> : <IconoEnviado />}
        {mensaje.recibidoEn ? 'El médico lo recibió' : 'Enviado'}
      </span>
    </div>
  );
}

/** Conversación completa (diálogo «Conversación»): permite pedir aclaración de mensajes anteriores. */
export function ConversacionPaciente({
  instantanea,
  catalogo,
  onNoEntendi,
}: {
  instantanea: InstantaneaSesion;
  catalogo: Catalogo;
  onNoEntendi: (mensajeId: string) => void;
}) {
  const { mensajes, aclaraciones, politica } = instantanea;
  if (mensajes.length === 0) {
    return <p className="vacio">Aquí verás las preguntas y respuestas del médico.</p>;
  }
  return (
    <ol className="conversacion" aria-label="Conversación">
      {mensajes.map((m) =>
        m.origen === 'medico' ? (
          <li key={m.id} className="conversacion__medico" data-historial={m.id}>
            <span className="conversacion__rotulo">Médico · {horaCorta(m.enviadoEn)}</span>
            <div className="conversacion__fila">
              <RecursoLSM
                disponibilidad={resolverRecurso(catalogo, m.recursoId, politica)}
                icono={buscarEntrada(catalogo, m.entradaId)?.icono}
                tamano="mediano"
                etiqueta={m.texto}
              />
              <div className="conversacion__lado">
                <p className="conversacion__texto">{m.texto}</p>
                <NoEntendi
                  catalogo={catalogo}
                  politica={politica}
                  avisoPendiente={aclaraciones.some((a) => a.mensajeId === m.id && !a.atendidaCon)}
                  onNoEntendi={() => onNoEntendi(m.id)}
                />
              </div>
            </div>
          </li>
        ) : (
          <li key={m.id} className="conversacion__propio">
            <span className="conversacion__rotulo">Tú · {horaCorta(m.confirmadoEn)}</span>
            {m.items.map((it) => (
              <span key={it.entradaId} className="conversacion__linea">
                {textoDeItem(it)}
              </span>
            ))}
            <span className="conversacion__estado">{m.recibidoEn ? 'Recibido por el médico' : 'Enviado'}</span>
          </li>
        ),
      )}
    </ol>
  );
}
