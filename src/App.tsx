import { Inicio } from './modos/Inicio';
import { ModoDemostracion, ModoMedico, ModoPaciente } from './modos/modos';
import { ModoMedicoRed, ModoPacienteRed } from './modos/modosRed';
import type { PoliticaRecursos } from './nucleo/tipos';

/**
 * Lee el modo desde la dirección: ?modo=demo|medico|paciente|medico-red|paciente-red&recursos=desarrollo|producto
 * `medico-red` y `paciente-red` son los de la etapa B (dos laptops); Electron los abre con `--modo`.
 */
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
  if (modo === 'medico-red') return <ModoMedicoRed politica={politica} />;
  if (modo === 'paciente-red') return <ModoPacienteRed />;
  return <Inicio />;
}
