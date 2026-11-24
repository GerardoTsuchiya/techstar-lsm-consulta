import { useLayoutEffect, useRef, useState } from 'react';
import { recursoDeEntrada } from '../../nucleo/recursos';
import type { Catalogo, EntradaCatalogo, PoliticaRecursos, Seleccion } from '../../nucleo/tipos';
import { IconoCheck, IconoChevron } from '../comunes/Iconos';
import { RecursoLSM } from '../comunes/RecursoLSM';
import { tituloDe } from '../comunes/textos';

interface Props {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  selecciones: Seleccion[];
  onAlternar: (entradaId: string) => void;
  onRevisar: () => void;
}

const POR_PAGINA = 6;

/**
 * Alto que queda para las tarjetas sin desplazarse: el alto visible de la pantalla menos todo lo demás que contiene
 * (cabecera, avisos, pie con la paginación). Se escribe en `--alto-disponible` de la zona del catálogo y el CSS
 * deriva de él el tamaño de los videos (tarjetas y pregunta del médico). Se mide de nuevo en cada render (cambian los
 * avisos de arriba) y al cambiar el tamaño de la ventana.
 */
function useAltoDisponible() {
  const lista = useRef<HTMLUListElement>(null);
  const medir = () => {
    const ul = lista.current;
    const cuerpo = ul?.closest<HTMLElement>('.pantalla__cuerpo');
    const catalogo = ul?.parentElement;
    if (!ul || !cuerpo || !catalogo) return;
    const caja = cuerpo.getBoundingClientRect();
    const tarjetas = ul.getBoundingClientRect();
    // Arriba: desde el borde del área visible (con su relleno) hasta las tarjetas, sin contar el desplazamiento.
    const arriba = tarjetas.top - caja.top + cuerpo.scrollTop;
    // Abajo: el pie con la paginación y el relleno inferior del área.
    const abajo =
      catalogo.getBoundingClientRect().bottom - tarjetas.bottom + parseFloat(getComputedStyle(cuerpo).paddingBottom);
    const alto = `${Math.max(0, Math.floor(cuerpo.clientHeight - arriba - abajo))}px`;
    const destino = ul.closest<HTMLElement>('.catalogo-paciente__zona') ?? ul;
    if (destino.style.getPropertyValue('--alto-disponible') !== alto) destino.style.setProperty('--alto-disponible', alto);
  };
  useLayoutEffect(medir);
  useLayoutEffect(() => {
    const cuerpo = lista.current?.closest<HTMLElement>('.pantalla__cuerpo');
    if (!cuerpo || typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(() => medir());
    observador.observe(cuerpo);
    return () => observador.disconnect();
  }, []);
  return lista;
}

/** Catálogo del paciente (RF-19) con la cuadrícula paginada del prototipo. Tocar no envía. */
export function CatalogoPaciente({ catalogo, politica, selecciones, onAlternar, onRevisar }: Props) {
  const [pagina, setPagina] = useState(0);
  const lista = useAltoDisponible();
  const entradas = catalogo.entradas.filter((e) => e.tipo === 'sintoma' || e.tipo === 'respuesta-paciente');
  const paginas = Math.max(1, Math.ceil(entradas.length / POR_PAGINA));
  const visibles = entradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const elegida = (id: string) => selecciones.some((s) => s.entradaId === id);

  return (
    <div className="catalogo-paciente">
      <ul ref={lista} className="tarjetas" aria-label={`Opciones, página ${pagina + 1} de ${paginas}`}>
        {visibles.map((e) => (
          <li key={e.id}>
            <Tarjeta entrada={e} catalogo={catalogo} politica={politica} elegida={elegida(e.id)} onAlternar={() => onAlternar(e.id)} />
          </li>
        ))}
      </ul>

      <div className="catalogo-paciente__pie">
        <div className="paginacion">
          <button
            type="button"
            className="paginacion__boton"
            aria-label="Página anterior"
            disabled={pagina === 0}
            onClick={() => setPagina((p) => p - 1)}
          >
            <IconoChevron direccion="izquierda" />
          </button>
          <span className="paginacion__texto">
            {pagina + 1} de {paginas}
          </span>
          <button
            type="button"
            className="paginacion__boton paginacion__boton--activo"
            aria-label="Página siguiente"
            disabled={pagina >= paginas - 1}
            onClick={() => setPagina((p) => p + 1)}
          >
            <IconoChevron />
          </button>
        </div>
        <button
          type="button"
          className="boton boton--primario boton--revisar"
          disabled={selecciones.length === 0}
          onClick={onRevisar}
        >
          <span>Revisar selección</span>
          <span className="boton--revisar__cuenta" aria-live="polite">
            ({selecciones.length})
          </span>
          <IconoChevron />
        </button>
      </div>
    </div>
  );
}

function Tarjeta(props: {
  entrada: EntradaCatalogo;
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  elegida: boolean;
  onAlternar: () => void;
}) {
  const { entrada: e, elegida } = props;
  const recurso = recursoDeEntrada(props.catalogo, e, props.politica);
  const titulo = tituloDe(e);
  return (
    <button
      type="button"
      className={`tarjeta ${elegida ? 'tarjeta--elegida' : ''} ${recurso.estado === 'bloqueado' ? 'tarjeta--sin-recurso' : ''}`}
      aria-pressed={elegida}
      aria-label={titulo}
      onClick={props.onAlternar}
    >
      <RecursoLSM disponibilidad={recurso} icono={e.icono} tamano="ancho" etiqueta={e.texto} enBoton />
      {/* Toda la tarjeta es el botón: la selección se marca sobre el video (palomita) y con el borde. */}
      <span className={`tarjeta__marca ${elegida ? 'tarjeta__marca--elegida' : ''}`} aria-hidden="true">
        {elegida && <IconoCheck />}
      </span>
      <span className="tarjeta__titulo">{titulo}</span>
      {e.tipo === 'respuesta-paciente' && <span className="tarjeta__provisional">Provisional</span>}
    </button>
  );
}
