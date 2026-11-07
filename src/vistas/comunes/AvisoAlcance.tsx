import { useEffect, useRef } from 'react';
import { TEXTO_AVISO_ALCANCE } from '../../catalogo/catalogoFicticio';
import { recursoDeSistema } from '../../nucleo/recursos';
import type { Catalogo, PoliticaRecursos } from '../../nucleo/tipos';
import { IconoCheck } from './Iconos';
import { RecursoLSM } from './RecursoLSM';

interface Props {
  catalogo: Catalogo;
  politica: PoliticaRecursos;
  onCerrar: () => void;
}

/**
 * Aviso de alcance (RF-16, RC-01), con el diseño de «Alcance de este apoyo» del prototipo.
 * Si falta el recurso validado, lo dice y no lo presenta como accesible en LSM.
 */
export function AvisoAlcance({ catalogo, politica, onCerrar }: Props) {
  const recurso = recursoDeSistema(catalogo, 'avisoAlcance', politica);
  const boton = useRef<HTMLButtonElement>(null);
  // Foco en el botón sin desplazar: el aviso se lee desde el principio.
  useEffect(() => boton.current?.focus({ preventScroll: true }), []);

  return (
    <div className="capa" onKeyDown={(e) => e.key === 'Escape' && onCerrar()}>
      <div className="capa__contenido" role="dialog" aria-modal="true" aria-label="Alcance de este apoyo">
        <h2 className="capa__titulo">Alcance de este apoyo</h2>
        <div className="dos-columnas">
          <div className="panel-salvia">
            <h3 className="panel-salvia__titulo">Mensaje en LSM</h3>
            <RecursoLSM disponibilidad={recurso} icono="alcance" tamano="ancho" etiqueta="Aviso de alcance" />
          </div>
          <div className="tarjeta-crema aviso-alcance">
            <p>{TEXTO_AVISO_ALCANCE.parrafos[0]}</p>
            <p className="aviso-alcance__destacado">No sustituye a un intérprete de LSM.</p>
            <p>{TEXTO_AVISO_ALCANCE.parrafos[1]}</p>
            <p>{TEXTO_AVISO_ALCANCE.parrafos[2]}</p>
            {recurso.estado !== 'validado' && (
              <p className="nota nota--alerta" role="note">
                Este aviso todavía no tiene un recurso en LSM validado.
              </p>
            )}
            <button ref={boton} type="button" className="boton boton--primario boton--alto" onClick={onCerrar}>
              <span className="boton__circulo">
                <IconoCheck />
              </span>
              Entendido, continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
