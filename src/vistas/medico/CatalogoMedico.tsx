import { forwardRef } from 'react';
import { buscarPorTermino } from '../../nucleo/busqueda';
import { sugerencias, type Sugerencia } from '../../nucleo/recomendaciones';
import { buscarEntrada, recursoDeEntrada } from '../../nucleo/recursos';
import type { Catalogo, Disponibilidad, EntradaCatalogo, Mensaje, PoliticaRecursos, TipoEntrada } from '../../nucleo/tipos';
import { IconoCheck, IconoGlobo } from '../comunes/Iconos';
import { IconoEntrada } from '../comunes/IconoEntrada';
import { RecursoLSM } from '../comunes/RecursoLSM';
import { tituloDe } from '../comunes/textos';

const TIPOS_MEDICO: TipoEntrada[] = ['pregunta-medico', 'respuesta-medico'];

interface Props {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  /** Mensajes de la sesión: de ellos salen las preguntas sugeridas (D55). */
  mensajes: readonly Mensaje[];
  consulta: string;
  onConsulta: (q: string) => void;
  seleccionId: string | null;
  onSeleccionar: (id: string | null) => void;
  enviando: boolean;
  error: string | null;
  onEnviar: () => void;
}

/**
 * «Buscar en el catálogo» del prototipo (RF-14) y revisión antes de enviar (RF-02).
 * Seleccionar («Mostrar al paciente») abre la revisión; no envía.
 * Diferencia con Figma: la revisión muestra también el recurso en LSM que verá el paciente.
 */
export const CatalogoMedico = forwardRef<HTMLInputElement, Props>(function CatalogoMedico(p, ref) {
  const { catalogo, politica } = p;
  const seleccion = p.seleccionId ? buscarEntrada(catalogo, p.seleccionId) : undefined;

  if (seleccion) {
    const recurso = recursoDeEntrada(catalogo, seleccion, politica);
    const bloqueado = recurso.estado === 'bloqueado';
    return (
      <div className="revision-medico" aria-label="Revisar antes de enviar">
        <span className="revision-medico__rotulo">Revisar antes de enviar</span>
        <h3 className="revision-medico__pregunta">¿Seguro que quiere mandar el mensaje?</h3>
        <p className="revision-medico__texto">{seleccion.texto}</p>
        <RecursoLSM disponibilidad={recurso} icono={seleccion.icono} tamano="ancho" etiqueta={seleccion.texto} />
        {!bloqueado && (
          <p className="revision-medico__ayuda">
            El paciente verá exactamente este texto y este recurso. Nada se envía hasta pulsar «Enviar».
          </p>
        )}
        {bloqueado && (
          <p className="nota nota--alerta" role="alert">
            {recurso.motivo === 'recurso-no-validado'
              ? 'El recurso de esta entrada no está validado. En el flujo de producto no se puede enviar.'
              : 'Esta entrada no tiene recurso en LSM validado. No se puede enviar ni sustituir por otro recurso.'}
          </p>
        )}
        {p.error && (
          <p className="nota nota--alerta" role="alert">
            {p.error}
          </p>
        )}
        <div className="revision-medico__acciones">
          <button type="button" className="boton boton--primario boton--alto" onClick={p.onEnviar} disabled={bloqueado || p.enviando}>
            <span className="boton__circulo">
              <IconoCheck />
            </span>
            {p.enviando ? 'Enviando…' : 'Enviar al paciente'}
          </button>
          <button
            type="button"
            className="boton boton--secundario boton--alto"
            onClick={() => p.onSeleccionar(null)}
            disabled={p.enviando}
          >
            No, seleccionar otra frase
          </button>
        </div>
      </div>
    );
  }

  const resultados = buscarPorTermino(catalogo.entradas, p.consulta, TIPOS_MEDICO);

  return (
    <div className="buscador">
      <span className="etiqueta-icono">
        <span className="etiqueta-icono__icono">
          <IconoGlobo />
        </span>
        Responder al paciente
      </span>
      <h3 className="buscador__titulo">Buscar en el catálogo</h3>
      <p className="buscador__ayuda">Selecciona una entrada para mostrar su mensaje y recurso asociado.</p>
      <label className="buscador__etiqueta" htmlFor="buscar-catalogo">
        Buscar pregunta o respuesta
      </label>
      <input
        id="buscar-catalogo"
        ref={ref}
        className="buscador__campo"
        type="search"
        autoComplete="off"
        placeholder="Ej.: alergia, fiebre, esperar…"
        value={p.consulta}
        onChange={(e) => p.onConsulta(e.target.value)}
      />
      {resultados === null ? (
        <>
          <p className="buscador__nota">Escriba parte de un término. No distingue mayúsculas ni tildes.</p>
          <Sugeridas catalogo={catalogo} politica={politica} mensajes={p.mensajes} onSeleccionar={p.onSeleccionar} />
        </>
      ) : resultados.length === 0 ? (
        <p className="buscador__vacio" role="status">
          Sin resultados
        </p>
      ) : (
        <>
          <p className="buscador__nota">
            {resultados.length} {resultados.length === 1 ? 'resultado' : 'resultados'}
          </p>
          <ul className="resultados" aria-label="Resultados">
            {resultados.map((e) => (
              <TarjetaEntrada key={e.id} entrada={e} catalogo={catalogo} politica={politica} onSeleccionar={p.onSeleccionar} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
});

/** Une nombres en español: «Tos», «Tos y Fiebre», «Tos, Fiebre y Mareo». */
function unir(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

/**
 * Preguntas sugeridas cuando la búsqueda está vacía (D55): las recomendadas por los síntomas que
 * el paciente confirmó y las generales. Elegir una abre la misma revisión antes de enviar (RF-02).
 */
function Sugeridas(p: {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  mensajes: readonly Mensaje[];
  onSeleccionar: (id: string) => void;
}) {
  const { porSintomas, generales } = sugerencias(p.catalogo, p.mensajes);
  const grupo = (titulo: string, lista: Sugerencia[]) =>
    lista.length > 0 && (
      <>
        <h4 className="buscador__grupo">{titulo}</h4>
        <ul className="resultados" aria-label={titulo}>
          {lista.map((s) => {
            const entrada = buscarEntrada(p.catalogo, s.entradaId);
            if (!entrada) return null;
            const sintomas = s.porSintomas
              .map((id) => buscarEntrada(p.catalogo, id))
              .filter((e): e is EntradaCatalogo => e !== undefined);
            return (
              <TarjetaEntrada
                key={s.entradaId}
                entrada={entrada}
                catalogo={p.catalogo}
                politica={p.politica}
                motivo={sintomas.length > 0 ? `por ${unir(sintomas.map(tituloDe))}` : undefined}
                onSeleccionar={p.onSeleccionar}
              />
            );
          })}
        </ul>
      </>
    );
  return (
    <>
      {grupo('Sugeridas por los síntomas', porSintomas)}
      {grupo('Preguntas generales', generales)}
    </>
  );
}

/** Una entrada del catálogo del médico como botón «Mostrar al paciente» (resultados y sugerencias). */
function TarjetaEntrada(p: {
  entrada: EntradaCatalogo;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  motivo?: string;
  onSeleccionar: (id: string) => void;
}) {
  const e = p.entrada;
  return (
    <li>
      <button type="button" className="resultado" onClick={() => p.onSeleccionar(e.id)}>
        <span className="resultado__titulo">
          <span className="resultado__icono"><IconoEntrada clave={e.icono} tamano={16} /></span> {tituloDe(e)}
          <ChipRecurso d={recursoDeEntrada(p.catalogo, e, p.politica)} />
        </span>
        <span className="resultado__texto">{e.texto}</span>
        <span className="resultado__meta">
          <code>{e.id}</code> · {e.tipo === 'pregunta-medico' ? 'Pregunta' : 'Respuesta'}
          {p.motivo && <> · {p.motivo}</>}
        </span>
        <span className="pastilla pastilla--blanca" aria-hidden="true">
          Mostrar al paciente
        </span>
      </button>
    </li>
  );
}

function ChipRecurso({ d }: { d: Disponibilidad }) {
  if (d.estado === 'validado') return <span className="chip chip--ok">LSM validado</span>;
  if (d.estado === 'prueba') return <span className="chip chip--prueba">Recurso de prueba</span>;
  return <span className="chip chip--faltante">{d.motivo === 'sin-recurso' ? 'Sin recurso' : 'Sin validar'}</span>;
}
