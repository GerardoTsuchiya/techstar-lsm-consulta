import type { ReactNode } from 'react';
import type { Rol } from '../../nucleo/tipos';
import { IconoCheck, IconoCorazon, IconoHojas, IconoPortapapeles, IconoSalir } from './Iconos';

/** Barra superior del prototipo: marca, acciones y «Finalizar consulta». */
export function Cabecera({ acciones, onFinalizar }: { acciones?: ReactNode; onFinalizar?: () => void }) {
  return (
    <header className="cabecera">
      <span className="cabecera__marca">
        <IconoHojas />
        <span className="cabecera__nombre">LSM - Consulta</span>
        <span className="cabecera__lema">Apoyo a la comunicación</span>
      </span>
      <span className="cabecera__acciones">
        {acciones}
        {onFinalizar && (
          <button type="button" className="enlace-finalizar" onClick={onFinalizar}>
            <IconoSalir /> Finalizar consulta
          </button>
        )}
      </span>
    </header>
  );
}

/** Título centrado con el icono del rol a la derecha (portapapeles = paciente, corazón = médico). */
export function TituloPantalla({
  titulo,
  rol,
  izquierda,
  children,
}: {
  titulo: string;
  rol: Rol;
  izquierda?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="titulo-pantalla">
      {izquierda && <span className="titulo-pantalla__izquierda">{izquierda}</span>}
      <h2 className="titulo-pantalla__texto">{titulo}</h2>
      <span className="titulo-pantalla__rol" title={rol === 'paciente' ? 'Pantalla del paciente' : 'Pantalla del médico'}>
        {rol === 'paciente' ? <IconoPortapapeles /> : <IconoCorazon />}
      </span>
      {children}
    </div>
  );
}

const PASOS = ['Captura', 'Revisión', 'Envío'] as const;

/** Indicador de pasos 1 · 2 · 3 del prototipo. */
export function Pasos({ actual }: { actual: 1 | 2 | 3 }) {
  return (
    <ol className="pasos" aria-label="Pasos del mensaje">
      {PASOS.map((nombre, i) => {
        const n = i + 1;
        const estado = n < actual ? 'hecho' : n === actual ? 'actual' : 'pendiente';
        return (
          <li key={nombre} className={`pasos__paso pasos__paso--${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
            <span className="pasos__circulo">{estado === 'hecho' ? <IconoCheck /> : n}</span>
            <span className="pasos__nombre">{nombre}</span>
          </li>
        );
      })}
    </ol>
  );
}
