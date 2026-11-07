import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  titulo: string;
  children: ReactNode;
  acciones: ReactNode;
  onCerrar?: () => void;
  ancho?: boolean;
}

/** Diálogo modal contenido en su pantalla (no cubre la otra vista en el modo de una pantalla). */
export function Dialogo({ titulo, children, acciones, onCerrar, ancho }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofoco]')?.focus();
  }, []);
  return (
    <div
      className="dialogo__fondo"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && onCerrar) onCerrar();
      }}
    >
      <div className={`dialogo ${ancho ? 'dialogo--ancho' : ''}`} role="dialog" aria-modal="true" aria-label={titulo} ref={ref}>
        <h2 className="dialogo__titulo">{titulo}</h2>
        <div className="dialogo__cuerpo">{children}</div>
        <div className="dialogo__acciones">{acciones}</div>
      </div>
    </div>
  );
}
