import { Inicio } from './modos/Inicio';
import { ModoDemostracion, ModoMedico, ModoPaciente } from './modos/modos';
import type { PoliticaRecursos } from './nucleo/tipos';

/** Lee el modo desde la dirección: ?modo=demo|medico|paciente&recursos=desarrollo|producto */
export function leerConfiguracion(search: string): { modo: string | null; politica: PoliticaRecursos } {
  const p = new URLSearchParams(search);
  return {
    modo: p.get('modo'),
    // Ante un valor desconocido se elige la opción estricta.
    politica: p.get('recursos') === 'desarrollo' ? 'desarrollo' : 'producto',
  };
}

export function App() {
  const { modo, politica } = leerConfiguracion(window.location.search);
  if (modo === 'demo') return <ModoDemostracion politica={politica} />;
  if (modo === 'medico') return <ModoMedico politica={politica} />;
  if (modo === 'paciente') return <ModoPaciente />;
  return <Inicio />;
}
