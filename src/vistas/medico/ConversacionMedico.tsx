import { useEffect, useRef } from 'react';
import { buscarEntrada } from '../../nucleo/recursos';
import type { Catalogo, InstantaneaSesion, MensajeMedico } from '../../nucleo/tipos';
import { IconoEntrada } from '../comunes/IconoEntrada';
import { IconoDobleCheck, IconoEnviado } from '../comunes/Iconos';
import { horaCorta } from '../comunes/textos';

interface Props {
  instantanea: InstantaneaSesion;
  catalogo: Catalogo;
  resaltado: string | null;
}

/**
 * Conversación del lado médico con el diseño «Mensaje del paciente» del prototipo:
 * solo mensajes confirmados (RF-04, RF-07) y avisos vinculados (RF-15).
 */
export function ConversacionMedico({ instantanea, catalogo, resaltado }: Props) {
  const { mensajes, aclaraciones } = instantanea;
  const refs = useRef(new Map<string, HTMLLIElement>());
  const fin = useRef<HTMLLIElement>(null);

  useEffect(() => {
    fin.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' });
  }, [mensajes.length]);

  useEffect(() => {
    if (resaltado) refs.current.get(resaltado)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }, [resaltado]);

  if (mensajes.length === 0) {
    return <p className="vacio vacio--claro">Todavía no hay mensajes. Aquí aparecerán solo los mensajes que el paciente confirme.</p>;
  }

  const textoDe = (id: string) => (mensajes.find((m) => m.id === id) as MensajeMedico | undefined)?.texto;

  return (
    <ol className="hilo" aria-label="Conversación" aria-live="polite">
      {mensajes.map((m) => {
        const registrar = (el: HTMLLIElement | null) => {
          if (el) refs.current.set(m.id, el);
          else refs.current.delete(m.id);
        };
        if (m.origen === 'paciente') {
          return (
            <li key={m.id} ref={registrar} className="hilo__paciente" data-mensaje={m.id}>
              <span className="hilo__rotulo">
                Paciente · confirmado {horaCorta(m.confirmadoEn)} · {m.via === 'catalogo' ? 'catálogo' : 'cámara'}
              </span>
              <ul className="hilo__items">
                {m.items.map((it) => (
                  <li key={it.entradaId} className="sintoma">
                    <span className="sintoma__picto">
                      <IconoEntrada clave={buscarEntrada(catalogo, it.entradaId)?.icono} tamano={26} />
                    </span>
                    <span className="sintoma__cuerpo">
                      <span className="sintoma__texto">{it.texto}</span>
                      {it.intensidad !== undefined && (
                        <span className="sintoma__dolor">
                          <span className="sintoma__valor" aria-hidden="true">
                            {it.intensidad}/10
                          </span>
                          <span className="sintoma__leyenda">Intensidad del dolor: {it.intensidad} de 10</span>
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          );
        }
        const avisos = aclaraciones.filter((a) => a.mensajeId === m.id);
        const pendiente = avisos.some((a) => !a.atendidaCon);
        return (
          <li
            key={m.id}
            ref={registrar}
            className={`hilo__medico ${pendiente ? 'hilo__medico--no-entendido' : ''} ${resaltado === m.id ? 'hilo__medico--resaltado' : ''}`}
            data-mensaje={m.id}
          >
            <span className="hilo__rotulo">
              Usted · {horaCorta(m.enviadoEn)} · <code>{m.entradaId}</code>
            </span>
            <p className="hilo__texto">{m.texto}</p>
            <span className={`hilo__estado ${m.recibidoEn ? 'hilo__estado--ok' : ''}`}>
              {m.recibidoEn ? <IconoDobleCheck /> : <IconoEnviado />}
              {m.recibidoEn ? 'Se mostró en la pantalla del paciente' : 'Enviado · esperando que se muestre'}
            </span>
            {avisos.map((a) => (
              <span key={a.id} className={`chip ${a.atendidaCon ? 'chip--atendido' : 'chip--alerta'}`} data-aclaracion={a.id}>
                {a.atendidaCon
                  ? `Pidió aclaración · respondida con «${textoDe(a.atendidaCon) ?? '—'}»`
                  : 'El paciente no entendió este mensaje'}
              </span>
            ))}
          </li>
        );
      })}
      <li ref={fin} aria-hidden="true" className="hilo__fin" />
    </ol>
  );
}
