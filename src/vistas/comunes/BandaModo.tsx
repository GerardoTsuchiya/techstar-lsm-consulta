import type { PoliticaRecursos } from '../../nucleo/tipos';
import { IconoEscudo, IconoMatraz } from './Iconos';

/** Recuerda en todo momento con qué recursos se está trabajando. */
export function BandaModo({ politica, ficticio }: { politica: PoliticaRecursos; ficticio: boolean }) {
  const desarrollo = politica === 'desarrollo';
  return (
    <div className={`banda ${desarrollo ? 'banda--desarrollo' : 'banda--producto'}`} role="note">
      <span className="banda__modo">
        {desarrollo ? <IconoMatraz /> : <IconoEscudo />}
        {desarrollo ? 'Modo desarrollo' : 'Flujo de producto'}
      </span>
      <span className="banda__detalle">
        {desarrollo
          ? 'Recursos de prueba, no validados en LSM'
          : 'Solo se envían entradas con recurso en LSM validado'}
        {ficticio ? ' · Catálogo ficticio' : ''}
      </span>
    </div>
  );
}
