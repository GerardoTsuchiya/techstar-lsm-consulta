import { useState } from 'react';
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

/** Catálogo del paciente (RF-19) con la cuadrícula paginada del prototipo. Tocar no envía. */
export function CatalogoPaciente({ catalogo, politica, selecciones, onAlternar, onRevisar }: Props) {
  const [pagina, setPagina] = useState(0);
  const entradas = catalogo.entradas.filter((e) => e.tipo === 'sintoma' || e.tipo === 'respuesta-paciente');
  const paginas = Math.max(1, Math.ceil(entradas.length / POR_PAGINA));
  const visibles = entradas.slice(pagina * POR_PAGINA, (pagina + 1) * POR_PAGINA);
  const elegida = (id: string) => selecciones.some((s) => s.entradaId === id);

  return (
    <div className="catalogo-paciente">
      <ul className="tarjetas" aria-label={`Opciones, página ${pagina + 1} de ${paginas}`}>
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
      <RecursoLSM disponibilidad={recurso} icono={e.icono} tamano="ancho" etiqueta={e.texto} />
      {e.tipo === 'respuesta-paciente' && <span className="tarjeta__provisional">Provisional</span>}
      <span className="tarjeta__pie">
        <span className="tarjeta__titulo">{titulo}</span>
        <span className={`pastilla ${elegida ? 'pastilla--elegida' : ''}`} aria-hidden="true">
          {elegida ? <IconoCheck /> : <span className="pastilla__punto" />}
          {elegida ? 'Elegido' : 'Elegir'}
        </span>
      </span>
    </button>
  );
}
