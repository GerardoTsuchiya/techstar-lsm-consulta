import { textosRevisados } from '../../nucleo/mensajes';
import { buscarEntrada, recursoDeEntrada, recursoDeSistema, sePuedeEnviar } from '../../nucleo/recursos';
import type { Catalogo, PoliticaRecursos, Seleccion, ViaPaciente } from '../../nucleo/tipos';
import { IconoCheck, IconoChevron, IconoGlobo, IconoMatraz, IconoVideo, IconoX } from '../comunes/Iconos';
import { RecursoLSM } from '../comunes/RecursoLSM';
import { EtiquetaExperimental } from './PanelCaptura';
import { tituloDe } from '../comunes/textos';
import { SelectorIntensidad } from './SelectorIntensidad';

interface Props {
  /** Catálogo o cámara: las dos vías se revisan igual (RF-03). */
  via: ViaPaciente;
  /** El candidato de la cámara lo eligió el simulador (modo desarrollo), no un reconocedor real. */
  simulado?: boolean;
  /** El candidato lo dio el reconocedor experimental (no validado), con su detalle para desarrollo. */
  experimental?: boolean;
  detalleExperimental?: string | null;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  selecciones: Seleccion[];
  enviando: boolean;
  error: string | null;
  onIntensidad: (entradaId: string, v: number | undefined) => void;
  onConfirmar: () => void;
  onModificar: () => void;
  onDescartar: () => void;
}

/**
 * Vista previa del mensaje pendiente (RF-03), con el diseño de «PS-Revisión opciones».
 * El borrador sigue solo en esta pantalla (RF-04).
 * Confirmar y descartar se distinguen por color, forma, icono, texto y posición (RF-07).
 */
export function RevisionPaciente(p: Props) {
  const { catalogo, politica, selecciones } = p;
  const textos = textosRevisados(catalogo, selecciones);
  const recursoIntensidad = recursoDeSistema(catalogo, 'intensidadDolor', politica);

  const filas = selecciones.map((s) => {
    const entrada = buscarEntrada(catalogo, s.entradaId)!;
    const recurso = recursoDeEntrada(catalogo, entrada, politica);
    const intensidadBloqueada = s.intensidad !== undefined && !sePuedeEnviar(recursoIntensidad);
    return { s, entrada, recurso, bloqueada: !sePuedeEnviar(recurso) || intensidadBloqueada };
  });
  const puedeConfirmar = filas.every((f) => !f.bloqueada) && !p.enviando;

  return (
    <div className="revision" aria-label="Revisión del mensaje">
      {p.via === 'camara' && (
        <p className="nota nota--info revision__via" data-via="camara">
          <IconoVideo />
          <span>
            <strong>Esto es lo que entendimos de tu seña.</strong> Revisa que sea lo que quieres decir antes de
            confirmar.
          </span>
          {p.simulado && (
            <span className="chip chip--prueba">
              <IconoMatraz /> Resultado simulado · no es reconocimiento real
            </span>
          )}
          {p.experimental && <EtiquetaExperimental detalle={p.detalleExperimental} />}
        </p>
      )}
      <div className="dos-columnas">
        <div className={`panel-salvia ${filas.some(({ entrada }) => entrada.esDolor) ? 'revision--con-dolor' : ''}`}>
          <h3 className="panel-salvia__titulo">Opciones seleccionadas ({selecciones.length})</h3>
          <ul className="revision__lista">
            {filas.map(({ s, entrada, recurso, bloqueada }) => (
              <li key={s.entradaId} className={`revision__item ${bloqueada ? 'revision__item--bloqueado' : ''}`}>
                {/* El video es lo principal: muchas personas Sordas no leen español. El texto lo acompaña. */}
                <RecursoLSM disponibilidad={recurso} icono={entrada.icono} tamano="ancho" etiqueta={entrada.texto} reproducirSolo />
                <span className="revision__titulo">{tituloDe(entrada)}</span>
                {bloqueada && (
                  <span className="nota nota--alerta" role="alert">
                    Falta el recurso en LSM validado. Quita esta opción para poder confirmar.
                  </span>
                )}
              </li>
            ))}
          </ul>
          {/* La escala va a todo el ancho, debajo de las tarjetas, para que sus botones sean fáciles de tocar. */}
          {filas
            .filter(({ entrada }) => entrada.esDolor)
            .map(({ s, entrada, recurso }) => (
              <SelectorIntensidad
                key={s.entradaId}
                nombre={entrada.termino}
                valor={s.intensidad}
                recurso={recursoIntensidad}
                deshabilitado={p.enviando}
                onCambiar={(v) => p.onIntensidad(entrada.id, v)}
                apoyo={<RecursoLSM disponibilidad={recurso} icono={entrada.icono} tamano="mediano" etiqueta={entrada.texto} reproducirSolo />}
              />
            ))}
        </div>

        <div className="tarjeta-crema revision__mensaje">
          <span className="etiqueta-icono">
            <span className="etiqueta-icono__icono">
              <IconoGlobo />
            </span>
            Mensaje a enviar
          </span>
          <ul className="caja-durazno" aria-label="El médico leerá exactamente">
            {textos.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="revision__ayuda">
            <RecursoLSM
              disponibilidad={recursoDeSistema(catalogo, 'revisar', politica)}
              icono="ver-mensaje"
              tamano="mini"
              etiqueta="Revisa tu mensaje"
            />
            <span>Todavía no se ha enviado. Solo tú lo ves.</span>
          </div>
          {p.error && (
            <p className="nota nota--alerta" role="alert">
              {p.error}
            </p>
          )}
          <button type="button" className="boton boton--quitar" onClick={p.onDescartar} disabled={p.enviando}>
            <RecursoLSM
              disponibilidad={recursoDeSistema(catalogo, 'descartar', politica)}
              icono="descartar"
              tamano="mini"
              etiqueta="Descartar"
            />
            <IconoX /> Descartar mensaje
          </button>
        </div>
      </div>

      <div className="acciones-centradas">
        {/* La propuesta de la cámara no se edita como una selección del catálogo: se confirma o se descarta. */}
        {p.via === 'catalogo' && (
          <button type="button" className="boton boton--secundario boton--alto" onClick={p.onModificar} disabled={p.enviando}>
            <IconoChevron direccion="izquierda" /> Cambiar selección
          </button>
        )}
        <button type="button" className="boton boton--primario boton--alto" onClick={p.onConfirmar} disabled={!puedeConfirmar}>
          <RecursoLSM
            disponibilidad={recursoDeSistema(catalogo, 'confirmar', politica)}
            icono="confirmar"
            tamano="mini"
            etiqueta="Confirmar"
          />
          <span className="boton__circulo">
            <IconoCheck />
          </span>
          {p.enviando ? 'Enviando…' : 'Confirmar mensaje'}
        </button>
      </div>
    </div>
  );
}
