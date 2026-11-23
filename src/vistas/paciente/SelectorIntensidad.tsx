import type { ReactNode } from 'react';
import { INTENSIDAD_MAX, INTENSIDAD_MIN } from '../../nucleo/mensajes';
import type { Disponibilidad } from '../../nucleo/tipos';
import { RecursoLSM } from '../comunes/RecursoLSM';

interface Props {
  nombre: string;
  valor: number | undefined;
  recurso: Disponibilidad;
  deshabilitado?: boolean;
  onCambiar: (v: number | undefined) => void;
  /** Apoyo visual del síntoma (su video), para saber a cuál corresponde la escala sin tener que leer. */
  apoyo?: ReactNode;
}

const NIVELES = Array.from({ length: INTENSIDAD_MAX - INTENSIDAD_MIN + 1 }, (_, i) => i + INTENSIDAD_MIN);

/**
 * «¿Cuánto te duele?» con la barra degradada del prototipo.
 * Diferencia con Figma: empieza «sin indicar», sin valor por defecto (RF-19).
 */
export function SelectorIntensidad({ nombre, valor, recurso, deshabilitado, onCambiar, apoyo }: Props) {
  return (
    <div className="intensidad" role="group" aria-label={`Intensidad del dolor: ${nombre} (opcional)`}>
      <div className="intensidad__cabecera">
        {apoyo}
        <RecursoLSM disponibilidad={recurso} icono="escala" tamano="mini" etiqueta="Escala de dolor" />
        <span className="intensidad__pregunta">¿Cuánto te duele?</span>
        <span className="intensidad__opcional">Opcional</span>
      </div>
      <div className="intensidad__fila">
        <div className="intensidad__escala">
          {NIVELES.map((n) => (
            <button
              key={n}
              type="button"
              className="intensidad__nivel"
              aria-pressed={valor === n}
              aria-label={`${n} de 10`}
              disabled={deshabilitado}
              onClick={() => onCambiar(n)}
            >
              <span className="intensidad__numero">{n}</span>
            </button>
          ))}
        </div>
        <span className={`intensidad__valor ${valor === undefined ? 'intensidad__valor--vacio' : ''}`} aria-hidden="true">
          {valor ?? '–'}/10
        </span>
      </div>
      <div className="intensidad__extremos" aria-hidden="true">
        <span>Menor intensidad</span>
        <span>Mayor intensidad</span>
      </div>
      <button
        type="button"
        className="boton boton--chico boton--claro"
        aria-pressed={valor === undefined}
        disabled={deshabilitado}
        onClick={() => onCambiar(undefined)}
      >
        Sin indicar
      </button>
    </div>
  );
}
