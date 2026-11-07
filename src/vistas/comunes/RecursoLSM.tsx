import type { Disponibilidad } from '../../nucleo/tipos';
import { IconoEntrada } from './IconoEntrada';
import { IconoReproducir } from './Iconos';

interface Props {
  disponibilidad: Disponibilidad;
  /** Clave del icono de apoyo visual de la entrada. */
  icono?: string;
  /** `ancho` ocupa todo el ancho disponible, como los videos del prototipo. */
  tamano?: 'ancho' | 'grande' | 'mediano' | 'mini';
  /** Para lectores de pantalla: qué mensaje acompaña. */
  etiqueta: string;
}

/** Silueta neutra de intérprete: indica «aquí va un video en LSM» sin simular una seña real. */
function Silueta() {
  return (
    <svg className="recurso__silueta" viewBox="0 0 160 100" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <circle cx="80" cy="37" r="14" />
      <path d="M46 100c0-25 14-40 34-40s34 15 34 40Z" />
    </svg>
  );
}

/**
 * Presenta el recurso en LSM asociado a un mensaje (RI-01).
 * - validado: reproduce el archivo registrado.
 * - prueba: marcador con etiqueta «Recurso de prueba». Nunca se presenta como LSM.
 * - bloqueado: informa que falta; no muestra otro recurso en su lugar.
 * Usa solo elementos en línea para poder ir dentro de botones.
 */
export function RecursoLSM({ disponibilidad: d, icono, tamano = 'mediano', etiqueta }: Props) {
  const clase = `recurso recurso--${tamano}`;

  if (d.estado === 'validado' && d.recurso.src) {
    const { recurso } = d;
    return (
      <span className={`${clase} recurso--validado`} data-recurso={recurso.id}>
        {recurso.tipo === 'video' ? (
          <video src={recurso.src} controls loop muted playsInline aria-label={`Video en LSM: ${etiqueta}`} />
        ) : (
          <img src={recurso.src} alt={`Apoyo visual en LSM: ${etiqueta}`} />
        )}
      </span>
    );
  }

  // Versión mínima (dentro de botones): insignia circular «ver seña».
  if (tamano === 'mini') {
    const prueba = d.estado === 'prueba';
    return (
      <span
        className={`recurso recurso--mini ${prueba ? 'recurso--prueba' : 'recurso--faltante'}`}
        role="img"
        aria-label={prueba ? `Recurso de prueba, no es LSM validado: ${etiqueta}` : `Sin recurso en LSM: ${etiqueta}`}
        title={prueba ? `Recurso de prueba ${d.recurso.id}: no es LSM validado` : 'Sin recurso en LSM validado'}
        data-recurso={prueba ? d.recurso.id : undefined}
      >
        <IconoReproducir tamano={10} />
      </span>
    );
  }

  if (d.estado === 'prueba') {
    return (
      <span
        className={`${clase} recurso--prueba`}
        role="img"
        aria-label={`Recurso de prueba, no es LSM validado: ${etiqueta}`}
        data-recurso={d.recurso.id}
        title={`Recurso de prueba ${d.recurso.id}: no es LSM validado`}
      >
        <span className="recurso__cuerpo" aria-hidden="true">
          <Silueta />
          <span className="recurso__icono">
            <IconoEntrada clave={icono} tamano={tamano === 'mediano' ? 16 : 24} />
          </span>
          <span className="recurso__play">
            <IconoReproducir tamano={tamano === 'mediano' ? 11 : 14} />
          </span>
        </span>
        <span className="recurso__etiqueta" aria-hidden="true">
          {tamano === 'mediano' ? 'Prueba' : 'Prueba · no es LSM'}
        </span>
      </span>
    );
  }

  // Validado sin archivo cargado también se trata como faltante: no se inventa un recurso.
  const motivo =
    d.estado === 'bloqueado' && d.motivo === 'recurso-no-validado' ? 'Recurso sin validar' : 'Sin recurso en LSM';
  return (
    <span className={`${clase} recurso--faltante`} role="img" aria-label={`${motivo}: ${etiqueta}`}>
      <span className="recurso__cuerpo" aria-hidden="true">
        <span className="recurso__vacio">
          <IconoEntrada clave={icono} tamano={tamano === 'mediano' ? 22 : 30} />
          <span>{motivo}</span>
        </span>
      </span>
    </span>
  );
}
