import { useState } from 'react';
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
  /**
   * Va dentro de un botón (tarjeta del catálogo). El video se reproduce solo, en bucle y sin controles:
   * un control interactivo dentro de un botón no es válido y su clic también elegiría la tarjeta.
   */
  enBoton?: boolean;
  /**
   * El video empieza solo, sin sonido y en bucle, con los controles visibles. Para lo que el paciente debe ver
   * sin tener que pulsar «play»: el mensaje del médico y su propia revisión.
   */
  reproducirSolo?: boolean;
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

/** Se reproduce el archivo si es validado, o si es de prueba con archivo y no va dentro de un botón (mini). */
function reproduceArchivo(d: Disponibilidad, tamano: NonNullable<Props['tamano']>): boolean {
  if (d.estado === 'bloqueado' || d.recurso.tipo === 'marcador-prueba' || !d.recurso.src) return false;
  return d.estado === 'validado' || tamano !== 'mini';
}

/**
 * Presenta el recurso en LSM asociado a un mensaje (RI-01).
 * - validado: reproduce el archivo registrado.
 * - prueba con archivo (video o imagen de una fuente externa, sin validar): lo reproduce con la etiqueta
 *   «Prueba · LSM sin validar». Solo llega aquí en modo desarrollo (en producto queda bloqueado).
 * - prueba sin archivo (marcador): silueta con etiqueta «Prueba · no es LSM». Nunca se presenta como LSM.
 * - bloqueado: informa que falta; no muestra otro recurso en su lugar.
 * Usa solo elementos en línea para poder ir dentro de botones.
 */
export function RecursoLSM({ disponibilidad: d, icono, tamano = 'mediano', etiqueta, enBoton = false, reproducirSolo = false }: Props) {
  const clase = `recurso recurso--${tamano}`;
  // Archivo que no se pudo cargar (falta en public/recursos/ o está dañado, RNF-03).
  const [srcFallido, setSrcFallido] = useState<string>();
  const conArchivo = reproduceArchivo(d, tamano);

  if (conArchivo && d.estado !== 'bloqueado' && d.recurso.src === srcFallido) {
    // Se informa del fallo y no se muestra otro recurso en su lugar (RI-01).
    return (
      <span
        className={`${clase} recurso--faltante`}
        role="img"
        aria-label={`No se pudo cargar el recurso en LSM (falta o está dañado): ${etiqueta}`}
        title={`No se pudo cargar ${d.recurso.src} (${d.recurso.id}). Falta o está dañado; no se muestra otro en su lugar.`}
        data-recurso-fallido={d.recurso.id}
      >
        <span className="recurso__cuerpo" aria-hidden="true">
          <span className="recurso__vacio">
            <IconoEntrada clave={icono} tamano={tamano === 'mini' || tamano === 'mediano' ? 16 : 30} />
            {tamano !== 'mini' && <span>Recurso dañado o faltante</span>}
          </span>
        </span>
      </span>
    );
  }

  if (conArchivo && d.estado !== 'bloqueado') {
    const { recurso } = d;
    const alFallar = () => setSrcFallido(recurso.src);
    const sinValidar = d.estado === 'prueba';
    const nombre = sinValidar ? 'en LSM sin validar' : 'en LSM';
    return (
      <span
        className={`${clase} ${sinValidar ? 'recurso--prueba recurso--sin-validar' : 'recurso--validado'}`}
        data-recurso={recurso.id}
        title={sinValidar ? `${recurso.id}: LSM de una fuente externa, pendiente de validar` : undefined}
      >
        {recurso.tipo === 'video' ? (
          <video
            src={recurso.src}
            controls={!enBoton}
            autoPlay={enBoton || reproducirSolo}
            loop
            muted
            playsInline
            aria-label={`Video ${nombre}: ${etiqueta}`}
            onError={alFallar}
          />
        ) : (
          <img src={recurso.src} alt={`Apoyo visual ${nombre}: ${etiqueta}`} onError={alFallar} />
        )}
        {sinValidar && (
          <span className="recurso__etiqueta" aria-hidden="true">
            {tamano === 'mediano' || enBoton ? 'Sin validar' : 'Prueba · LSM sin validar'}
          </span>
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
